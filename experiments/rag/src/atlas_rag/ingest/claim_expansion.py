"""Expansão de afirmações de entidades já publicadas.

Lê a fila de lacunas do grafo (`queueMode = "conteudo"`), recupera trechos do
corpus Firecrawl Local, pede ao Ollama afirmações novas e só grava as que
citam uma URL presente nas fontes recuperadas e não repetem o que já existe.
O rascunho não altera `content/graph/` nem o release.
"""

from __future__ import annotations

import json
import re
import time
import unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from atlas_rag.embed.bge_m3 import BgeM3Embedder, unload_ollama_gpu
from atlas_rag.index.vector_store import LocalVectorIndex
from atlas_rag.llm import DEFAULT_DRAFT_MODEL, call_ollama_json
from atlas_rag.ingest.firecrawl_corpus import FIRECRAWL_INDEX_NAME
from atlas_rag.paths import eval_dir, index_dir

ALLOWED_CLASSIFICATIONS = frozenset(
    {"documented-fact", "attributed-thesis", "historiographical-interpretation", "contested-claim"}
)


def _tokens(text: str) -> set[str]:
    folded = unicodedata.normalize("NFD", text or "")
    folded = "".join(ch for ch in folded if unicodedata.category(ch) != "Mn").lower()
    return {token for token in re.findall(r"[a-z0-9]{4,}", folded)}


def _normalize_for_match(text: str) -> str:
    folded = unicodedata.normalize("NFD", text or "")
    folded = "".join(ch for ch in folded if unicodedata.category(ch) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", " ", folded).strip()


def is_duplicate_claim(text: str, existing: Sequence[str], threshold: float = 0.72) -> bool:
    candidate = _tokens(text)
    if not candidate:
        return True
    for previous in existing:
        other = _tokens(previous)
        if not other:
            continue
        overlap = len(candidate & other) / max(1, len(candidate | other))
        if overlap >= threshold:
            return True
    return False


def build_expansion_prompt(
    item: dict[str, Any],
    existing_claims: Sequence[str],
    passages: Sequence[dict[str, Any]],
) -> str:
    evidence = []
    for idx, passage in enumerate(passages, start=1):
        evidence.append(
            f"[FONTE {idx}]\n"
            f"Título: {passage.get('title')}\n"
            f"Seção: {passage.get('section')}\n"
            f"URL: {passage.get('url')}\n"
            f"Licença: {passage.get('license')} ({passage.get('usagePolicy')})\n"
            f"Trecho:\n{passage.get('text')}\n"
        )
    existing = "\n".join(f"- {claim}" for claim in existing_claims) or "(nenhuma)"

    return (
        "Você é um editor enciclopédico de história, política e ciências sociais. "
        "A entidade abaixo já existe no acervo e tem poucas afirmações. Proponha NOVAS afirmações "
        "verificáveis, sem repetir as existentes e sem opinião.\n"
        "Regra dura: cada afirmação precisa ser sustentada por uma das fontes recuperadas. "
        "A `source_url` deve ser exatamente uma das URLs listadas. Se as fontes não sustentarem "
        "nada novo, devolva `claims` vazio. Não invente data, número ou citação.\n\n"
        f"ENTIDADE: {item['topic']} ({item.get('kind')})\n"
        f"RESUMO ATUAL: {item.get('query', '')[:500]}\n\n"
        f"AFIRMAÇÕES JÁ PUBLICADAS:\n{existing}\n\n"
        f"FONTES RECUPERADAS:\n" + "\n---\n".join(evidence) + "\n\n"
        "Responda EXCLUSIVAMENTE com JSON válido:\n"
        "{\n"
        '  "claims": [\n'
        "    {\n"
        '      "text": "afirmação nova em português, 1 a 2 frases",\n'
        '      "quote": "trecho literal copiado da fonte, sem alterar palavras",\n'
        '      "classification": "documented-fact|attributed-thesis|historiographical-interpretation|contested-claim",\n'
        '      "source_url": "URL exata de uma das fontes acima",\n'
        '      "source_title": "Título da fonte",\n'
        '      "section": "Seção da fonte"\n'
        "    }\n"
        "  ]\n"
        "}\n"
        "Produza entre 2 e 4 claims novas."
    )


def validate_claims(
    parsed: dict[str, Any],
    *,
    allowed_urls: set[str],
    unit_by_url: dict[str, dict[str, Any]],
    existing_claims: Sequence[str],
    entity_terms: Sequence[str] | None = None,
) -> tuple[list[dict[str, Any]], int]:
    accepted: list[dict[str, Any]] = []
    dropped = 0
    normalized_terms = [_normalize_for_match(term) for term in (entity_terms or []) if term]
    normalized_terms = [term for term in normalized_terms if len(term) >= 4]
    for claim in parsed.get("claims") or []:
        text = str(claim.get("text") or "").strip()
        quote = str(claim.get("quote") or "").strip()
        url = str(claim.get("source_url") or "").strip()
        if len(text) < 40 or len(text) > 480 or url not in allowed_urls:
            dropped += 1
            continue
        passage = unit_by_url.get(url, {}).get("text", "") or ""
        normalized_quote = _normalize_for_match(quote)
        if len(normalized_quote) < 25 or normalized_quote not in _normalize_for_match(passage):
            dropped += 1
            continue
        if normalized_terms:
            if not any(term in normalized_quote for term in normalized_terms):
                dropped += 1
                continue
        if is_duplicate_claim(text, existing_claims) or is_duplicate_claim(
            text, [entry["text"] for entry in accepted]
        ):
            dropped += 1
            continue
        classification = str(claim.get("classification") or "documented-fact").strip()
        source = unit_by_url.get(url, {})
        accepted.append(
            {
                "text": text,
                "quote": quote,
                "classification": (
                    classification
                    if classification in ALLOWED_CLASSIFICATIONS
                    else "documented-fact"
                ),
                "source_url": url,
                "source_title": source.get("title") or claim.get("source_title"),
                "section": source.get("section") or claim.get("section"),
                "license": source.get("license"),
                "usagePolicy": source.get("usagePolicy"),
            }
        )
    return accepted, dropped


def expand_claims_with_ollama(
    *,
    max_entities: int = 5,
    model: str = DEFAULT_DRAFT_MODEL,
    force: bool = False,
    queue_path: Path | None = None,
    drafts_dir: Path | None = None,
    base_index_dir: Path | None = None,
    top_k: int = 4,
    max_existing: int = 8,
) -> dict[str, Any]:
    q_path = queue_path or (eval_dir() / "queues" / "lacunas-do-grafo.json")
    if not q_path.exists():
        raise FileNotFoundError(
            f"Fila não encontrada em {q_path}. Rode `graph-gaps` primeiro."
        )
    queue = json.loads(q_path.read_text(encoding="utf-8"))
    targets = [
        item
        for item in queue.get("items", [])
        if item.get("queueMode") == "conteudo"
        or (0 < int(item.get("claims") or 0) <= 2)
    ]
    # Ordena por score e percorre uma janela maior: entidades sem passagem
    # relevante no corpus são puladas sem gastar chamada de LLM.
    targets.sort(key=lambda item: -int(item.get("score") or 0))
    targets = targets[: max(max_entities * 20, 60)]
    if not targets:
        return {"model": model, "generated_now": 0, "skipped_existing": 0, "drafts": []}

    out_dir = drafts_dir or (eval_dir() / "queues" / "enrichment-claims")
    out_dir.mkdir(parents=True, exist_ok=True)
    claim_index = LocalVectorIndex.load("claim_raw", base_dir=base_index_dir or index_dir())
    fc_index = LocalVectorIndex.load(FIRECRAWL_INDEX_NAME, base_dir=base_index_dir or index_dir())

    claims_by_entity: dict[str, list[str]] = defaultdict(list)
    for unit in claim_index.units:
        claims_by_entity[unit.entity_id].append(unit.text_raw)

    unload_ollama_gpu()
    embedder = BgeM3Embedder()
    try:
        query_vectors, telemetry = embedder.encode_texts(
            [item.get("query") or item["topic"] for item in targets], batch_size=16
        )
    finally:
        embedder.unload()

    generated: list[dict[str, Any]] = []
    skipped = 0
    errors: list[dict[str, str]] = []

    for position, item in enumerate(targets):
        if len(generated) >= max_entities:
            break
        slug = item.get("entitySlug") or item["entityId"]
        dest_file = out_dir / f"{slug}.json"
        if dest_file.exists() and not force:
            skipped += 1
            continue

        existing_claims = claims_by_entity.get(item["entityId"], [])[:max_existing]
        passages: list[dict[str, Any]] = []
        allowed_urls: set[str] = set()
        unit_by_url: dict[str, dict[str, Any]] = {}
        for unit, score in fc_index.search_vector(query_vectors[position], top_k=top_k):
            url = unit.source_urls[0] if unit.source_urls else None
            if not url:
                continue
            passage = {
                "score": round(score, 4),
                "title": unit.entity_title,
                "section": unit.locators[0] if unit.locators else None,
                "url": url,
                "license": unit.metadata.get("license"),
                "usagePolicy": unit.metadata.get("usagePolicy", "reference-only"),
                "text": unit.text_raw[:1100],
            }
            passages.append(passage)
            allowed_urls.add(url)
            unit_by_url.setdefault(url, passage)
        if not passages:
            continue
        terms = [item["topic"], *(item.get("aliases") or [])]
        normalized_terms = [_normalize_for_match(term) for term in terms if term]
        if not any(
            term in _normalize_for_match(passage.get("text", ""))
            for passage in passages
            for term in normalized_terms
            if len(term) >= 4
        ):
            continue

        started = time.perf_counter()
        try:
            raw = call_ollama_json(
                build_expansion_prompt(item, existing_claims, passages), model=model
            )
            accepted, dropped = validate_claims(
                raw,
                allowed_urls=allowed_urls,
                unit_by_url=unit_by_url,
                existing_claims=existing_claims,
                entity_terms=[item["topic"], *(item.get("aliases") or [])],
            )
            record = {
                "schemaVersion": 1,
                "entityId": item["entityId"],
                "entitySlug": slug,
                "topic": item["topic"],
                "kind": item.get("kind"),
                "queue_reasons": item.get("reasons", []),
                "existingClaims": existing_claims,
                "claims": accepted,
                "grounding": {
                    "dropped_ungrounded_or_duplicate": dropped,
                    "allowed_urls": sorted(allowed_urls),
                },
                "sources_used": passages,
                "ok": None,
                "review": {
                    "by": "ai",
                    "model": model,
                    "stage": "claim-expansion",
                    "verdict": "pending-human",
                    "reviewedAt": datetime.now(timezone.utc).isoformat(),
                },
                "note": (
                    "[conferência de IA] Afirmações novas propostas localmente sobre o corpus "
                    "Firecrawl Local. Revisar fonte, classificação e duplicidade antes de publicar."
                ),
                "elapsed_seconds": round(time.perf_counter() - started, 2),
            }
            dest_file.write_text(
                json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
            )
            generated.append(
                {
                    "entityId": item["entityId"],
                    "topic": item["topic"],
                    "claims": len(accepted),
                    "file": str(dest_file),
                }
            )
        except Exception as exc:  # noqa: BLE001
            errors.append({"entityId": item["entityId"], "error": str(exc)})

    all_files = sorted(out_dir.glob("*.json"))
    (out_dir / "index.json").write_text(
        json.dumps(
            {
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "human_reviewed": False,
                "total_files": len(all_files),
                "files": [p.name for p in all_files if p.name != "index.json"],
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )

    return {
        "model": model,
        "generated_now": len(generated),
        "skipped_existing": skipped,
        "total_files_on_disk": len(all_files),
        "errors": errors,
        "embedding_telemetry": {
            "elapsed_seconds": telemetry.elapsed_seconds,
            "device": telemetry.device,
        },
        "drafts": generated,
    }
