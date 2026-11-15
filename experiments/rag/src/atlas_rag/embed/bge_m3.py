"""Codificador denso BAAI/bge-m3 em FP16 para GPU local (RTX 4060 8 GB)."""

from __future__ import annotations

import gc
import time
from dataclasses import dataclass
from typing import Any, Sequence

import httpx
import numpy as np
import torch
from sentence_transformers import SentenceTransformer

DEFAULT_EMBED_MODEL = "BAAI/bge-m3"


@dataclass(frozen=True)
class EncodeTelemetry:
    model_name: str
    device: str
    dtype: str
    count: int
    dim: int
    elapsed_seconds: float
    items_per_second: float
    peak_vram_mb: float


def unload_torch_gpu(*objects: Any) -> None:
    """Libera referências de modelos PyTorch e força coleta de VRAM."""
    for obj in objects:
        del obj
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        if hasattr(torch.cuda, "ipc_collect"):
            torch.cuda.ipc_collect()


def unload_ollama_gpu(base_url: str = "http://localhost:11434", timeout: float = 5.0) -> list[str]:
    """Descarrega modelos residentes no Ollama para liberar VRAM antes de embeddings/rerankers."""
    unloaded: list[str] = []
    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.get(f"{base_url}/api/ps")
            if resp.status_code != 200:
                return unloaded
            models = resp.json().get("models", [])
            for m in models:
                name = m.get("name") or m.get("model")
                if not name:
                    continue
                client.post(f"{base_url}/api/generate", json={"model": name, "keep_alive": 0})
                unloaded.append(name)
    except Exception:
        return unloaded
    return unloaded


class BgeM3Embedder:
    """Wrapper com ciclo de vida explícito de memória para BAAI/bge-m3."""

    def __init__(
        self,
        model_name: str = DEFAULT_EMBED_MODEL,
        *,
        device: str | None = None,
        max_seq_length: int = 512,
        use_fp16: bool = True,
    ) -> None:
        self.model_name = model_name
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.use_fp16 = bool(use_fp16 and self.device.startswith("cuda"))
        self.max_seq_length = max_seq_length
        self._model: SentenceTransformer | None = None

    def load(self) -> SentenceTransformer:
        if self._model is None:
            unload_ollama_gpu()
            if self.device.startswith("cuda") and torch.cuda.is_available():
                torch.cuda.reset_peak_memory_stats()
            model = SentenceTransformer(self.model_name, device=self.device)
            model.max_seq_length = self.max_seq_length
            if self.use_fp16:
                model = model.half()
            self._model = model
        return self._model

    def unload(self) -> None:
        if self._model is not None:
            m = self._model
            self._model = None
            unload_torch_gpu(m)

    def encode_texts(
        self,
        texts: Sequence[str],
        *,
        batch_size: int = 64,
        show_progress_bar: bool = False,
    ) -> tuple[np.ndarray, EncodeTelemetry]:
        """Codifica textos em vetores L2-normalizados float32 e mede tempo/VRAM."""
        model = self.load()
        if self.device.startswith("cuda") and torch.cuda.is_available():
            torch.cuda.reset_peak_memory_stats()
            torch.cuda.synchronize()
        t0 = time.perf_counter()
        vectors = model.encode(
            list(texts),
            batch_size=batch_size,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=show_progress_bar,
        )
        if self.device.startswith("cuda") and torch.cuda.is_available():
            torch.cuda.synchronize()
            peak_mb = torch.cuda.max_memory_allocated() / (1024.0 * 1024.0)
        else:
            peak_mb = 0.0
        elapsed = time.perf_counter() - t0
        arr = np.asarray(vectors, dtype=np.float32)
        telemetry = EncodeTelemetry(
            model_name=self.model_name,
            device=self.device,
            dtype="float16" if self.use_fp16 else "float32",
            count=len(texts),
            dim=int(arr.shape[1]) if arr.ndim == 2 else 0,
            elapsed_seconds=round(elapsed, 4),
            items_per_second=round(len(texts) / max(elapsed, 1e-6), 2),
            peak_vram_mb=round(peak_mb, 2),
        )
        return arr, telemetry

    def __enter__(self) -> BgeM3Embedder:
        self.load()
        return self

    def __exit__(self, *_args: Any) -> None:
        self.unload()
