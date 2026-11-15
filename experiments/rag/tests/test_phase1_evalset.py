"""Testes de integridade do conjunto de avaliação (Fase 1)."""

from __future__ import annotations

import json

from atlas_rag.eval.dataset import (
    EXPECTED_COUNTS,
    _build_question_specs,
    load_questions,
    validate_specs,
)
from atlas_rag.ingest.bundle import load_pinned_bundle
from atlas_rag.paths import eval_dir
from atlas_rag.units.builder import extract_deduplicated_corpus

REQUIRED_KEYS = {
    "id",
    "split",
    "type",
    "question",
    "gold_unit_ids",
    "must_refuse",
    "expected_epistemic",
    "human_ok",
    "origin",
}


def test_questions_jsonl_schema_and_stratification() -> None:
    rows = load_questions()
    assert len(rows) == 100
    assert sum(1 for r in rows if r["split"] == "dev") == 70
    assert sum(1 for r in rows if r["split"] == "test") == 30

    for row in rows:
        assert set(row.keys()) == REQUIRED_KEYS
        assert row["human_ok"] is None, "IA não pode marcar human_ok como true"

    for qtype, (exp_dev, exp_test) in EXPECTED_COUNTS.items():
        subset = [r for r in rows if r["type"] == qtype]
        assert sum(1 for r in subset if r["split"] == "dev") == exp_dev
        assert sum(1 for r in subset if r["split"] == "test") == exp_test


def test_questions_validated_against_pinned_bundle() -> None:
    corpus = extract_deduplicated_corpus(load_pinned_bundle())
    stats = validate_specs(_build_question_specs(), corpus)
    assert stats["total"] == 100
    assert stats["human_ok_true_count"] == 0
    assert stats["human_ok_null_count"] == 100
    assert stats["reused_from_gold_set_count"] >= 10


def test_review_queue_and_context_files_exist() -> None:
    edir = eval_dir()
    ctx = json.loads((edir / "labels" / "questions-context.json").read_text(encoding="utf-8"))
    assert ctx["summary"]["total"] == 100
    assert len(ctx["items"]) == 100
    md = (edir / "labels" / "review-queue.md").read_text(encoding="utf-8")
    assert "`q-fac-001`" in md
    assert "`q-oov-014`" in md
