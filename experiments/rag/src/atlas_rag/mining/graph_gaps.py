"""Mineração de lacunas diretamente no grafo publicado.

Substitui a lista fixa de temas por um retrato do release: entidades sem
relação editorial, com uma única relação, sem afirmação ou com uma afirmação.
A fila resultante (`eval/queues/lacunas-do-grafo.json`) alimenta a descoberta
de fontes e a geração de rascunhos; nada é publicado automaticamente.
"""

from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from atlas_rag.ingest.bundle import load_pinned_bundle
from atlas_rag.paths import eval_dir

RARE_KINDS = frozenset({"work", "event", "institution", "party", "regime"})
BRAZIL_HINTS = ("brasil", "brazil", "vargas", "constituinte", "1964", "ditadura")
TRADITION_HINTS = (
    "marxismo",
    "socialismo",
    "liberalismo",
    "anarquismo",
    "social-democracia",
    "fascismo",
    "nazismo",
    "stalinismo",
    "comunismo",
    "capitalismo",
    "republicanismo",
    "conservadorismo",
)


def _maps(atlas: dict[str, Any]) -> tuple[dict, dict, dict]:
    citations = {c["id"]: c for c in atlas.get("citations", []) if c.get("id")}
    evidences = {e["id"]: e for e in atlas.get("evidences", []) if e.get("id")}
    sources = {s["id"]: s for s in atlas.get("sources", []) if s.get("id")}
    return citations, evidences, sources


def _claim_sources(
    claim: dict[str, Any], citations: dict, evidences: dict, sources: dict
) -> set[str]:
    found: set[str] = set()
    for citation_id in claim.get("citationIds", []) or []:
        citation = citations.get(citation_id)
        if not citation:
            continue
        for evidence_id in citation.get("evidenceIds") or [citation.get("evidenceId")]:
            evidence = evidences.get(evidence_id) if evidence_id else None
            if not evidence:
                continue
            source = sources.get(evidence.get("sourceId"))
            if source:
                found.add(source.get("url") or source.get("id"))
    return found


def collect_graph_state(data: dict[str, Any]) -> dict[str, Any]:
    """Agrega entidades, grau editorial, afirmações e fontes de todas as coleções."""
    atlases = (data.get("graph") or {}).get("atlases") or []
    entities: dict[str, dict[str, Any]] = {}
    relation_pairs: set[tuple[str, str]] = set()
    degree: Counter[str] = Counter()
    claim_count: Counter[str] = Counter()
    sources_by_entity: dict[str, set[str]] = {}

    for atlas in atlases:
        atlas_slug = atlas.get("slug") or atlas.get("id") or "atlas"
        citations, evidences, sources = _maps(atlas)

        for entity in atlas.get("entities", []) or []:
            entity_id = entity.get("id")
            if not entity_id:
                continue
            current = entities.get(entity_id)
            if current is None:
                current = {
                    "id": entity_id,
                    "slug": entity.get("slug"),
                    "title": entity.get("title") or entity_id,
                    "summary": entity.get("summary") or entity.get("context") or "",
                    "kind": entity.get("kind") or "concept",
                    "aliases": list(entity.get("aliases") or []),
                    "atlasSlugs": set(),
                }
                entities[entity_id] = current
            current["atlasSlugs"].add(atlas_slug)

        for relation in atlas.get("relations", []) or []:
            from_id = relation.get("fromEntityId")
            to_id = relation.get("toEntityId")
            if not from_id or not to_id or from_id == to_id:
                continue
            degree[from_id] += 1
            degree[to_id] += 1
            relation_pairs.add(tuple(sorted((from_id, to_id))))

        for claim in atlas.get("claims", []) or []:
            entity_id = claim.get("entityId")
            if not entity_id:
                continue
            claim_count[entity_id] += 1
            sources_by_entity.setdefault(entity_id, set()).update(
                _claim_sources(claim, citations, evidences, sources)
            )

    for entity_id, entity in entities.items():
        entity["degree"] = degree.get(entity_id, 0)
        entity["claims"] = claim_count.get(entity_id, 0)
        entity["sources"] = len(sources_by_entity.get(entity_id, set()))
        entity["atlasSlugs"] = sorted(entity["atlasSlugs"])

    return {
        "entities": entities,
        "relationPairs": relation_pairs,
        "atlases": len(atlases),
    }


def gap_reasons(entity: dict[str, Any]) -> list[str]:
    reasons: list[str] = []
    if entity["degree"] == 0:
        reasons.append("sem_relacao")
    elif entity["degree"] == 1:
        reasons.append("uma_relacao")
    if entity["claims"] == 0:
        reasons.append("sem_afirmacao")
    elif entity["claims"] == 1:
        reasons.append("uma_afirmacao")
    if entity["sources"] == 0:
        reasons.append("sem_fonte")
    elif entity["sources"] == 1:
        reasons.append("uma_fonte")
    if 0 < entity["claims"] <= 2:
        reasons.append("conteudo_fino")
    if entity["kind"] in RARE_KINDS and entity["degree"] <= 1:
        reasons.append("tipo_subrepresentado")
    return reasons


def infer_domain(entity: dict[str, Any]) -> str:
    atlases = " ".join(entity.get("atlasSlugs") or []).lower()
    text = f"{entity['title']} {entity.get('summary', '')}".lower()
    if any(hint in atlases for hint in ("brasil", "constituinte", "vargas", "trabalhismo")):
        return "historia-brasil"
    if any(hint in atlases for hint in TRADITION_HINTS):
        return "filosofia-politica"
    if any(hint in text for hint in BRAZIL_HINTS):
        return "historia-brasil"
    if any(hint in text for hint in TRADITION_HINTS):
        return "filosofia-politica"
    if entity["kind"] == "ideology":
        return "filosofia-politica"
    if entity["kind"] in ("person", "institution", "party", "place"):
        return "sociologia"
    if entity["kind"] == "work":
        return "documento-primario"
    return "historia-mundial"


def gap_score(entity: dict[str, Any], reasons: Iterable[str]) -> int:
    reasons = set(reasons)
    score = 0
    if "sem_relacao" in reasons:
        score += 40
    elif "uma_relacao" in reasons:
        score += 20
    if "sem_afirmacao" in reasons:
        score += 25
    elif "uma_afirmacao" in reasons:
        score += 12
    if "sem_fonte" in reasons:
        score += 20
    elif "uma_fonte" in reasons:
        score += 8
    if "conteudo_fino" in reasons:
        score += 10
    if "tipo_subrepresentado" in reasons:
        score += 15
    if infer_domain(entity) == "historia-brasil":
        score += 10
    if len(entity.get("summary", "")) >= 80:
        score += 5
    if entity["sources"] > 0:
        score += 5

    # Pessoas, eventos e obras sustentam relação histórica melhor que um lugar
    # genérico ou um conceito isolado. O ajuste não elimina a entidade da fila.
    score += {
        "person": 10,
        "event": 12,
        "work": 8,
        "ideology": 8,
        "institution": 5,
        "party": 5,
        "place": -15,
    }.get(entity["kind"], 0)
    if entity["claims"] >= 3 and entity["degree"] == 0:
        score += 5
    if entity["claims"] == 0:
        score -= 5
    return max(0, min(100, score))


def build_query(entity: dict[str, Any]) -> str:
    summary = " ".join((entity.get("summary") or "").split()[:24])
    aliases = ", ".join(entity.get("aliases", [])[:4])
    parts = [entity["title"]]
    if aliases:
        parts.append(aliases)
    if summary:
        parts.append(summary)
    return " ".join(parts)


def build_graph_gap_queue(
    *,
    bundle_data: dict[str, Any] | None = None,
    output_path: Path | None = None,
    limit: int = 120,
    min_score: int = 40,
) -> dict[str, Any]:
    """Gera a fila de lacunas do grafo a partir do release pinado."""
    if bundle_data is None:
        loaded = load_pinned_bundle()
        bundle_data = loaded.data
        release = loaded.release
    else:
        release = bundle_data.get("release") or "local"

    state = collect_graph_state(bundle_data)
    items: list[dict[str, Any]] = []
    for entity in state["entities"].values():
        reasons = gap_reasons(entity)
        if not reasons:
            continue
        score = gap_score(entity, reasons)
        if score < min_score:
            continue
        if entity["claims"] == 0 or entity["sources"] == 0:
            mode = "fonte"
        elif "conteudo_fino" in reasons:
            mode = "conteudo"
        else:
            mode = "relacao"
        items.append(
            {
                "id": f"gap-graph-{entity['id']}",
                "entityId": entity["id"],
                "entitySlug": entity.get("slug"),
                "topic": entity["title"],
                "kind": entity["kind"],
                "domain": infer_domain(entity),
                "query": build_query(entity),
                "aliases": entity.get("aliases", [])[:6],
                "queueMode": mode,
                "atlasSlugs": entity["atlasSlugs"],
                "degree": entity["degree"],
                "claims": entity["claims"],
                "sources": entity["sources"],
                "reasons": reasons,
                "score": score,
                "ok": None,
            }
        )

    items.sort(key=lambda item: (-item["score"], item["topic"].lower()))
    items = items[:limit]
    now = datetime.now(timezone.utc).isoformat()

    payload = {
        "generated_at": now,
        "release": release,
        "human_reviewed": False,
        "origin": "graph-gap-mining",
        "description": (
            "Entidades do release publicado com pouca ou nenhuma relação/afirmação. "
            "A fila orienta descoberta de fontes e rascunhos; não cria relação nem publica."
        ),
        "summary": {
            "atlases": state["atlases"],
            "entities": len(state["entities"]),
            "queued": len(items),
            "without_relations": sum(1 for item in items if "sem_relacao" in item["reasons"]),
            "without_claims": sum(1 for item in items if "sem_afirmacao" in item["reasons"]),
            "without_sources": sum(1 for item in items if "sem_fonte" in item["reasons"]),
            "thin_content": sum(1 for item in items if item["queueMode"] == "conteudo"),
            "brazil": sum(1 for item in items if item["domain"] == "historia-brasil"),
            "by_mode": {
                mode: sum(1 for item in items if item["queueMode"] == mode)
                for mode in ("fonte", "conteudo", "relacao")
            },
        },
        "review": {
            "by": "ai",
            "model": "bge-m3+graph-state",
            "stage": "graph-gap-mining",
            "verdict": "pending-human",
            "reviewedAt": now,
        },
        "items": items,
    }

    dest = output_path or (eval_dir() / "queues" / "lacunas-do-grafo.json")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return {
        "output_path": str(dest),
        "release": release,
        "summary": payload["summary"],
        "top": [
            {"topic": item["topic"], "score": item["score"], "reasons": item["reasons"]}
            for item in items[:10]
        ],
    }
