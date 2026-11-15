"""Reranker cross-encoder BAAI/bge-reranker-v2-m3 em FP16 com controle de lote e VRAM."""

from __future__ import annotations

import math
import time
from dataclasses import dataclass
from typing import Any, Mapping, Sequence

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from atlas_rag.embed.bge_m3 import unload_ollama_gpu, unload_torch_gpu
from atlas_rag.retrieve.lexical import ScoredHit
from atlas_rag.units.builder import RetrievalUnit

DEFAULT_RERANKER_MODEL = "BAAI/bge-reranker-v2-m3"


@dataclass(frozen=True)
class RerankTelemetry:
    model_name: str
    device: str
    dtype: str
    batch_size: int
    max_length: int
    total_pairs: int
    elapsed_seconds: float
    pairs_per_second: float
    peak_vram_mb: float


def _sigmoid(x: float) -> float:
    if x >= 0:
        return 1.0 / (1.0 + math.exp(-x))
    ex = math.exp(x)
    return ex / (1.0 + ex)


class BgeReranker:
    """Cross-encoder FP16 com descarte explícito da GPU após uso."""

    def __init__(
        self,
        model_name: str = DEFAULT_RERANKER_MODEL,
        *,
        device: str | None = None,
        max_length: int = 512,
        use_fp16: bool = True,
    ) -> None:
        self.model_name = model_name
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.use_fp16 = bool(use_fp16 and self.device.startswith("cuda"))
        self.max_length = max_length
        self._tokenizer: Any = None
        self._model: Any = None

    def load(self) -> tuple[Any, Any]:
        if self._model is None or self._tokenizer is None:
            unload_ollama_gpu()
            if self.device.startswith("cuda") and torch.cuda.is_available():
                torch.cuda.reset_peak_memory_stats()
            tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            dtype = torch.float16 if self.use_fp16 else torch.float32
            model = AutoModelForSequenceClassification.from_pretrained(self.model_name, dtype=dtype)
            model.to(self.device)
            model.eval()
            self._tokenizer = tokenizer
            self._model = model
        return self._tokenizer, self._model

    def unload(self) -> None:
        tok, mod = self._tokenizer, self._model
        self._tokenizer = None
        self._model = None
        unload_torch_gpu(tok, mod)

    def score_pairs(
        self,
        pairs: Sequence[tuple[str, str]],
        *,
        batch_size: int = 16,
        normalize_sigmoid: bool = True,
    ) -> tuple[list[float], RerankTelemetry]:
        """Pontua pares (consulta, passagem) em lotes limitados para caber em 8 GB VRAM."""
        tokenizer, model = self.load()
        if self.device.startswith("cuda") and torch.cuda.is_available():
            torch.cuda.reset_peak_memory_stats()
            torch.cuda.synchronize()
        t0 = time.perf_counter()
        scores: list[float] = []
        with torch.no_grad():
            for start in range(0, len(pairs), batch_size):
                chunk = pairs[start : start + batch_size]
                inputs = tokenizer(
                    [q for q, _ in chunk],
                    [p for _, p in chunk],
                    padding=True,
                    truncation=True,
                    max_length=self.max_length,
                    return_tensors="pt",
                )
                inputs = {k: v.to(self.device) for k, v in inputs.items()}
                logits = model(**inputs).logits.view(-1).float().cpu().tolist()
                if normalize_sigmoid:
                    scores.extend(_sigmoid(float(x)) for x in logits)
                else:
                    scores.extend(float(x) for x in logits)
        if self.device.startswith("cuda") and torch.cuda.is_available():
            torch.cuda.synchronize()
            peak_mb = torch.cuda.max_memory_allocated() / (1024.0 * 1024.0)
        else:
            peak_mb = 0.0
        elapsed = time.perf_counter() - t0
        telemetry = RerankTelemetry(
            model_name=self.model_name,
            device=self.device,
            dtype="float16" if self.use_fp16 else "float32",
            batch_size=batch_size,
            max_length=self.max_length,
            total_pairs=len(pairs),
            elapsed_seconds=round(elapsed, 4),
            pairs_per_second=round(len(pairs) / max(elapsed, 1e-6), 2),
            peak_vram_mb=round(peak_mb, 2),
        )
        return scores, telemetry

    def rerank_hits(
        self,
        query: str,
        hits: Sequence[ScoredHit],
        unit_lookup: Mapping[str, RetrievalUnit],
        *,
        batch_size: int = 16,
        top_k: int = 20,
    ) -> list[ScoredHit]:
        if not hits:
            return []
        pairs = [(query, unit_lookup[h.unit_id].text_enriched) for h in hits if h.unit_id in unit_lookup]
        valid_hits = [h for h in hits if h.unit_id in unit_lookup]
        scores, _ = self.score_pairs(pairs, batch_size=batch_size, normalize_sigmoid=True)
        rescored = [
            ScoredHit(
                unit_id=h.unit_id,
                score=float(s),
                entity_id=h.entity_id,
                granularity=h.granularity,
            )
            for h, s in zip(valid_hits, scores)
        ]
        rescored.sort(key=lambda h: (-h.score, h.unit_id))
        return rescored[:top_k]

    def __enter__(self) -> BgeReranker:
        self.load()
        return self

    def __exit__(self, *_args: Any) -> None:
        self.unload()
