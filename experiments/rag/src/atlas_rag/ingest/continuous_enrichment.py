"""Orquestrador contínuo local: Firecrawl Local -> BAAI/bge-m3 GPU -> RAG -> Rascunhos Ollama.

Nunca publica no R2 nem altera arquivos publicados em `content/graph/` ou `published-ideologies.ts`.
Todo rascunho gerado vai para `experiments/rag/eval/queues/enrichment-drafts/` com `ok: null`,
`review.by = "ai"` e marcador `[conferência de IA]`, pronto para revisão humana.
"""

from __future__ import annotations

import json
import re
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

from atlas_rag.embed.bge_m3 import unload_ollama_gpu
from atlas_rag.ingest.firecrawl_corpus import (
    FIRECRAWL_INDEX_NAME,
    build_gap_evidence_queue,
    index_firecrawl_corpus,
)
from atlas_rag.paths import eval_dir, index_dir, repo_root
from atlas_rag.index.vector_store import LocalVectorIndex

DEFAULT_OLLAMA_URL = "http://localhost:11434"
DEFAULT_DRAFT_MODEL = "qwen3:8b-q4_K_M"
ALLOWED_KINDS = frozenset(
    {"person", "concept", "event", "work", "ideology", "institution", "party", "place", "regime"}
)
ALLOWED_FAMILIES = frozenset(
    {"Influência", "Ruptura", "Atuação", "Criação", "Continuidade", "Filiação", "Lugar"}
)
ALLOWED_CLASSIFICATIONS = frozenset(
    {"documented-fact", "attributed-thesis", "historiographical-interpretation", "contested-claim"}
)


def _strip_think_and_fences(raw: str) -> str:
    text = re.sub(r"<think>[\s\S]*?</think>", "", raw or "", flags=re.IGNORECASE).strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, flags=re.IGNORECASE)
    if fence:
        text = fence.group(1).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        return text[start : end + 1]
    return text


def build_draft_prompt(gap_item: dict[str, Any], passages: list[dict[str, Any]]) -> str:
    """Monta prompt rigoroso (seguindo GUIA-DE-VOZ.md) para extração JSON grounded em fontes."""
    evidence_blocks: list[str] = []
    for idx, p in enumerate(passages, start=1):
        evidence_blocks.append(
            f"[FONTE {idx}]\n"
            f"Título: {p['source_title']}\n"
            f"Seção: {p['section']}\n"
            f"URL: {p['url']}\n"
            f"Licença: {p['license']} ({p['usagePolicy']})\n"
            f"Trecho:\n{p['text']}\n"
        )
    joined_evidence = "\n---\n".join(evidence_blocks)

    return (
        "Você é um editor enciclopédico de história, política, sociologia e filosofia para o ATLAS.\n"
        "Escreva em português do Brasil claro, preciso e imparcial. NÃO mencione o projeto ATLAS, "
        "não fale sobre como o texto foi produzido e NÃO apresente opinião como fato.\n"
        "Use APENAS fatos sustentados pelas fontes abaixo. Toda `source_url` deve ser exatamente uma "
        "das URLs fornecidas nas fontes. Se uma fonte tiver licença `reference-only`, sintetize com suas "
        "próprias palavras sem copiar parágrafos inteiros.\n\n"
        f"TEMA-ALVO: {gap_item['topic']}\n"
        f"DOMÍNIO: {gap_item['domain']}\n\n"
        f"FONTES RECUPERADAS:\n{joined_evidence}\n\n"
        "Responda EXCLUSIVAMENTE com um objeto JSON válido neste formato exato:\n"
        "{\n"
        '  "entity": {\n'
        '    "slug": "slug-em-minusculas-com-hifen",\n'
        '    "title": "Título canônico em português",\n'
        '    "kind": "person|concept|event|work|ideology|institution|party|place|regime",\n'
        '    "period": "ex.: 1968 ou século XVIII",\n'
        '    "summary": "Síntese enciclopédica objetiva em 2 a 3 frases em português."\n'
        "  },\n"
        '  "claims": [\n'
        "    {\n"
        '      "text": "Afirmação histórica ou conceitual verificável em português.",\n'
        '      "classification": "documented-fact|attributed-thesis|historiographical-interpretation|contested-claim",\n'
        '      "source_url": "URL exata de uma das fontes acima",\n'
        '      "source_title": "Título da fonte",\n'
        '      "section": "Seção da fonte"\n'
        "    }\n"
        "  ],\n"
        '  "relations": [\n'
        "    {\n"
        '      "target_title": "Nome de pessoa, obra, conceito, regime ou evento relacionado",\n'
        '      "family": "Influência|Ruptura|Atuação|Criação|Continuidade|Filiação|Lugar",\n'
        '      "label": "verbo curto em minúsculas (ex.: influenciou, instituiu, escreveu, reagiu contra)",\n'
        '      "source_url": "URL exata de uma das fontes acima"\n'
        "    }\n"
        "  ]\n"
        "}\n"
        "Produza entre 3 e 5 claims e entre 2 e 4 relations."
    )


def validate_and_ground_draft(
    parsed: dict[str, Any],
    allowed_urls: set[str],
) -> dict[str, Any]:
    """Remove qualquer afirmação ou relação cuja URL não esteja nas fontes recuperadas."""
    entity = parsed.get("entity") or {}
    raw_kind = str(entity.get("kind") or "concept").strip().lower()
    clean_entity = {
        "slug": re.sub(r"[^a-z0-9-]+", "-", str(entity.get("slug") or "").lower()).strip("-"),
        "title": str(entity.get("title") or "").strip(),
        "kind": raw_kind if raw_kind in ALLOWED_KINDS else "concept",
        "period": str(entity.get("period") or "").strip() or None,
        "summary": str(entity.get("summary") or "").strip(),
    }

    clean_claims: list[dict[str, Any]] = []
    dropped_claims = 0
    for c in parsed.get("claims") or []:
        url = str(c.get("source_url") or "").strip()
        text = str(c.get("text") or "").strip()
        if not text or url not in allowed_urls:
            dropped_claims += 1
            continue
        cls = str(c.get("classification") or "documented-fact").strip()
        clean_claims.append(
            {
                "text": text,
                "classification": cls if cls in ALLOWED_CLASSIFICATIONS else "documented-fact",
                "source_url": url,
                "source_title": str(c.get("source_title") or "").strip(),
                "section": str(c.get("section") or "").strip() or None,
            }
        )

    clean_relations: list[dict[str, Any]] = []
    dropped_relations = 0
    for r in parsed.get("relations") or []:
        url = str(r.get("source_url") or "").strip()
        target = str(r.get("target_title") or "").strip()
        label = str(r.get("label") or "").strip()
        family = str(r.get("family") or "Influência").strip()
        if not target or not label or url not in allowed_urls:
            dropped_relations += 1
            continue
        clean_relations.append(
            {
                "target_title": target,
                "family": family if family in ALLOWED_FAMILIES else "Influência",
                "label": label,
                "source_url": url,
            }
        )

    return {
        "entity": clean_entity,
        "claims": clean_claims,
        "relations": clean_relations,
        "grounding": {
            "dropped_ungrounded_claims": dropped_claims,
            "dropped_ungrounded_relations": dropped_relations,
        },
    }


def _call_ollama_json(
    prompt: str,
    *,
    model: str = DEFAULT_DRAFT_MODEL,
    base_url: str = DEFAULT_OLLAMA_URL,
    timeout: float = 180.0,
) -> dict[str, Any]:
    with httpx.Client(timeout=timeout) as client:
        resp = client.post(
            f"{base_url}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {"temperature": 0.2, "num_ctx": 8192},
            },
        )
        resp.raise_for_status()
        raw = resp.json().get("response", "")
    cleaned = _strip_think_and_fences(raw)
    return json.loads(cleaned)


def draft_gaps_with_ollama(
    *,
    max_drafts: int = 3,
    model: str = DEFAULT_DRAFT_MODEL,
    force: bool = False,
    queue_path: Path | None = None,
    drafts_dir: Path | None = None,
    base_index_dir: Path | None = None,
) -> dict[str, Any]:
    """Gera rascunhos estruturados (entidade + afirmações + relações) via Ollama local sobre o RAG."""
    q_path = queue_path or (eval_dir() / "queues" / "firecrawl-lacunas-evidencias.json")
    if not q_path.exists():
        raise FileNotFoundError(
            f"Fila de lacunas não encontrada em {q_path}. Rode `mine-firecrawl-gaps` primeiro."
        )

    queue_data = json.loads(q_path.read_text(encoding="utf-8"))
    out_dir = drafts_dir or (eval_dir() / "queues" / "enrichment-drafts")
    out_dir.mkdir(parents=True, exist_ok=True)

    fc_index = LocalVectorIndex.load(FIRECRAWL_INDEX_NAME, base_dir=base_index_dir or index_dir())

    generated: list[dict[str, Any]] = []
    skipped = 0
    errors: list[dict[str, str]] = []

    for item in queue_data.get("items", []):
        if len(generated) >= max_drafts:
            break
        gap_id = item["id"]
        dest_file = out_dir / f"{gap_id}.json"
        if dest_file.exists() and not force:
            skipped += 1
            continue

        passages: list[dict[str, Any]] = []
        allowed_urls: set[str] = set()
        for ev in item.get("firecrawl_evidences", [])[:4]:
            unit = fc_index.unit_by_id.get(ev["unit_id"])
            if unit is None:
                continue
            url = unit.source_urls[0] if unit.source_urls else ev.get("url")
            if not url:
                continue
            allowed_urls.add(url)
            passages.append(
                {
                    "unit_id": unit.unit_id,
                    "source_title": ev.get("source_title") or unit.entity_title,
                    "section": ev.get("section") or (unit.locators[0] if unit.locators else "Geral"),
                    "url": url,
                    "license": ev.get("license") or unit.metadata.get("license"),
                    "usagePolicy": ev.get("usagePolicy") or unit.metadata.get("usagePolicy"),
                    "text": unit.text_raw[:1200],
                }
            )

        if not passages:
            continue

        prompt = build_draft_prompt(item, passages)
        started = time.perf_counter()
        try:
            raw_parsed = _call_ollama_json(prompt, model=model)
            grounded = validate_and_ground_draft(raw_parsed, allowed_urls)
            now_iso = datetime.now(timezone.utc).isoformat()
            draft_doc = {
                "schemaVersion": 1,
                "gap_id": gap_id,
                "topic": item["topic"],
                "domain": item["domain"],
                "human_reviewed": False,
                "ok": None,
                "entity": grounded["entity"],
                "claims": grounded["claims"],
                "relations": grounded["relations"],
                "grounding": grounded["grounding"],
                "sources_used": [
                    {
                        "unit_id": p["unit_id"],
                        "title": p["source_title"],
                        "section": p["section"],
                        "url": p["url"],
                        "license": p["license"],
                        "usagePolicy": p["usagePolicy"],
                    }
                    for p in passages
                ],
                "review": {
                    "by": "ai",
                    "model": model,
                    "stage": "ollama-enrichment-draft",
                    "verdict": "pending-human",
                    "reviewedAt": now_iso,
                },
                "note": (
                    f"[conferência de IA] Rascunho gerado localmente por {model} sobre evidências "
                    "recuperadas do corpus Firecrawl Local (BAAI/bge-m3). Aguarda revisão humana antes "
                    "de entrar em content/graph/."
                ),
                "elapsed_seconds": round(time.perf_counter() - started, 2),
            }
            dest_file.write_text(
                json.dumps(draft_doc, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            generated.append(
                {
                    "gap_id": gap_id,
                    "title": draft_doc["entity"]["title"],
                    "kind": draft_doc["entity"]["kind"],
                    "claims": len(draft_doc["claims"]),
                    "relations": len(draft_doc["relations"]),
                    "elapsed_seconds": draft_doc["elapsed_seconds"],
                    "file": str(dest_file),
                }
            )
        except Exception as exc:  # noqa: BLE001
            errors.append({"gap_id": gap_id, "error": str(exc)})

    # Atualiza índice consolidado de rascunhos
    all_draft_files = sorted(p for p in out_dir.glob("gap-*.json"))
    index_payload = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "human_reviewed": False,
        "total_drafts": len(all_draft_files),
        "files": [p.name for p in all_draft_files],
    }
    (out_dir / "index.json").write_text(
        json.dumps(index_payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    return {
        "model": model,
        "generated_now": len(generated),
        "skipped_existing": skipped,
        "total_drafts_on_disk": len(all_draft_files),
        "errors": errors,
        "drafts": generated,
    }


def _loop_dir() -> Path:
    return repo_root() / "generated" / "firecrawl-loop"


def _write_cycle_state(report: dict[str, Any], cycle: int | None = None) -> None:
    """Registra o ciclo em disco para auditoria de um processo contínuo local."""
    target = _loop_dir()
    target.mkdir(parents=True, exist_ok=True)
    state = {"cycle": cycle, **report}
    (target / "state.json").write_text(
        json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    with (target / "history.jsonl").open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(state, ensure_ascii=False) + "\n")


def run_enrichment_cycle(
    *,
    max_drafts: int = 3,
    model: str = DEFAULT_DRAFT_MODEL,
    skip_scrape: bool = False,
    skip_embed: bool = False,
    concurrency: int = 4,
    discover: bool = True,
    max_new_seeds: int = 12,
    min_score: int = 70,
    incremental_embed: bool = True,
) -> dict[str, Any]:
    """Executa 1 ciclo: descoberta -> Firecrawl Local -> bge-m3 GPU -> lacunas -> rascunhos Ollama."""
    root = repo_root()
    report: dict[str, Any] = {
        "started_at": datetime.now(timezone.utc).isoformat(),
        "steps": {},
    }

    if discover:
        proc = subprocess.run(
            [
                "node",
                "scripts/ingestion/firecrawl/discover.mjs",
                "--apply",
                "--apply-limit",
                str(max_new_seeds),
                "--min-score",
                str(min_score),
            ],
            cwd=root,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
        tail = [line for line in proc.stdout.splitlines() if line.strip()][-3:]
        report["steps"]["discovery"] = {
            "ok": proc.returncode == 0,
            "max_new_seeds": max_new_seeds,
            "min_score": min_score,
            "tail": tail,
            "error": proc.stderr.strip()[-500:] if proc.returncode != 0 else None,
        }

    if not skip_scrape:
        proc = subprocess.run(
            ["node", "scripts/ingestion/firecrawl/extract.mjs", "--concurrency", str(concurrency)],
            cwd=root,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"firecrawl:extract falhou (code={proc.returncode}): {proc.stderr}")
        summary_line = [
            ln for ln in proc.stdout.splitlines() if ln.strip().startswith("Resumo do lote:")
        ]
        report["steps"]["firecrawl_extract"] = {
            "ok": True,
            "summary": summary_line[-1] if summary_line else "ok",
        }

    if not skip_embed:
        # Libera Ollama da GPU antes de subir BAAI/bge-m3 FP16
        unload_ollama_gpu()
        embed_res = index_firecrawl_corpus(incremental=incremental_embed)
        report["steps"]["bge_m3_embed"] = {
            "documents_indexed": embed_res["stats"]["documents_indexed"],
            "chunks_built": embed_res["stats"]["chunks_built"],
            "vectors_reused": embed_res["stats"].get("vectors_reused", 0),
            "vectors_embedded": embed_res["stats"].get(
                "vectors_embedded", embed_res["stats"]["chunks_built"]
            ),
            "incremental": incremental_embed,
            "elapsed_seconds": embed_res["telemetry"]["elapsed_seconds"],
        }

    gap_res = build_gap_evidence_queue()
    report["steps"]["gap_mining"] = gap_res

    if max_drafts > 0:
        draft_res = draft_gaps_with_ollama(max_drafts=max_drafts, model=model)
        report["steps"]["ollama_drafts"] = draft_res

    report["finished_at"] = datetime.now(timezone.utc).isoformat()
    return report


def run_enrichment_loop(
    *,
    interval_minutes: int = 60,
    max_drafts: int = 3,
    model: str = DEFAULT_DRAFT_MODEL,
    max_cycles: int | None = None,
    discover: bool = True,
    max_new_seeds: int = 12,
    min_score: int = 70,
    incremental_embed: bool = True,
) -> list[dict[str, Any]]:
    """Roda ciclos contínuos de enriquecimento local com pausa controlada entre rodadas."""
    history: list[dict[str, Any]] = []
    cycle = 0
    try:
        while max_cycles is None or cycle < max_cycles:
            cycle += 1
            res = run_enrichment_cycle(
                max_drafts=max_drafts,
                model=model,
                discover=discover,
                max_new_seeds=max_new_seeds,
                min_score=min_score,
                incremental_embed=incremental_embed,
            )
            history.append(res)
            _write_cycle_state(res, cycle=cycle)
            print(json.dumps({"cycle": cycle, **res}, indent=2, ensure_ascii=False), flush=True)
            if max_cycles is not None and cycle >= max_cycles:
                break
            time.sleep(max(interval_minutes, 1) * 60)
    except KeyboardInterrupt:
        print("\n[enrich] Interrompido pelo usuario; estado do ultimo ciclo preservado.", flush=True)
        _write_cycle_state({"status": "interrupted", "cycles": cycle}, cycle=cycle)
    return history
