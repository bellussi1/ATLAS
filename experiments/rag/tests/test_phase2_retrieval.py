"""Testes da Fase 2: baselines lexicais, BM25, bge-m3, RRF, reranker e métricas."""

from __future__ import annotations

import json

from atlas_rag.eval.metrics import bootstrap_ci, mrr_at_k, ndcg_at_k, recall_at_k
from atlas_rag.paths import eval_dir
from atlas_rag.retrieve.hybrid import rrf_fuse
from atlas_rag.retrieve.lexical import (
    BM25Retriever,
    ContentOverlapLexicalRetriever,
    ScoredHit,
    StrictCurrentLexicalRetriever,
)
from atlas_rag.units.builder import RetrievalUnit


def _dummy_unit(uid: str, eid: str, title: str, text: str, granularity: str = "claim") -> RetrievalUnit:
    return RetrievalUnit(
        unit_id=uid,
        granularity=granularity,
        entity_id=eid,
        entity_title=title,
        entity_slug=eid,
        entity_kind="person",
        scope="general",
        atlas_id="atlas-test",
        text_raw=text,
        text_enriched=f"{title}: {text}",
        classification="documented-fact",
        editorial_status="pending",
        citation_ids=[],
        evidence_ids=[],
        source_ids=[],
        source_titles=[],
        source_urls=[],
        locators=[],
        aliases=[],
    )


def test_metrics_and_rrf_math() -> None:
    assert recall_at_k(["c2", "c1", "c3"], ["c1", "c4"], k=2) == 0.5
    assert mrr_at_k(["c2", "c1", "c3"], ["c1", "c4"], k=10) == 0.5
    assert round(ndcg_at_k(["c1"], ["c1"], k=10), 4) == 1.0
    ci = bootstrap_ci([0.0, 0.5, 1.0, 1.0], n_boot=200, seed=7)
    assert ci["ci_low"] <= ci["mean"] <= ci["ci_high"]

    h1 = [ScoredHit("a", 1.0, "e1", "claim"), ScoredHit("b", 0.5, "e2", "claim")]
    h2 = [ScoredHit("b", 1.0, "e2", "claim"), ScoredHit("c", 0.5, "e3", "claim")]
    fused = rrf_fuse([h1, h2], k=60, top_k=3)
    assert fused[0].unit_id == "b"


def test_lexical_strict_drops_stopword_natural_question() -> None:
    u1 = _dummy_unit("ent-vargas", "ent-vargas", "Getúlio Vargas", "Nasceu em São Borja e instaurou o Estado Novo em 1937.", granularity="entity")
    c1 = _dummy_unit("c-vargas", "ent-vargas", "Getúlio Vargas", "Nasceu em São Borja e instaurou o Estado Novo em 1937.")
    c2 = _dummy_unit("c-smith", "ent-smith", "Adam Smith", "Filósofo escocês nascido em Kirkcaldy, autor de A Riqueza das Nações.")
    c3 = _dummy_unit("c-marx", "ent-marx", "Karl Marx", "Publicou O Capital em Londres no ano de 1867.")
    strict = StrictCurrentLexicalRetriever([u1])
    overlap = ContentOverlapLexicalRetriever([c1, c2, c3])
    bm25 = BM25Retriever([c1, c2, c3])

    q = "Em qual cidade inexistente nasceu Getúlio Vargas?"
    assert strict.search(q, top_k=5) == []
    assert overlap.search(q, top_k=5)[0].unit_id == "c-vargas"
    assert bm25.search(q, top_k=5)[0].unit_id == "c-vargas"


def test_phase2_run_metrics_artifact_structure() -> None:
    mpath = eval_dir() / "runs" / "phase2_retrieval" / "metrics.json"
    data = json.loads(mpath.read_text(encoding="utf-8"))
    expected_systems = {
        "lexical_current_strict",
        "lexical_claims",
        "bm25_claims",
        "dense_claim_enriched",
        "dense_claim_raw",
        "dense_paragraph_enriched",
        "dense_entity_enriched",
        "hybrid_rrf_claims",
        "hybrid_rerank_top20_b16",
        "hybrid_rerank_top50_b16",
        "hybrid_rerank_top50_b8",
    }
    assert expected_systems.issubset(set(data["systems"].keys()))
    assert data["systems"]["hybrid_rerank_top50_b16"]["overall"]["recall_10"]["mean"] > data["systems"]["lexical_current_strict"]["overall"]["recall_10"]["mean"]
    assert len(data["error_analysis"]["hybrid_rerank_top50_b16"]["top3_categories"]) == 3
