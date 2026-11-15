"""Controle de custo (--dry-run, --max-usd), estimativa e cache em disco por SHA-256."""

from __future__ import annotations

import hashlib
import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from atlas_rag.paths import data_dir

CHARS_PER_TOKEN = 2.7

# Tarifas por 1 milhão de tokens (USD) para projeção e teto de gasto
MODEL_PRICING_USD_PER_M: dict[str, dict[str, float]] = {
    "extractive_cited": {"input": 0.0, "output": 0.0},
    "ollama/qwen3:8b-q4_K_M": {"input": 0.0, "output": 0.0},
    "ollama/hf.co/bartowski/EuroLLM-9B-Instruct-GGUF:Q4_K_M": {"input": 0.0, "output": 0.0},
    "ollama/hf.co/BSC-LT/salamandraTA-7B-instruct-GGUF:Q4_K_M": {"input": 0.0, "output": 0.0},
    "claude-haiku-5-5": {"input": 1.00, "output": 5.00},
    "claude-sonnet-5-5": {"input": 3.00, "output": 15.00},
    "deepseek-flash": {"input": 0.27, "output": 1.10},
    "gemini-3.8-flash": {"input": 0.10, "output": 0.40},
}


def estimate_tokens(text: str, *, chars_per_token: float = CHARS_PER_TOKEN) -> int:
    if not text:
        return 0
    return max(1, math.ceil(len(text) / chars_per_token))


def cost_of_usage(model: str, input_tokens: int, output_tokens: int) -> float:
    rates = MODEL_PRICING_USD_PER_M.get(model)
    if not rates:
        raise KeyError(f"Modelo sem tabela de preço definida: {model}")
    return (input_tokens / 1_000_000.0) * rates["input"] + (output_tokens / 1_000_000.0) * rates["output"]


def hash_prompt_key(model: str, system_prompt: str, user_prompt: str, extra: str = "") -> str:
    payload = json.dumps(
        {"model": model, "system": system_prompt, "user": user_prompt, "extra": extra},
        sort_keys=True,
        ensure_ascii=False,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class BudgetExceededError(RuntimeError):
    """Lançada antes de chamar API paga se a estimativa ou gasto acumulado ultrapassar max_usd."""


@dataclass
class BudgetTracker:
    max_usd: float = 0.0
    dry_run: bool = True
    cache_dir: Path | None = None
    spent_usd: float = 0.0
    projected_usd: float = 0.0
    input_tokens: int = 0
    output_tokens: int = 0
    cache_hits: int = 0
    calls: int = 0
    events: list[dict[str, Any]] = field(default_factory=list)

    def _resolve_cache_path(self, cache_key: str) -> Path:
        root = self.cache_dir or (data_dir() / "cache" / "llm")
        root.mkdir(parents=True, exist_ok=True)
        return root / f"{cache_key}.json"

    def get_cached(self, cache_key: str) -> dict[str, Any] | None:
        path = self._resolve_cache_path(cache_key)
        if not path.exists():
            return None
        self.cache_hits += 1
        return json.loads(path.read_text(encoding="utf-8"))

    def put_cached(self, cache_key: str, payload: dict[str, Any]) -> None:
        path = self._resolve_cache_path(cache_key)
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    def reserve_or_project(self, model: str, system_prompt: str, user_prompt: str, expected_out_tokens: int = 220) -> dict[str, Any]:
        in_tok = estimate_tokens(system_prompt) + estimate_tokens(user_prompt)
        est_cost = cost_of_usage(model, in_tok, expected_out_tokens)
        self.projected_usd += est_cost
        self.calls += 1
        if not self.dry_run and (self.spent_usd + est_cost) > self.max_usd and est_cost > 0.0:
            raise BudgetExceededError(
                f"Orçamento máximo (${self.max_usd:.4f}) seria excedido com +{est_cost:.4f} para {model}"
            )
        rec = {
            "model": model,
            "estimated_input_tokens": in_tok,
            "estimated_output_tokens": expected_out_tokens,
            "estimated_usd": round(est_cost, 6),
        }
        self.events.append(rec)
        return rec

    def commit_actual(self, model: str, input_tokens: int, output_tokens: int) -> float:
        actual = cost_of_usage(model, input_tokens, output_tokens)
        if not self.dry_run and (self.spent_usd + actual) > self.max_usd and actual > 0.0:
            raise BudgetExceededError(f"Teto --max-usd={self.max_usd:.4f} excedido (acumulado={self.spent_usd + actual:.4f})")
        self.spent_usd += actual
        self.input_tokens += input_tokens
        self.output_tokens += output_tokens
        return actual

    def summary(self) -> dict[str, Any]:
        return {
            "dry_run": self.dry_run,
            "max_usd": self.max_usd,
            "spent_usd": round(self.spent_usd, 6),
            "projected_usd": round(self.projected_usd, 6),
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "cache_hits": self.cache_hits,
            "calls": self.calls,
        }
