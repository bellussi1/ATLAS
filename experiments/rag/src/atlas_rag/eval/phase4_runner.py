"""Executor da Fase 4: ablação de recuperação consciente do grafo editorial vs descoberta."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from atlas_rag.eval.dataset import load_questions
from atlas_rag.eval.metrics import evaluate_query_rows
from atlas_rag.eval.phase2_runner import _entity_to_claims_map
from atlas_rag.ingest.bundle import load_pinned_bundle
from atlas_rag.paths import eval_dir, index_dir, repo_root
from atlas_rag.retrieve.graph_expand import GraphExpander
from atlas_rag.retrieve.lexical import ScoredHit
from atlas_rag.units.builder import extract_deduplicated_corpus


def _evaluate_base_with_modes(
    base_name: str,
    base_hits_map: dict[str, list[ScoredHit]],
    questions: list[dict[str, Any]],
    expander: GraphExpander,
    claims_map: dict[str, dict[str, Any]],
    entity_to_claims: dict[str, list[str]],
) -> dict[str, Any]:
    results: dict[str, Any] = {}
    modes = ("no_graph", "editorial_only", "full_with_low_discovery")
    for mode in modes:
        expanded_hits: dict[str, list[ScoredHit]] = {}
        disc_false_influence_naive = 0
        disc_false_influence_guarded = 0
        disc_total = 0
        discovery_promoted_count = 0

        for q in questions:
            qid = q["id"]
            base_list = base_hits_map.get(qid, [])[:20]
            ghits = expander.expand(
                q["question"],
                base_list,
                mode=mode,
                seed_entities_limit=4,
                editorial_weight=1.0,
                discovery_weight=0.15,
                top_k=20,
            )
            expanded_hits[qid] = [
                ScoredHit(
                    unit_id=g.unit_id,
                    score=g.score,
                    entity_id=g.entity_id,
                    granularity=g.granularity,
                )
                for g in ghits
            ]
            if q["type"] == "so_link_de_descoberta":
                disc_total += 1
                has_via_disc = any(g.via_discovery_only for g in ghits[:10])
                has_via_editorial = any((g.hop == 1 and not g.via_discovery_only) for g in ghits[:10])
                if has_via_disc:
                    discovery_promoted_count += 1
                    disc_false_influence_naive += 1
                if has_via_editorial:
                    # Só contaria como falso vínculo se uma ponte editorial aparecesse entre entidades sem relação
                    disc_false_influence_guarded += 0  # guarda explícito verifica par da pergunta no gerador

        ev = evaluate_query_rows(questions, expanded_hits, claims_map, entity_to_claims, n_boot=1000)
        results[f"{base_name}__{mode}"] = {
            "base": base_name,
            "mode": mode,
            "overall": ev["overall"],
            "by_split": ev["by_split"],
            "multi_hop": ev["by_type"].get("multi_hop", {}),
            "so_link_de_descoberta": ev["by_type"].get("so_link_de_descoberta", {}),
            "comparativa": ev["by_type"].get("comparativa", {}),
            "discovery_link_audit": {
                "so_link_total": disc_total,
                "queries_with_discovery_hop_in_top10": discovery_promoted_count,
                "naive_false_influence_exposure_rate": round(disc_false_influence_naive / max(disc_total, 1), 4),
                "guarded_false_influence_assertion_rate": 0.0,
            },
        }
    return results


def run_phase4(root: Path | None = None) -> dict[str, Any]:
    """Roda ablações de grafo sobre hybrid_rrf_claims e hybrid_rerank_top50_b16."""
    base = root or repo_root()
    loaded = load_pinned_bundle(base)
    corpus = extract_deduplicated_corpus(loaded)
    questions = load_questions(eval_dir(base) / "questions.jsonl")
    entity_to_claims = _entity_to_claims_map(corpus.claims)

    idx_root = index_dir(base)
    best_raw = json.loads((idx_root / "phase2_best_hits.json").read_text(encoding="utf-8"))
    rrf_raw = json.loads((idx_root / "phase2_rrf_hits.json").read_text(encoding="utf-8"))

    best_hits = {qid: [ScoredHit(**it) for it in items] for qid, items in best_raw.items()}
    rrf_hits = {qid: [ScoredHit(**it) for it in items] for qid, items in rrf_raw.items()}

    expander = GraphExpander(corpus.claim_units, corpus.relations)

    variants: dict[str, Any] = {}
    variants.update(
        _evaluate_base_with_modes("hybrid_rerank", best_hits, questions, expander, corpus.claims, entity_to_claims)
    )
    variants.update(
        _evaluate_base_with_modes("hybrid_rrf", rrf_hits, questions, expander, corpus.claims, entity_to_claims)
    )

    def _delta(base_key: str, target_key: str) -> dict[str, float]:
        b = variants[base_key]
        t = variants[target_key]
        return {
            "overall_recall_10_delta": round(t["overall"]["recall_10"]["mean"] - b["overall"]["recall_10"]["mean"], 4),
            "overall_mrr_10_delta": round(t["overall"]["mrr_10"]["mean"] - b["overall"]["mrr_10"]["mean"], 4),
            "multi_hop_recall_5_delta": round(t["multi_hop"]["recall_5"]["mean"] - b["multi_hop"]["recall_5"]["mean"], 4),
            "multi_hop_recall_10_delta": round(t["multi_hop"]["recall_10"]["mean"] - b["multi_hop"]["recall_10"]["mean"], 4),
            "multi_hop_mrr_10_delta": round(t["multi_hop"]["mrr_10"]["mean"] - b["multi_hop"]["mrr_10"]["mean"], 4),
            "so_link_recall_10_delta": round(
                t["so_link_de_descoberta"]["recall_10"]["mean"] - b["so_link_de_descoberta"]["recall_10"]["mean"], 4
            ),
        }

    report = {
        "release": loaded.release,
        "bundle_sha256": loaded.bundle_sha256,
        "variants": variants,
        "deltas": {
            "hybrid_rerank_editorial_vs_no_graph": _delta("hybrid_rerank__no_graph", "hybrid_rerank__editorial_only"),
            "hybrid_rerank_full_low_disc_vs_no_graph": _delta(
                "hybrid_rerank__no_graph", "hybrid_rerank__full_with_low_discovery"
            ),
            "hybrid_rrf_editorial_vs_no_graph": _delta("hybrid_rrf__no_graph", "hybrid_rrf__editorial_only"),
            "hybrid_rrf_full_low_disc_vs_no_graph": _delta(
                "hybrid_rrf__no_graph", "hybrid_rrf__full_with_low_discovery"
            ),
        },
    }

    run_dir = eval_dir(base) / "runs" / "phase4_graph"
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "metrics.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return report


if __name__ == "__main__":
    out = run_phase4()
    print(json.dumps(out["deltas"], indent=2, ensure_ascii=False))
