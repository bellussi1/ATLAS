"""Métricas de recuperação (Recall@k, MRR@10, nDCG@10), bootstrap 95% e análise de erros."""

from __future__ import annotations

import math
from typing import Any, Mapping, Sequence

import numpy as np

from atlas_rag.retrieve.lexical import ScoredHit


def recall_at_k(ranked_ids: Sequence[str], gold_ids: Sequence[str], k: int) -> float:
    if not gold_ids:
        return 0.0
    gold_set = set(gold_ids)
    hits = set(ranked_ids[:k]) & gold_set
    return len(hits) / len(gold_set)


def mrr_at_k(ranked_ids: Sequence[str], gold_ids: Sequence[str], k: int = 10) -> float:
    gold_set = set(gold_ids)
    for rank, uid in enumerate(ranked_ids[:k], start=1):
        if uid in gold_set:
            return 1.0 / rank
    return 0.0


def ndcg_at_k(ranked_ids: Sequence[str], gold_ids: Sequence[str], k: int = 10) -> float:
    gold_set = set(gold_ids)
    if not gold_set:
        return 0.0
    dcg = 0.0
    for rank, uid in enumerate(ranked_ids[:k], start=1):
        if uid in gold_set:
            dcg += 1.0 / math.log2(rank + 1)
    ideal_count = min(k, len(gold_set))
    idcg = sum(1.0 / math.log2(rank + 1) for rank in range(1, ideal_count + 1))
    return dcg / idcg if idcg > 0 else 0.0


def expand_hits_for_eval(
    hits: Sequence[ScoredHit],
    entity_to_claims: Mapping[str, list[str]],
    *,
    max_claims: int = 40,
) -> tuple[list[str], list[str]]:
    """Converte hits em sequência deduplicada de claim_ids (ou entidade->claims) e entity_ids."""
    ranked_claims: list[str] = []
    seen_claims: set[str] = set()
    ranked_entities: list[str] = []
    seen_entities: set[str] = set()

    for hit in hits:
        if hit.entity_id not in seen_entities:
            seen_entities.add(hit.entity_id)
            ranked_entities.append(hit.entity_id)
        if hit.granularity == "claim":
            if hit.unit_id not in seen_claims:
                seen_claims.add(hit.unit_id)
                ranked_claims.append(hit.unit_id)
        else:
            for cid in entity_to_claims.get(hit.entity_id, []):
                if cid not in seen_claims:
                    seen_claims.add(cid)
                    ranked_claims.append(cid)
                    if len(ranked_claims) >= max_claims:
                        break
        if len(ranked_claims) >= max_claims:
            break
    return ranked_claims, ranked_entities


def bootstrap_ci(values: Sequence[float], *, n_boot: int = 1000, seed: int = 42) -> dict[str, float]:
    """Calcula média e IC 95% via reamostragem bootstrap."""
    if not values:
        return {"mean": 0.0, "ci_low": 0.0, "ci_high": 0.0, "n": 0}
    arr = np.asarray(values, dtype=np.float64)
    mean = float(np.mean(arr))
    if len(arr) == 1:
        return {"mean": round(mean, 4), "ci_low": round(mean, 4), "ci_high": round(mean, 4), "n": 1}
    rng = np.random.default_rng(seed)
    idx = rng.integers(0, len(arr), size=(n_boot, len(arr)))
    samples = np.mean(arr[idx], axis=1)
    low, high = np.percentile(samples, [2.5, 97.5])
    return {
        "mean": round(mean, 4),
        "ci_low": round(float(low), 4),
        "ci_high": round(float(high), 4),
        "n": int(len(arr)),
    }


def evaluate_query_rows(
    questions: Sequence[dict[str, Any]],
    hits_by_qid: Mapping[str, Sequence[ScoredHit]],
    claims_map: Mapping[str, dict[str, Any]],
    entity_to_claims: Mapping[str, list[str]],
    *,
    n_boot: int = 1000,
) -> dict[str, Any]:
    """Computa métricas globais, por split e por tipo, com IC 95% bootstrap."""
    per_query: list[dict[str, Any]] = []
    answerable_questions = [q for q in questions if q.get("gold_unit_ids")]

    for q in answerable_questions:
        qid = q["id"]
        gold_claims = list(q["gold_unit_ids"])
        gold_entities = list(dict.fromkeys(claims_map[cid]["entityId"] for cid in gold_claims if cid in claims_map))
        hits = hits_by_qid.get(qid, [])
        ranked_claims, ranked_entities = expand_hits_for_eval(hits, entity_to_claims, max_claims=40)

        rec = {
            "id": qid,
            "split": q["split"],
            "type": q["type"],
            "recall_5": recall_at_k(ranked_claims, gold_claims, 5),
            "recall_10": recall_at_k(ranked_claims, gold_claims, 10),
            "recall_20": recall_at_k(ranked_claims, gold_claims, 20),
            "mrr_10": mrr_at_k(ranked_claims, gold_claims, 10),
            "ndcg_10": ndcg_at_k(ranked_claims, gold_claims, 10),
            "entity_recall_5": recall_at_k(ranked_entities, gold_entities, 5),
            "entity_recall_10": recall_at_k(ranked_entities, gold_entities, 10),
            "top_score": float(hits[0].score) if hits else 0.0,
            "gold_claim_ids": gold_claims,
            "retrieved_top5": ranked_claims[:5],
        }
        per_query.append(rec)

    def _summarize(subset: list[dict[str, Any]], *, with_ci: bool = True) -> dict[str, Any]:
        keys = ["recall_5", "recall_10", "recall_20", "mrr_10", "ndcg_10", "entity_recall_5", "entity_recall_10"]
        out: dict[str, Any] = {"n": len(subset)}
        for k in keys:
            vals = [row[k] for row in subset]
            if with_ci:
                out[k] = bootstrap_ci(vals, n_boot=n_boot)
            else:
                out[k] = round(float(np.mean(vals)) if vals else 0.0, 4)
        return out

    oov_scores = [
        float(hits_by_qid[q["id"]][0].score) if hits_by_qid.get(q["id"]) else 0.0
        for q in questions
        if q.get("type") == "sem_resposta"
    ]
    ans_scores = [row["top_score"] for row in per_query]

    by_type = {}
    for qtype in sorted({r["type"] for r in per_query}):
        by_type[qtype] = _summarize([r for r in per_query if r["type"] == qtype], with_ci=True)

    by_split = {
        sp: _summarize([r for r in per_query if r["split"] == sp], with_ci=True)
        for sp in ("dev", "test")
    }

    return {
        "overall": _summarize(per_query, with_ci=True),
        "by_split": by_split,
        "by_type": by_type,
        "score_separation": {
            "answerable_mean_top1": round(float(np.mean(ans_scores)) if ans_scores else 0.0, 4),
            "sem_resposta_mean_top1": round(float(np.mean(oov_scores)) if oov_scores else 0.0, 4),
        },
        "per_query": per_query,
    }


def categorize_failures(
    eval_result: Mapping[str, Any],
    questions_by_id: Mapping[str, dict[str, Any]],
    claims_map: Mapping[str, dict[str, Any]],
) -> dict[str, Any]:
    """Agrupa falhas em Recall@10 < 1.0 nas categorias estruturais dominantes."""
    categories: dict[str, list[dict[str, Any]]] = {
        "multi_hop_e_comparativa_incompleta": [],
        "desalinhamento_lexical_ou_granuralidade": [],
        "descoberta_ou_ranking_contestada": [],
    }
    for row in eval_result.get("per_query", []):
        if row["recall_10"] >= 1.0:
            continue
        qid = row["id"]
        q = questions_by_id[qid]
        qtype = q["type"]
        ent_hit = row["entity_recall_10"]
        if qtype in ("multi_hop", "comparativa") and 0.0 < row["recall_10"] < 1.0:
            cat = "multi_hop_e_comparativa_incompleta"
        elif ent_hit > row["recall_10"]:
            cat = "desalinhamento_lexical_ou_granuralidade"
        else:
            cat = "descoberta_ou_ranking_contestada"
        categories[cat].append(
            {
                "id": qid,
                "type": qtype,
                "question": q["question"],
                "recall_10": row["recall_10"],
                "entity_recall_10": row["entity_recall_10"],
                "gold_claim_ids": row["gold_claim_ids"],
                "retrieved_top5": row["retrieved_top5"],
                "gold_entity_titles": [
                    claims_map[cid].get("entityId") for cid in row["gold_claim_ids"] if cid in claims_map
                ],
            }
        )

    ranked_cats = sorted(categories.items(), key=lambda kv: -len(kv[1]))
    return {
        "total_incomplete_recall10": sum(len(v) for _, v in ranked_cats),
        "top3_categories": [
            {"category": name, "count": len(items), "examples": items[:3]}
            for name, items in ranked_cats[:3]
        ],
    }
