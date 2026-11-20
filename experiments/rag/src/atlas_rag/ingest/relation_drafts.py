"""Rascunhos de relação a partir da fila de embeddings, com evidência Firecrawl.

Cada par recebe: afirmações já publicadas dos dois lados, trechos recuperados do
corpus local e uma proposta de família, rótulo e direção feita por Ollama. A
proposta só é aceita se a `source_url` existir entre as fontes recuperadas. A
saída fica em `eval/queues/relacoes-por-embedding-drafts/` com `ok: null`.
"""

from __future__ import annotations

import json
import re
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from atlas_rag.embed.bge_m3 import BgeM3Embedder, unload_ollama_gpu
from atlas_rag.index.vector_store import LocalVectorIndex
from atlas_rag.llm import DEFAULT_DRAFT_MODEL, call_ollama_json
from atlas_rag.ingest.firecrawl_corpus import FIRECRAWL_INDEX_NAME
from atlas_rag.paths import eval_dir, index_dir

ALLOWED_FAMILIES = frozenset(
    {"Influência", "Ruptura", "Atuação", "Criação", "Continuidade", "Filiação", "Lugar"}
)
ALLOWED_CLASSIFICATIONS = frozenset(
    {"documented-fact", "attributed-thesis", "historiographical-interpretation", "contested-claim"}
)


def build_relation_prompt(item: dict[str, Any], passages: Sequence[dict[str, Any]]) -> str:
    evidence_blocks = []
    for idx, passage in enumerate(passages, start=1):
        evidence_blocks.append(
            f"[FONTE {idx}]\n"
            f"Título: {passage.get('title')}\n"
            f"Seção: {passage.get('section')}\n"
            f"URL: {passage.get('url')}\n"
            f"Licença: {passage.get('license')} ({passage.get('usagePolicy')})\n"
            f"Trecho:\n{passage.get('text')}\n"
        )
    from_claims = "\n".join(f"- {c['text']}" for c in item.get("fromClaims", []))
    to_claims = "\n".join(f"- {c['text']}" for c in item.get("toClaims", []))

    return (
        "Você é um editor de história e ciência política. Decida se o trecho sustenta uma RELAÇÃO "
        "DIRETA entre A e B, no sentido de: A influenciou B, B faz parte de A, A fundou B, A rompeu "
        "com B, A ocupou B, A escreveu B ou A ocorreu em B.\n"
        "Mencionar os dois temas no mesmo texto NÃO basta. Se o trecho só compara ou lista os dois "
        "sem afirmar vínculo, responda `has_relation: false`.\n"
        "Use apenas as fontes abaixo. A `source_url` deve ser uma das URLs listadas. Não invente "
        "data, frase ou fonte.\n\n"
        f"ENTIDADE A: {item['fromTitle']} ({item['fromKind']})"
        + (f" — também: {', '.join(item.get('fromAliases', [])[:4])}" if item.get("fromAliases") else "")
        + "\n"
        f"AFIRMAÇÕES PUBLICADAS DE A:\n{from_claims or '(nenhuma)'}\n\n"
        f"ENTIDADE B: {item['toTitle']} ({item['toKind']})"
        + (f" — também: {', '.join(item.get('toAliases', [])[:4])}" if item.get("toAliases") else "")
        + "\n"
        f"AFIRMAÇÕES PUBLICADAS DE B:\n{to_claims or '(nenhuma)'}\n\n"
        f"FONTES RECUPERADAS:\n" + "\n---\n".join(evidence_blocks) + "\n\n"
        "Responda EXCLUSIVAMENTE com JSON, em um destes dois formatos:\n"
        '{"has_relation": false, "reason": "nenhum trecho afirma vínculo direto"}\n'
        "ou\n"
        "{\n"
        '  "has_relation": true,\n'
        '  "family": "Influência|Ruptura|Atuação|Criação|Continuidade|Filiação|Lugar",\n'
        '  "label": "verbo curto em minúsculas",\n'
        '  "direction": "a->b|b->a",\n'
        '  "claim": "uma frase em português que explique o vínculo e possa virar afirmação com fonte",\n'
        '  "quote": "trecho literal copiado de uma das fontes, sem alterar palavras",\n'
        '  "classification": "documented-fact|attributed-thesis|historiographical-interpretation|contested-claim",\n'
        '  "source_url": "URL exata de uma das fontes acima"\n'
        "}"
    )


def _normalize_text(text: str) -> str:
    folded = unicodedata.normalize("NFD", text or "")
    folded = "".join(ch for ch in folded if unicodedata.category(ch) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", " ", folded).strip()


def _family_compatible(from_kind: str, to_kind: str, family: str) -> bool:
    """Rejeita combinações óbvias de família e tipo (ex.: pessoa criou país)."""
    if family == "Lugar":
        return to_kind == "place" and from_kind != "place"
    if family == "Criação":
        return to_kind in {"work", "institution", "party", "ideology", "event"}
    if family == "Atuação":
        return from_kind in {"person", "institution", "party", "event"} and to_kind in {
            "institution",
            "party",
            "event",
            "place",
            "regime",
        }
    if family == "Filiação":
        return to_kind in {"institution", "party", "ideology", "regime", "place"}
    return True


def validate_relation_proposal(
    parsed: dict[str, Any],
    *,
    allowed_urls: set[str],
    unit_by_url: dict[str, dict[str, Any]],
    entity_terms_a: Sequence[str] | None = None,
    entity_terms_b: Sequence[str] | None = None,
    from_kind: str | None = None,
    to_kind: str | None = None,
) -> dict[str, Any] | None:
    if parsed.get("has_relation") is False:
        return None
    relation = parsed.get("relation")
    if not isinstance(relation, dict):
        relation = parsed if parsed.get("has_relation") is True else None
    if not isinstance(relation, dict):
        return None
    url = str(relation.get("source_url") or "").strip()
    claim = str(relation.get("claim") or "").strip()
    quote = str(relation.get("quote") or "").strip()
    label = str(relation.get("label") or "").strip()
    family = str(relation.get("family") or "").strip()
    direction = str(relation.get("direction") or "a->b").strip()
    if not claim or not label or url not in allowed_urls or family not in ALLOWED_FAMILIES:
        return None
    if direction not in {"a->b", "b->a"}:
        direction = "a->b"
    classification = str(relation.get("classification") or "documented-fact").strip()
    source = unit_by_url.get(url, {})
    passage = source.get("text", "")
    normalized_quote = _normalize_text(quote)
    if len(normalized_quote) < 30 or normalized_quote not in _normalize_text(passage):
        return None
    terms_a = [
        normalized
        for term in (entity_terms_a or [])
        if term and len(normalized := _normalize_text(term)) >= 4
    ]
    terms_b = [
        normalized
        for term in (entity_terms_b or [])
        if term and len(normalized := _normalize_text(term)) >= 4
    ]
    if terms_a and not any(term in normalized_quote for term in terms_a):
        return None
    if terms_b and not any(term in normalized_quote for term in terms_b):
        return None
    if from_kind and to_kind and not _family_compatible(from_kind, to_kind, family):
        return None
    return {
        "family": family,
        "label": label,
        "direction": direction,
        "claim": claim,
        "quote": quote,
        "classification": (
            classification if classification in ALLOWED_CLASSIFICATIONS else "documented-fact"
        ),
        "source_url": url,
        "source_title": source.get("title") or relation.get("source_title"),
        "section": source.get("section") or relation.get("section"),
        "license": source.get("license"),
        "usagePolicy": source.get("usagePolicy"),
    }


def draft_relations_with_ollama(
    *,
    max_drafts: int = 8,
    model: str = DEFAULT_DRAFT_MODEL,
    force: bool = False,
    queue_path: Path | None = None,
    drafts_dir: Path | None = None,
    base_index_dir: Path | None = None,
    top_k: int = 4,
) -> dict[str, Any]:
    q_path = queue_path or (eval_dir() / "queues" / "relacoes-por-coocorrencia.json")
    if not q_path.exists():
        raise FileNotFoundError(
            f"Fila não encontrada em {q_path}. Rode `mine-relations --mode coocorrencia` primeiro."
        )
    queue = json.loads(q_path.read_text(encoding="utf-8"))
    items = queue.get("items", [])
    if not items:
        return {"model": model, "generated_now": 0, "skipped_existing": 0, "drafts": []}

    out_dir = drafts_dir or (eval_dir() / "queues" / "relacoes-por-embedding-drafts")
    out_dir.mkdir(parents=True, exist_ok=True)
    fc_index = LocalVectorIndex.load(FIRECRAWL_INDEX_NAME, base_dir=base_index_dir or index_dir())

    unload_ollama_gpu()
    embedder = BgeM3Embedder()
    try:
        query_vectors, telemetry = embedder.encode_texts(
            [item["query"] for item in items], batch_size=16
        )
    finally:
        embedder.unload()

    generated: list[dict[str, Any]] = []
    skipped = 0
    errors: list[dict[str, str]] = []

    for position, item in enumerate(items):
        if len(generated) >= max_drafts:
            break
        dest_file = out_dir / f"{item['id']}.json"
        if dest_file.exists() and not force:
            skipped += 1
            continue

        passages: list[dict[str, Any]] = []
        allowed_urls: set[str] = set()
        unit_by_url: dict[str, dict[str, Any]] = {}
        if item.get("evidence"):
            for evidence in item["evidence"][:top_k]:
                passage = {
                    "score": None,
                    "title": evidence.get("title"),
                    "section": evidence.get("section"),
                    "url": evidence.get("url"),
                    "license": evidence.get("license"),
                    "usagePolicy": evidence.get("usagePolicy", "reference-only"),
                    "text": evidence.get("excerpt", ""),
                }
                if not passage["url"]:
                    continue
                passages.append(passage)
                allowed_urls.add(passage["url"])
                unit_by_url.setdefault(passage["url"], passage)
        else:
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

        started = time.perf_counter()
        try:
            raw = call_ollama_json(build_relation_prompt(item, passages), model=model)
            proposal = validate_relation_proposal(
                raw,
                allowed_urls=allowed_urls,
                unit_by_url=unit_by_url,
                entity_terms_a=[item["fromTitle"], *(item.get("fromAliases") or [])],
                entity_terms_b=[item["toTitle"], *(item.get("toAliases") or [])],
                from_kind=item.get("fromKind"),
                to_kind=item.get("toKind"),
            )
            if proposal is None:
                record = {
                    "schemaVersion": 1,
                    "id": item["id"],
                    "relation": None,
                    "reason": "modelo não encontrou fonte que cite os dois lados",
                    "similarity": item["similarity"],
                    "fromEntityId": item["fromEntityId"],
                    "toEntityId": item["toEntityId"],
                    "fromTitle": item["fromTitle"],
                    "toTitle": item["toTitle"],
                    "sources_used": passages,
                    "ok": None,
                    "review": {
                        "by": "ai",
                        "model": model,
                        "stage": "relation-embedding-proposal",
                        "verdict": "pending-human",
                        "reviewedAt": datetime.now(timezone.utc).isoformat(),
                    },
                    "note": "[conferência de IA] Nenhuma relação proposta; revisar se falta fonte.",
                    "elapsed_seconds": round(time.perf_counter() - started, 2),
                }
            else:
                record = {
                    "schemaVersion": 1,
                    "id": item["id"],
                    "relation": {
                        **proposal,
                        "fromEntityId": item["fromEntityId"],
                        "toEntityId": item["toEntityId"],
                        "fromTitle": item["fromTitle"],
                        "toTitle": item["toTitle"],
                    },
                    "similarity": item["similarity"],
                    "fromEntityId": item["fromEntityId"],
                    "toEntityId": item["toEntityId"],
                    "fromTitle": item["fromTitle"],
                    "toTitle": item["toTitle"],
                    "sources_used": passages,
                    "ok": None,
                    "review": {
                        "by": "ai",
                        "model": model,
                        "stage": "relation-embedding-proposal",
                        "verdict": "pending-human",
                        "reviewedAt": datetime.now(timezone.utc).isoformat(),
                    },
                    "note": (
                        "[conferência de IA] Proposta de relação gerada localmente a partir de "
                        "embeddings e do corpus Firecrawl Local. Validar direção, família e fonte "
                        "antes de criar a aresta."
                    ),
                    "elapsed_seconds": round(time.perf_counter() - started, 2),
                }
            dest_file.write_text(
                json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
            )
            generated.append(
                {
                    "id": item["id"],
                    "relation": record["relation"],
                    "file": str(dest_file),
                }
            )
        except Exception as exc:  # noqa: BLE001
            errors.append({"id": item["id"], "error": str(exc)})

    all_files = sorted(out_dir.glob("rel-*.json"))
    (out_dir / "index.json").write_text(
        json.dumps(
            {
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "human_reviewed": False,
                "total_drafts": len(all_files),
                "with_relation": len(
                    [p for p in all_files if '"relation": {' in p.read_text(encoding="utf-8")]
                ),
                "files": [p.name for p in all_files],
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
        "total_drafts_on_disk": len(all_files),
        "errors": errors,
        "embedding_telemetry": {
            "elapsed_seconds": telemetry.elapsed_seconds,
            "device": telemetry.device,
        },
        "drafts": generated,
    }
