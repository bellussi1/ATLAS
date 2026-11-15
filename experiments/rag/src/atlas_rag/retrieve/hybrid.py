"""Recuperadores denso (cosseno) e híbrido (RRF k=60 entre BM25 e denso)."""

from __future__ import annotations

import numpy as np

from atlas_rag.index.vector_store import LocalVectorIndex
from atlas_rag.retrieve.lexical import BM25Retriever, ScoredHit


class DenseRetriever:
    """Busca por similaridade cosseno em vetores normalizados."""

    def __init__(self, vector_index: LocalVectorIndex) -> None:
        self.index = vector_index

    def search_vector(self, query_vec: np.ndarray, top_k: int = 20) -> list[ScoredHit]:
        hits = self.index.search_vector(query_vec, top_k=top_k)
        return [
            ScoredHit(
                unit_id=u.unit_id,
                score=float(score),
                entity_id=u.entity_id,
                granularity=u.granularity,
            )
            for u, score in hits
        ]


def rrf_fuse(
    ranked_lists: list[list[ScoredHit]],
    *,
    weights: list[float] | None = None,
    k: int = 60,
    top_k: int = 50,
) -> list[ScoredHit]:
    """Combina listas ordenadas via Reciprocal Rank Fusion (Cormack et al., 2009)."""
    if weights is None:
        weights = [1.0] * len(ranked_lists)
    scores: dict[str, float] = {}
    meta: dict[str, ScoredHit] = {}
    for w, hits in zip(weights, ranked_lists):
        for rank, hit in enumerate(hits, start=1):
            scores[hit.unit_id] = scores.get(hit.unit_id, 0.0) + (w / (k + rank))
            if hit.unit_id not in meta:
                meta[hit.unit_id] = hit
    ordered = sorted(scores.items(), key=lambda item: (-item[1], item[0]))[:top_k]
    return [
        ScoredHit(
            unit_id=uid,
            score=float(score),
            entity_id=meta[uid].entity_id,
            granularity=meta[uid].granularity,
        )
        for uid, score in ordered
    ]


class HybridRRFRetriever:
    """Fusão RRF (k=60) combinando BM25 + busca densa bge-m3."""

    def __init__(
        self,
        bm25: BM25Retriever,
        dense: DenseRetriever,
        *,
        rrf_k: int = 60,
        bm25_weight: float = 1.0,
        dense_weight: float = 1.0,
    ) -> None:
        self.bm25 = bm25
        self.dense = dense
        self.rrf_k = rrf_k
        self.bm25_weight = bm25_weight
        self.dense_weight = dense_weight

    def search(
        self,
        query_text: str,
        query_vec: np.ndarray,
        *,
        top_k: int = 20,
        candidate_depth: int = 60,
    ) -> list[ScoredHit]:
        depth = max(top_k, candidate_depth)
        bm25_hits = self.bm25.search(query_text, top_k=depth)
        dense_hits = self.dense.search_vector(query_vec, top_k=depth)
        return rrf_fuse(
            [bm25_hits, dense_hits],
            weights=[self.bm25_weight, self.dense_weight],
            k=self.rrf_k,
            top_k=top_k,
        )
