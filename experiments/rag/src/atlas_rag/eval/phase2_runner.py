"""Executor completo da Fase 2: baselines lexicais, BM25, bge-m3 (4 granularidades), híbrido RRF e reranker."""

from __future__ import annotations

import json
import time
from collections import defaultdict
from dataclasses import asdict
from pathlib import Path
from typing import Any

import numpy as np
import torch

from atlas_rag.embed.bge_m3 import BgeM3Embedder
from atlas_rag.eval.dataset import load_questions
from atlas_rag.eval.metrics import categorize_failures, evaluate_query_rows
from atlas_rag.index.vector_store import LocalVectorIndex, build_manifest
from atlas_rag.ingest.bundle import load_pinned_bundle
from atlas_rag.paths import eval_dir, index_dir, repo_root
from atlas_rag.rerank.bge_reranker import BgeReranker
from atlas_rag.retrieve.hybrid import DenseRetriever, HybridRRFRetriever
from atlas_rag.retrieve.lexical import (
    BM25Retriever,
    ContentOverlapLexicalRetriever,
    ScoredHit,
    StrictCurrentLexicalRetriever,
)
from atlas_rag.units.builder import RetrievalUnit, extract_deduplicated_corpus


def _entity_to_claims_map(claims: dict[str, dict[str, Any]]) -> dict[str, list[str]]:
    grouped: dict[str, list[str]] = defaultdict(list)
    for cid, claim in claims.items():
        eid = claim.get("entityId")
        if eid:
            grouped[eid].append(cid)
    for eid in grouped:
        grouped[eid].sort()
    return dict(grouped)


def build_or_load_indices(
    *,
    force_rebuild: bool = False,
    root: Path | None = None,
) -> tuple[dict[str, LocalVectorIndex], np.ndarray, list[dict[str, Any]], dict[str, Any]]:
    """Constrói (ou recarrega) índices densos FP16 em GPU + vetores das consultas."""
    base = root or repo_root()
    idx_root = index_dir(base)
    idx_root.mkdir(parents=True, exist_ok=True)
    q_vec_path = idx_root / "eval_queries_vectors.npy"
    q_meta_path = idx_root / "eval_queries_telemetry.json"

    loaded = load_pinned_bundle(base)
    corpus = extract_deduplicated_corpus(loaded)
    questions = load_questions(eval_dir(base) / "questions.jsonl")

    specs: list[tuple[str, list[RetrievalUnit], bool]] = [
        ("claim_enriched", corpus.claim_units, True),
        ("claim_raw", corpus.claim_units, False),
        ("paragraph_enriched", corpus.paragraph_units, True),
        ("entity_enriched", corpus.entity_units, True),
    ]

    need_encode = force_rebuild or not q_vec_path.exists()
    for name, _, _ in specs:
        if not (idx_root / name / "vectors.npy").exists():
            need_encode = True
            break

    indices: dict[str, LocalVectorIndex] = {}
    encode_telemetry: dict[str, Any] = {}

    if need_encode:
        with BgeM3Embedder() as embedder:
            for name, units, enriched in specs:
                texts = [u.text_enriched if enriched else u.text_raw for u in units]
                batch = 64 if name.startswith("claim") or name.startswith("paragraph") else 16
                vecs, tel = embedder.encode_texts(texts, batch_size=batch, show_progress_bar=False)
                manifest = build_manifest(name, loaded.bundle_sha256, enriched, tel, units)
                store = LocalVectorIndex(name=name, vectors=vecs, units=units, manifest=manifest)
                store.save(idx_root)
                indices[name] = store
                encode_telemetry[name] = asdict(tel)

            q_texts = [q["question"] for q in questions]
            q_vecs, q_tel = embedder.encode_texts(q_texts, batch_size=32, show_progress_bar=False)
            np.save(q_vec_path, q_vecs.astype(np.float32))
            encode_telemetry["eval_queries"] = asdict(q_tel)
            q_meta_path.write_text(json.dumps(encode_telemetry, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    else:
        for name, _, _ in specs:
            store = LocalVectorIndex.load(name, idx_root)
            indices[name] = store
            encode_telemetry[name] = store.manifest.get("telemetry", {})
        q_vecs = np.load(q_vec_path).astype(np.float32)
        if q_meta_path.exists():
            encode_telemetry["eval_queries"] = json.loads(q_meta_path.read_text(encoding="utf-8")).get("eval_queries", {})

    vram_after_unload_mb = round(torch.cuda.memory_allocated() / (1024.0 * 1024.0), 2) if torch.cuda.is_available() else 0.0
    encode_telemetry["vram_allocated_after_embed_unload_mb"] = vram_after_unload_mb
    return indices, q_vecs, questions, encode_telemetry


def _compact_eval_summary(full_eval: dict[str, Any]) -> dict[str, Any]:
    return {
        "overall": full_eval["overall"],
        "by_split": full_eval["by_split"],
        "by_type": full_eval["by_type"],
        "score_separation": full_eval["score_separation"],
    }


def _serialize_hits(hits_map: dict[str, list[ScoredHit]]) -> dict[str, list[dict[str, Any]]]:
    return {qid: [asdict(h) for h in hits] for qid, hits in hits_map.items()}


def run_phase2(
    *,
    force_rebuild_index: bool = False,
    root: Path | None = None,
) -> dict[str, Any]:
    """Executa toda a matriz comparativa da Fase 2 e persiste metrics.json."""
    base = root or repo_root()
    loaded = load_pinned_bundle(base)
    corpus = extract_deduplicated_corpus(loaded)
    entity_to_claims = _entity_to_claims_map(corpus.claims)

    indices, q_vecs, questions, encode_telemetry = build_or_load_indices(
        force_rebuild=force_rebuild_index,
        root=base,
    )
    questions_by_id = {q["id"]: q for q in questions}
    claim_unit_map: dict[str, RetrievalUnit] = {u.unit_id: u for u in corpus.claim_units}

    # Baselines lexicais e BM25
    strict_lex = StrictCurrentLexicalRetriever(corpus.entity_units)
    overlap_lex = ContentOverlapLexicalRetriever(corpus.claim_units)
    bm25 = BM25Retriever(corpus.claim_units)

    # Recuperadores densos em 4 configurações
    dense_claim_enriched = DenseRetriever(indices["claim_enriched"])
    dense_claim_raw = DenseRetriever(indices["claim_raw"])
    dense_paragraph = DenseRetriever(indices["paragraph_enriched"])
    dense_entity = DenseRetriever(indices["entity_enriched"])

    hybrid_rrf = HybridRRFRetriever(bm25=bm25, dense=dense_claim_enriched, rrf_k=60)

    hits_by_system: dict[str, dict[str, list[ScoredHit]]] = {
        "lexical_current_strict": {},
        "lexical_claims": {},
        "bm25_claims": {},
        "dense_claim_enriched": {},
        "dense_claim_raw": {},
        "dense_paragraph_enriched": {},
        "dense_entity_enriched": {},
        "hybrid_rrf_claims": {},
    }
    latency_ms: dict[str, float] = {}

    # Execução sem GPU (lexicais + matrizes normalizadas)
    runners: list[tuple[str, Any]] = [
        ("lexical_current_strict", lambda q, _v: strict_lex.search(q["question"], top_k=20)),
        ("lexical_claims", lambda q, _v: overlap_lex.search(q["question"], top_k=20)),
        ("bm25_claims", lambda q, _v: bm25.search(q["question"], top_k=20)),
        ("dense_claim_enriched", lambda _q, v: dense_claim_enriched.search_vector(v, top_k=20)),
        ("dense_claim_raw", lambda _q, v: dense_claim_raw.search_vector(v, top_k=20)),
        ("dense_paragraph_enriched", lambda _q, v: dense_paragraph.search_vector(v, top_k=20)),
        ("dense_entity_enriched", lambda _q, v: dense_entity.search_vector(v, top_k=20)),
        ("hybrid_rrf_claims", lambda q, v: hybrid_rrf.search(q["question"], v, top_k=50, candidate_depth=60)),
    ]

    for sys_name, fn in runners:
        t0 = time.perf_counter()
        for idx, q in enumerate(questions):
            hits_by_system[sys_name][q["id"]] = fn(q, q_vecs[idx])
        elapsed = (time.perf_counter() - t0) * 1000.0
        latency_ms[sys_name] = round(elapsed / len(questions), 3)

    # Reranking FP16 em GPU com BAAI/bge-reranker-v2-m3 (embedder já descarregado)
    rerank_telemetry: dict[str, Any] = {}
    rerank_configs = [
        ("hybrid_rerank_top20_b16", 20, 16),
        ("hybrid_rerank_top50_b16", 50, 16),
        ("hybrid_rerank_top50_b8", 50, 8),
    ]

    with BgeReranker(max_length=512) as reranker:
        for sys_name, pool_size, batch_size in rerank_configs:
            hits_by_system[sys_name] = {}
            all_pairs: list[tuple[str, str]] = []
            slices: list[tuple[str, list[ScoredHit]]] = []
            for q in questions:
                qid = q["id"]
                pool = [h for h in hits_by_system["hybrid_rrf_claims"][qid][:pool_size] if h.unit_id in claim_unit_map]
                slices.append((qid, pool))
                for h in pool:
                    all_pairs.append((q["question"], claim_unit_map[h.unit_id].text_enriched))

            scores, tel = reranker.score_pairs(all_pairs, batch_size=batch_size, normalize_sigmoid=True)
            offset = 0
            for qid, pool in slices:
                q_scores = scores[offset : offset + len(pool)]
                offset += len(pool)
                rescored = [
                    ScoredHit(
                        unit_id=h.unit_id,
                        score=float(s),
                        entity_id=h.entity_id,
                        granularity=h.granularity,
                    )
                    for h, s in zip(pool, q_scores)
                ]
                rescored.sort(key=lambda h: (-h.score, h.unit_id))
                hits_by_system[sys_name][qid] = rescored[:20]

            rerank_telemetry[sys_name] = asdict(tel)
            latency_ms[sys_name] = round((tel.elapsed_seconds * 1000.0) / len(questions) + latency_ms["hybrid_rrf_claims"], 3)

    vram_after_rerank_unload_mb = round(torch.cuda.memory_allocated() / (1024.0 * 1024.0), 2) if torch.cuda.is_available() else 0.0
    rerank_telemetry["vram_allocated_after_rerank_unload_mb"] = vram_after_rerank_unload_mb

    # Avaliação completa de todos os sistemas
    eval_full: dict[str, dict[str, Any]] = {}
    systems_compact: dict[str, Any] = {}
    for sys_name, sys_hits in hits_by_system.items():
        # Corta hybrid_rrf em top 20 para avaliação justa contra demais
        eval_hits = {qid: hlist[:20] for qid, hlist in sys_hits.items()}
        res = evaluate_query_rows(questions, eval_hits, corpus.claims, entity_to_claims, n_boot=1000)
        eval_full[sys_name] = res
        systems_compact[sys_name] = {
            **_compact_eval_summary(res),
            "mean_latency_ms_per_query": latency_ms[sys_name],
        }

    # Análise das 3 principais categorias de falha (sistema principal e baseline BM25)
    error_analysis = {
        "hybrid_rerank_top50_b16": categorize_failures(eval_full["hybrid_rerank_top50_b16"], questions_by_id, corpus.claims),
        "bm25_claims": categorize_failures(eval_full["bm25_claims"], questions_by_id, corpus.claims),
    }

    report = {
        "release": loaded.release,
        "bundle_sha256": loaded.bundle_sha256,
        "dataset_questions": len(questions),
        "answerable_questions": sum(1 for q in questions if q.get("gold_unit_ids")),
        "default_retrieval_unit": "claim_enriched",
        "index_telemetry": encode_telemetry,
        "rerank_telemetry": rerank_telemetry,
        "systems": systems_compact,
        "error_analysis": error_analysis,
    }

    run_dir = eval_dir(base) / "runs" / "phase2_retrieval"
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "metrics.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Salva hits detalhados para Fases 3, 4 e 5
    idx_root = index_dir(base)
    (idx_root / "phase2_best_hits.json").write_text(
        json.dumps(_serialize_hits(hits_by_system["hybrid_rerank_top50_b16"]), ensure_ascii=False),
        encoding="utf-8",
    )
    (idx_root / "phase2_rrf_hits.json").write_text(
        json.dumps(_serialize_hits(hits_by_system["hybrid_rrf_claims"]), ensure_ascii=False),
        encoding="utf-8",
    )
    (run_dir / "per_query_details.json").write_text(
        json.dumps(
            {
                sys_name: {
                    "per_query": eval_full[sys_name]["per_query"],
                }
                for sys_name in ("lexical_current_strict", "bm25_claims", "dense_claim_enriched", "hybrid_rrf_claims", "hybrid_rerank_top50_b16")
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    return report


if __name__ == "__main__":
    summary = run_phase2()
    compact_table = {
        k: {
            "recall_5": v["overall"]["recall_5"]["mean"],
            "recall_10": v["overall"]["recall_10"]["mean"],
            "recall_20": v["overall"]["recall_20"]["mean"],
            "mrr_10": v["overall"]["mrr_10"]["mean"],
            "ndcg_10": v["overall"]["ndcg_10"]["mean"],
            "entity_r5": v["overall"]["entity_recall_5"]["mean"],
            "lat_ms": v["mean_latency_ms_per_query"],
        }
        for k, v in summary["systems"].items()
    }
    print(json.dumps(compact_table, indent=2, ensure_ascii=False))
