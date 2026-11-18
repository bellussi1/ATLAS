"""Armazenamento local em disco (.npy + JSONL + manifest) para índices densos."""

from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path
from typing import Any, Sequence

import numpy as np

from atlas_rag.embed.bge_m3 import EncodeTelemetry
from atlas_rag.paths import index_dir
from atlas_rag.units.builder import RetrievalUnit


class LocalVectorIndex:
    """Índice vetorial L2-normalizado em memória/disco com busca cosseno exata."""

    def __init__(
        self,
        name: str,
        vectors: np.ndarray,
        units: list[RetrievalUnit],
        manifest: dict[str, Any] | None = None,
    ) -> None:
        if len(units) != vectors.shape[0]:
            raise ValueError(f"Quantidade divergente em {name}: {vectors.shape[0]} vetores vs {len(units)} unidades")
        self.name = name
        self.vectors = np.asarray(vectors, dtype=np.float32)
        self.units = units
        self.manifest = manifest or {}
        self.id_to_pos: dict[str, int] = {u.unit_id: idx for idx, u in enumerate(units)}
        self.unit_by_id: dict[str, RetrievalUnit] = {u.unit_id: u for u in units}

    def save(self, base_dir: Path | None = None) -> Path:
        root = (base_dir or index_dir()) / self.name
        root.mkdir(parents=True, exist_ok=True)
        np.save(root / "vectors.npy", self.vectors.astype(np.float16))
        lines = [json.dumps(asdict(u), ensure_ascii=False) for u in self.units]
        (root / "units.jsonl").write_text("\n".join(lines) + "\n", encoding="utf-8")
        (root / "manifest.json").write_text(json.dumps(self.manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return root

    @classmethod
    def load(cls, name: str, base_dir: Path | None = None) -> LocalVectorIndex:
        root = (base_dir or index_dir()) / name
        vectors = np.load(root / "vectors.npy").astype(np.float32)
        units: list[RetrievalUnit] = []
        for line in (root / "units.jsonl").read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            units.append(RetrievalUnit(**json.loads(line)))
        manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
        return cls(name=name, vectors=vectors, units=units, manifest=manifest)

    def search_vector(self, query_vec: np.ndarray, top_k: int = 20) -> list[tuple[RetrievalUnit, float]]:
        q = np.asarray(query_vec, dtype=np.float32).reshape(-1)
        scores = self.vectors @ q
        k = min(top_k, len(self.units))
        if k <= 0:
            return []
        if k < len(self.units):
            top_idx = np.argpartition(scores, -k)[-k:]
            top_idx = top_idx[np.argsort(-scores[top_idx])]
        else:
            top_idx = np.argsort(-scores)
        return [(self.units[int(i)], float(scores[int(i)])) for i in top_idx]


def build_manifest(
    name: str,
    bundle_sha256: str,
    use_enriched: bool,
    telemetry: EncodeTelemetry,
    units: Sequence[RetrievalUnit],
) -> dict[str, Any]:
    return {
        "index_name": name,
        "bundle_sha256": bundle_sha256,
        "use_enriched": use_enriched,
        "granularity": units[0].granularity if units else None,
        "count": len(units),
        "telemetry": asdict(telemetry),
    }
