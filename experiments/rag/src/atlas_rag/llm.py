"""Cliente mínimo para Ollama local, compartilhado pelas etapas de rascunho.

Sem dependência de acelerador: qualquer módulo que já subiu `BAAI/bge-m3` pode
liberar a GPU com `unload_ollama_gpu` e chamar o modelo textual depois.
"""

from __future__ import annotations

import json
import re
from typing import Any

import httpx

DEFAULT_OLLAMA_URL = "http://localhost:11434"
DEFAULT_DRAFT_MODEL = "qwen3:8b-q4_K_M"


def strip_think_and_fences(raw: str) -> str:
    """Remove bloco de raciocínio do qwen3 e cercas Markdown antes do JSON."""
    text = re.sub(r"<think>[\s\S]*?</think>", "", raw or "", flags=re.IGNORECASE).strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, flags=re.IGNORECASE)
    if fence:
        text = fence.group(1).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        return text[start : end + 1]
    return text


def call_ollama_json(
    prompt: str,
    *,
    model: str,
    base_url: str = DEFAULT_OLLAMA_URL,
    timeout: float = 180.0,
    temperature: float = 0.2,
    num_ctx: int = 8192,
) -> dict[str, Any]:
    """Chama `/api/generate` com `format=json` e devolve o objeto analisado."""
    with httpx.Client(timeout=timeout) as client:
        response = client.post(
            f"{base_url}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {"temperature": temperature, "num_ctx": num_ctx},
            },
        )
        response.raise_for_status()
        raw = response.json().get("response", "")
    return json.loads(strip_think_and_fences(raw))
