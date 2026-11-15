"""Checagem de regressão para CI (Phase 5) usando limiares definidos após os baselines."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from atlas_rag.paths import eval_dir, repo_root


def build_default_thresholds_from_runs(root: Path | None = None) -> dict[str, Any]:
    """Deriva baseline_thresholds.json a partir das execuções observadas (nunca antes do baseline)."""
    base = root or repo_root()
    edir = eval_dir(base)
    p2 = json.loads((edir / "runs" / "phase2_retrieval" / "metrics.json").read_text(encoding="utf-8"))
    p3 = json.loads((edir / "runs" / "phase3_generation" / "metrics.json").read_text(encoding="utf-8"))
    p4 = json.loads((edir / "runs" / "phase4_graph" / "metrics.json").read_text(encoding="utf-8"))
    p5 = json.loads((edir / "runs" / "phase5_reliability" / "security_report.json").read_text(encoding="utf-8"))

    best_ret = p2["systems"]["hybrid_rerank_top20_b16"]["overall"]
    ext_gen = p3["models"]["extractive_cited"]["summary"]
    qwen_gen = p3["models"].get("ollama/qwen3:8b-q4_K_M", p3["models"]["extractive_cited"])["summary"]
    p4_ed = p4["variants"]["hybrid_rerank__editorial_only"]["multi_hop"]
    sec_rate = p5["models"]["extractive_cited"]["defense_rate"]

    # Margem de tolerância conservadora (5 p.p. em métricas contínuas, 100% em segurança/citações duras)
    thresholds = {
        "derived_from_release": p2["release"],
        "derived_from_bundle_sha256": p2["bundle_sha256"],
        "phase2_retrieval": {
            "system": "hybrid_rerank_top20_b16",
            "recall_5_min": round(max(0.0, best_ret["recall_5"]["mean"] - 0.05), 4),
            "recall_10_min": round(max(0.0, best_ret["recall_10"]["mean"] - 0.05), 4),
            "mrr_10_min": round(max(0.0, best_ret["mrr_10"]["mean"] - 0.05), 4),
            "ndcg_10_min": round(max(0.0, best_ret["ndcg_10"]["mean"] - 0.05), 4),
        },
        "phase3_generation": {
            "extractive_faithfulness_min": round(max(0.0, ext_gen["deterministic_faithfulness_rate"] - 0.03), 4),
            "extractive_citation_ok_min": 0.99,
            "extractive_true_refusal_min": 0.95,
            "local_llm_citation_ok_min": round(max(0.0, qwen_gen["citation_correctness_rate"] - 0.03), 4),
        },
        "phase4_graph": {
            "multi_hop_recall_10_min": round(max(0.0, p4_ed["recall_10"]["mean"] - 0.05), 4),
            "guarded_false_influence_max": 0.0,
        },
        "phase5_security": {
            "defense_rate_min": min(1.0, sec_rate),
        },
    }
    tpath = edir / "baseline_thresholds.json"
    tpath.write_text(json.dumps(thresholds, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return thresholds


def check_regression(root: Path | None = None) -> dict[str, Any]:
    """Verifica se métricas versionadas atendem aos limiares registrados."""
    base = root or repo_root()
    edir = eval_dir(base)
    thresholds = json.loads((edir / "baseline_thresholds.json").read_text(encoding="utf-8"))
    p2 = json.loads((edir / "runs" / "phase2_retrieval" / "metrics.json").read_text(encoding="utf-8"))
    p3 = json.loads((edir / "runs" / "phase3_generation" / "metrics.json").read_text(encoding="utf-8"))
    p4 = json.loads((edir / "runs" / "phase4_graph" / "metrics.json").read_text(encoding="utf-8"))
    p5 = json.loads((edir / "runs" / "phase5_reliability" / "security_report.json").read_text(encoding="utf-8"))

    failures: list[str] = []
    checks: list[dict[str, Any]] = []

    def _assert_min(name: str, observed: float, limit: float) -> None:
        ok = observed >= limit
        checks.append({"check": name, "observed": observed, "min": limit, "ok": ok})
        if not ok:
            failures.append(f"{name}: {observed} < {limit}")

    def _assert_max(name: str, observed: float, limit: float) -> None:
        ok = observed <= limit
        checks.append({"check": name, "observed": observed, "max": limit, "ok": ok})
        if not ok:
            failures.append(f"{name}: {observed} > {limit}")

    t2 = thresholds["phase2_retrieval"]
    obs2 = p2["systems"][t2["system"]]["overall"]
    _assert_min("phase2.recall_5", obs2["recall_5"]["mean"], t2["recall_5_min"])
    _assert_min("phase2.recall_10", obs2["recall_10"]["mean"], t2["recall_10_min"])
    _assert_min("phase2.mrr_10", obs2["mrr_10"]["mean"], t2["mrr_10_min"])
    _assert_min("phase2.ndcg_10", obs2["ndcg_10"]["mean"], t2["ndcg_10_min"])

    t3 = thresholds["phase3_generation"]
    ext3 = p3["models"]["extractive_cited"]["summary"]
    _assert_min("phase3.extractive.faithfulness", ext3["deterministic_faithfulness_rate"], t3["extractive_faithfulness_min"])
    _assert_min("phase3.extractive.citation_ok", ext3["citation_correctness_rate"], t3["extractive_citation_ok_min"])
    _assert_min("phase3.extractive.true_refusal", ext3["true_refusal_rate"], t3["extractive_true_refusal_min"])

    t4 = thresholds["phase4_graph"]
    obs4 = p4["variants"]["hybrid_rerank__editorial_only"]
    _assert_min("phase4.multi_hop.recall_10", obs4["multi_hop"]["recall_10"]["mean"], t4["multi_hop_recall_10_min"])
    _assert_max(
        "phase4.discovery_guarded_false_influence",
        obs4["discovery_link_audit"]["guarded_false_influence_assertion_rate"],
        t4["guarded_false_influence_max"],
    )

    t5 = thresholds["phase5_security"]
    obs5 = p5["models"]["extractive_cited"]["defense_rate"]
    _assert_min("phase5.security.defense_rate", obs5, t5["defense_rate_min"])

    return {"passed": len(failures) == 0, "failures": failures, "checks": checks}


if __name__ == "__main__":
    result = check_regression()
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if not result["passed"]:
        raise SystemExit(1)
