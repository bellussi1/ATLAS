"""Tracing estruturado por requisição, teto de tokens e orçamento em execução."""

from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from atlas_rag.paths import data_dir


@dataclass(frozen=True)
class TraceRecord:
    trace_id: str
    timestamp_utc: str
    question_id: str
    model: str
    retrieve_ms: float
    rerank_ms: float
    generate_ms: float
    input_tokens: int
    output_tokens: int
    max_tokens_budget: int
    token_budget_ok: bool
    cost_usd: float
    refused: bool
    guard_valid: bool
    violations: list[str] = field(default_factory=list)


def make_trace_record(
    *,
    question_id: str,
    model: str,
    retrieve_ms: float,
    rerank_ms: float,
    generate_ms: float,
    input_tokens: int,
    output_tokens: int,
    cost_usd: float,
    refused: bool,
    guard_valid: bool,
    violations: list[str],
    max_tokens_budget: int = 2048,
) -> TraceRecord:
    return TraceRecord(
        trace_id=str(uuid.uuid4()),
        timestamp_utc=datetime.now(timezone.utc).isoformat(),
        question_id=question_id,
        model=model,
        retrieve_ms=round(retrieve_ms, 3),
        rerank_ms=round(rerank_ms, 3),
        generate_ms=round(generate_ms, 3),
        input_tokens=int(input_tokens),
        output_tokens=int(output_tokens),
        max_tokens_budget=int(max_tokens_budget),
        token_budget_ok=(int(input_tokens) + int(output_tokens)) <= int(max_tokens_budget),
        cost_usd=round(float(cost_usd), 6),
        refused=bool(refused),
        guard_valid=bool(guard_valid),
        violations=list(violations),
    )


def write_trace_jsonl(records: list[TraceRecord], output_path: Path | None = None) -> Path:
    path = output_path or (data_dir() / "traces" / "rag_traces.jsonl")
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [json.dumps(asdict(r), ensure_ascii=False) for r in records]
    path.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
    return path
