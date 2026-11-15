"""Executor da Fase 3: geração com citações, travas duras, projeção --dry-run e juiz calibrado."""

from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path
from typing import Any

from atlas_rag.cost import BudgetTracker
from atlas_rag.embed.bge_m3 import unload_ollama_gpu
from atlas_rag.eval.dataset import load_questions
from atlas_rag.generate.generator import GenerationResult, generate_cited_answer
from atlas_rag.ingest.bundle import load_pinned_bundle
from atlas_rag.judge.fidelity import (
    assess_generation_fidelity,
    calibrate_llm_judge,
    summarize_fidelity_assessments,
)
from atlas_rag.paths import data_dir, eval_dir, index_dir, repo_root
from atlas_rag.retrieve.lexical import ScoredHit
from atlas_rag.units.builder import RetrievalUnit, extract_deduplicated_corpus

PAID_PROJECTION_MODELS = (
    "claude-haiku-5-5",
    "claude-sonnet-5-5",
    "deepseek-flash",
    "gemini-3.8-flash",
)


def calibrate_refusal_threshold_on_dev(
    questions: list[dict[str, Any]],
    hits_by_qid: dict[str, list[ScoredHit]],
) -> float:
    """Seleciona limiar de score de reranker maximizando acurácia de recusa APENAS no split dev."""
    dev_items = [q for q in questions if q.get("split") == "dev"]
    best_thresh = 0.20
    best_acc = -1.0
    for step in range(5, 85, 5):
        cand = step / 100.0
        correct = 0
        for q in dev_items:
            hits = hits_by_qid.get(q["id"], [])
            top_sc = float(hits[0].score) if hits else 0.0
            # Só testamos recusa por OOV/baixo score aqui (discovery é tratado pelo grafo)
            is_oov = q["type"] == "sem_resposta"
            pred_low = top_sc < cand
            if is_oov == pred_low:
                correct += 1
            elif q["type"] not in ("sem_resposta", "so_link_de_descoberta") and not pred_low:
                correct += 1
        acc = correct / max(len(dev_items), 1)
        if acc > best_acc:
            best_acc = acc
            best_thresh = cand
    return round(best_thresh, 2)


def run_phase3(
    *,
    models: tuple[str, ...] = (
        "extractive_cited",
        "ollama/qwen3:8b-q4_K_M",
    ),
    limit: int | None = None,
    root: Path | None = None,
) -> dict[str, Any]:
    """Executa comparação de geradores zero-custo + dry-run de APIs pagas + calibração de juiz."""
    base = root or repo_root()
    loaded = load_pinned_bundle(base)
    corpus = extract_deduplicated_corpus(loaded)
    questions = load_questions(eval_dir(base) / "questions.jsonl")
    if limit is not None:
        questions = questions[:limit]

    unit_lookup: dict[str, RetrievalUnit] = {u.unit_id: u for u in corpus.claim_units}
    best_hits_path = index_dir(base) / "phase2_best_hits.json"
    raw_hits = json.loads(best_hits_path.read_text(encoding="utf-8"))
    hits_by_qid: dict[str, list[ScoredHit]] = {
        qid: [ScoredHit(**item) for item in items]
        for qid, items in raw_hits.items()
    }

    min_score = calibrate_refusal_threshold_on_dev(questions, hits_by_qid)
    cache_root = data_dir(base) / "cache" / "llm"

    results_by_model: dict[str, Any] = {}
    sample_outputs: dict[str, list[dict[str, Any]]] = {}

    for model_name in models:
        if model_name.startswith("ollama/"):
            unload_ollama_gpu()
        tracker = BudgetTracker(max_usd=0.0, dry_run=True, cache_dir=cache_root)
        gen_records: list[GenerationResult] = []
        assessments = []
        raw_pass_count = 0
        guard_override_count = 0

        for q in questions:
            qid = q["id"]
            hits = hits_by_qid.get(qid, [])
            ctx_units = [unit_lookup[h.unit_id] for h in hits if h.unit_id in unit_lookup][:5]
            ctx_scores = [float(h.score) for h in hits if h.unit_id in unit_lookup][:5]
            res = generate_cited_answer(
                q["question"],
                ctx_units,
                ctx_scores,
                corpus.claims,
                corpus.relations,
                entities_map=corpus.entities,
                model=model_name,
                budget=tracker,
                min_rerank_score=min_score,
                apply_guards=True,
            )
            gen_records.append(res)
            if res.raw_guard.valid:
                raw_pass_count += 1
            if res.guard_overridden:
                guard_override_count += 1
            assessments.append(assess_generation_fidelity(res, q, corpus.claims))

        if model_name.startswith("ollama/"):
            unload_ollama_gpu()

        summary = summarize_fidelity_assessments(assessments)
        latencies = [g.latency_ms for g in gen_records]
        in_toks = sum(g.input_tokens for g in gen_records)
        out_toks = sum(g.output_tokens for g in gen_records)

        results_by_model[model_name] = {
            "summary": summary,
            "by_split": {
                sp: summarize_fidelity_assessments(
                    [a for a, q in zip(assessments, questions) if q["split"] == sp]
                )
                for sp in ("dev", "test")
            },
            "raw_guard_pass_rate": round(raw_pass_count / len(questions), 4),
            "guard_override_count": guard_override_count,
            "mean_latency_ms": round(sum(latencies) / max(len(latencies), 1), 2),
            "total_input_tokens": in_toks,
            "total_output_tokens": out_toks,
            "measured_cost_usd": 0.0,
            "cost_per_100_queries_usd": 0.0,
        }
        sample_outputs[model_name] = [
            {
                "id": q["id"],
                "type": q["type"],
                "response": g.response.model_dump(),
                "raw_guard_valid": g.raw_guard.valid,
                "raw_violations": g.raw_guard.violations,
                "guard_overridden": g.guard_overridden,
                "fidelity": asdict(a),
            }
            for q, g, a in zip(questions[:12], gen_records[:12], assessments[:12])
        ]

    # Projeção --dry-run (US$ 0.00 gastos) para os modelos pagos previstos no plano
    dry_run_projections: dict[str, Any] = {}
    for paid_model in PAID_PROJECTION_MODELS:
        proj_tracker = BudgetTracker(max_usd=1.50, dry_run=True, cache_dir=cache_root)
        for q in questions:
            qid = q["id"]
            hits = hits_by_qid.get(qid, [])
            ctx_units = [unit_lookup[h.unit_id] for h in hits if h.unit_id in unit_lookup][:5]
            ctx_scores = [float(h.score) for h in hits if h.unit_id in unit_lookup][:5]
            generate_cited_answer(
                q["question"],
                ctx_units,
                ctx_scores,
                corpus.claims,
                corpus.relations,
                entities_map=corpus.entities,
                model=paid_model,
                budget=proj_tracker,
                min_rerank_score=min_score,
                apply_guards=True,
            )
        scale_100 = 100.0 / max(len(questions), 1)
        dry_run_projections[paid_model] = {
            **proj_tracker.summary(),
            "projected_per_100_queries_usd": round(proj_tracker.projected_usd * scale_100, 4),
        }

    # Calibração do juiz LLM local em 30 casos balanceados + descarga VRAM final
    unload_ollama_gpu()
    judge_cal = calibrate_llm_judge(corpus.claims, judge_model="ollama/qwen3:8b-q4_K_M")
    unload_ollama_gpu()

    report = {
        "release": loaded.release,
        "bundle_sha256": loaded.bundle_sha256,
        "questions_evaluated": len(questions),
        "calibrated_min_rerank_score_dev": min_score,
        "models": results_by_model,
        "paid_api_dry_run_projections": dry_run_projections,
        "judge_calibration": judge_cal,
    }

    run_dir = eval_dir(base) / "runs" / "phase3_generation"
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "metrics.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (run_dir / "sample_outputs.json").write_text(
        json.dumps(sample_outputs, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return report


if __name__ == "__main__":
    out = run_phase3()
    compact = {
        m: {
            "faithfulness": v["summary"]["deterministic_faithfulness_rate"],
            "citation_ok": v["summary"]["citation_correctness_rate"],
            "true_refusal": v["summary"]["true_refusal_rate"],
            "false_refusal": v["summary"]["false_refusal_rate"],
            "raw_guard_pass": v["raw_guard_pass_rate"],
            "lat_ms": v["mean_latency_ms"],
        }
        for m, v in out["models"].items()
    }
    print(json.dumps({"models": compact, "judge": out["judge_calibration"], "dry_run": out["paid_api_dry_run_projections"]}, indent=2, ensure_ascii=False))
