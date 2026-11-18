"""Gera pares candidatos sem aresta usando embeddings locais (BAAI/bge-m3)."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import numpy as np

from atlas_rag.embed.bge_m3 import BgeM3Embedder


def load_disk_graph(knowledge_dir: Path) -> tuple[list[dict[str, Any]], set[tuple[str, str]], dict[str, int]]:
    manifest = json.loads((knowledge_dir / "manifest.json").read_text(encoding="utf-8"))
    entities: list[dict[str, Any]] = []
    existing_pairs: set[tuple[str, str]] = set()
    degree: dict[str, int] = {}

    for col in manifest.get("collections", []):
        atlas = json.loads((knowledge_dir / col["file"]).read_text(encoding="utf-8"))
        atlas_id = atlas["id"]
        claims_by_entity: dict[str, list[dict[str, Any]]] = {}
        for claim in atlas.get("claims", []):
            eid = claim.get("entityId")
            has_ev = bool(claim.get("citationIds") or claim.get("evidenceIds"))
            if eid and has_ev:
                claims_by_entity.setdefault(eid, []).append(
                    {"id": claim["id"], "text": claim["text"]}
                )

        for entity in atlas.get("entities", []):
            eid = entity["id"]
            ent_claims = claims_by_entity.get(eid, [])
            entities.append(
                {
                    "id": eid,
                    "atlasId": atlas_id,
                    "kind": entity.get("kind", "concept"),
                    "title": entity.get("title", eid),
                    "summary": entity.get("summary") or "",
                    "claims": ent_claims[:6],
                }
            )

        for rel in atlas.get("relations", []):
            src = rel.get("fromEntityId")
            dst = rel.get("toEntityId")
            if src and dst:
                existing_pairs.add((src, dst))
                existing_pairs.add((dst, src))
                degree[src] = degree.get(src, 0) + 1
                degree[dst] = degree.get(dst, 0) + 1

    return entities, existing_pairs, degree


def entity_text(entity: dict[str, Any]) -> str:
    claims_text = " ".join(c["text"] for c in entity["claims"][:4])
    return f"{entity['title']} ({entity['kind']}). {entity['summary']} {claims_text}".strip()


def find_candidates(
    knowledge_dir: Path,
    out_path: Path,
    *,
    top_k: int = 8,
    min_sim: float = 0.56,
    limit: int = 400,
) -> dict[str, Any]:
    entities, existing_pairs, degree = load_disk_graph(knowledge_dir)
    texts = [entity_text(e) for e in entities]

    with BgeM3Embedder() as embedder:
        vectors, telemetry = embedder.encode_texts(texts, batch_size=64, show_progress_bar=False)

    sim_matrix = vectors @ vectors.T
    np.fill_diagonal(sim_matrix, -1.0)

    seen_pairs: set[tuple[str, str]] = set()
    candidates: list[dict[str, Any]] = []

    for i, src in enumerate(entities):
        if not src["claims"]:
            continue
        row = sim_matrix[i]
        top_indices = np.argpartition(row, -min(top_k * 2, len(row) - 1))[-min(top_k * 2, len(row) - 1) :]
        top_indices = top_indices[np.argsort(-row[top_indices])]

        picked = 0
        for j in top_indices:
            sim = float(row[j])
            if sim < min_sim:
                break
            dst = entities[int(j)]
            if src["id"] == dst["id"] or not dst["claims"]:
                continue
            if (src["id"], dst["id"]) in existing_pairs:
                continue
            key = tuple(sorted((src["id"], dst["id"])))
            if key in seen_pairs:
                continue
            seen_pairs.add(key)

            min_deg = min(degree.get(src["id"], 0), degree.get(dst["id"], 0))
            cross_atlas = src["atlasId"] != dst["atlasId"]
            priority = sim + (0.08 if cross_atlas else 0.0) + (0.12 if min_deg <= 2 else 0.0)
            candidates.append(
                {
                    "priority": round(priority, 4),
                    "similarity": round(sim, 4),
                    "crossAtlas": cross_atlas,
                    "atlasId": src["atlasId"],
                    "from": {
                        "id": src["id"],
                        "kind": src["kind"],
                        "title": src["title"],
                        "summary": src["summary"],
                        "claims": src["claims"][:3],
                    },
                    "to": {
                        "id": dst["id"],
                        "kind": dst["kind"],
                        "title": dst["title"],
                        "summary": dst["summary"],
                        "claims": dst["claims"][:3],
                    },
                }
            )
            picked += 1
            if picked >= top_k:
                break

    candidates.sort(key=lambda c: c["priority"], reverse=True)
    selected = candidates[:limit]

    out_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "model": telemetry.model_name,
        "entities_indexed": len(entities),
        "total_candidates": len(candidates),
        "selected": len(selected),
        "elapsed_seconds": telemetry.elapsed_seconds,
        "peak_vram_mb": telemetry.peak_vram_mb,
        "candidates": selected,
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {k: v for k, v in payload.items() if k != "candidates"}


def main() -> None:
    parser = argparse.ArgumentParser(description="Encontra pares candidatos no grafo via bge-m3.")
    parser.add_argument("--knowledge-dir", type=Path, default=Path("content/knowledge"))
    parser.add_argument(
        "--out", type=Path, default=Path("generated/rag-candidates/relation-candidates.json")
    )
    parser.add_argument("--top-k", type=int, default=8)
    parser.add_argument("--min-sim", type=float, default=0.56)
    parser.add_argument("--limit", type=int, default=400)
    args = parser.parse_args()
    summary = find_candidates(
        args.knowledge_dir,
        args.out,
        top_k=args.top_k,
        min_sim=args.min_sim,
        limit=args.limit,
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
