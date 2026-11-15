"""Testes da Seção 6 (mineração de filas de expansão do acervo com ok: null)."""

from __future__ import annotations

import json

from atlas_rag.mining.acervo_miner import (
    MIN_QUOTE_CHARS,
    MIN_QUOTE_WORDS,
    _infer_relation_type,
    _is_non_trivial_alias_pair,
)
from atlas_rag.paths import eval_dir


def test_infer_relation_type_classification() -> None:
    assert _infer_relation_type("Bernstein criticou o determinismo econômico de Marx.")[0] == "reacted_against"
    assert _infer_relation_type("Locke influenciou fortemente o pensamento político de Jefferson.")[0] == "influenced"
    assert _infer_relation_type("Engels escreveu a introdução do segundo volume da obra.")[0] == "wrote"
    assert _infer_relation_type("Lassalle fundou a Associação Geral dos Trabalhadores Alemães.")[0] == "participated_in"
    assert _infer_relation_type("O tratado menciona o Parlamento britânico em 1689.")[0] == "documented-association"


def test_alias_pair_detector_distinguishes_overlap() -> None:
    assert _is_non_trivial_alias_pair("Partido Trabalhista Brasileiro", "Partido Trabalhista Brasileiro (1945)") is True
    assert _is_non_trivial_alias_pair("Karl Marx", "Adam Smith") is False
    assert MIN_QUOTE_CHARS == 20
    assert MIN_QUOTE_WORDS == 3


def test_phase6_mining_queues_and_human_ok_null_policy() -> None:
    qdir = eval_dir() / "queues"
    expected_files = (
        "relacoes-candidatas.json",
        "debates-e-contradicoes.json",
        "deduplicacao-entidades.json",
        "lacunas-cobertura.json",
    )
    for fname in expected_files:
        assert (qdir / fname).exists(), f"Fila ausente: {fname}"

    rel_queue = json.loads((qdir / "relacoes-candidatas.json").read_text(encoding="utf-8"))
    assert len(rel_queue) >= 40
    for item in rel_queue:
        assert item["ok"] is None
        assert item["review"]["by"] == "ai"
        assert item["review"]["verdict"] == "pending-human"
        quote = item["literal_quote"]
        assert len(quote) >= MIN_QUOTE_CHARS
        assert len(quote.split()) >= MIN_QUOTE_WORDS

    debates = json.loads((qdir / "debates-e-contradicoes.json").read_text(encoding="utf-8"))
    assert len(debates) >= 10
    assert all(d["ok"] is None for d in debates)

    dedup = json.loads((qdir / "deduplicacao-entidades.json").read_text(encoding="utf-8"))
    assert len(dedup) >= 1
    assert all(d["ok"] is None for d in dedup)

    summary_path = eval_dir() / "runs" / "phase6_mining.json"
    assert summary_path.exists()
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    assert summary["all_ok_null"] is True
