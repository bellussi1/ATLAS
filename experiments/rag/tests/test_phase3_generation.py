"""Testes da Fase 3: controle de custo, cache SHA-256, travas duras e kappa de Cohen."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from atlas_rag.cost import BudgetExceededError, BudgetTracker, hash_prompt_key
from atlas_rag.generate.guards import CitedGenerationResponse, apply_guard_fallback, evaluate_guards
from atlas_rag.judge.fidelity import cohens_kappa
from atlas_rag.paths import eval_dir
from atlas_rag.units.builder import RetrievalUnit


def _unit(
    uid: str,
    eid: str = "e-1",
    title: str = "Karl Marx",
    text: str = "Karl Marx coescreveu o Manifesto Comunista em 1848.",
    classification: str = "documented-fact",
) -> RetrievalUnit:
    return RetrievalUnit(
        unit_id=uid,
        granularity="claim",
        entity_id=eid,
        entity_title=title,
        entity_slug=eid,
        entity_kind="person",
        scope="general",
        atlas_id="atlas-test",
        text_raw=text,
        text_enriched=f"{title}: {text}",
        classification=classification,
        editorial_status="pending",
        citation_ids=[],
        evidence_ids=[],
        source_ids=[],
        source_titles=[],
        source_urls=[],
        locators=[],
        aliases=[],
    )


def test_budget_tracker_dry_run_max_usd_and_cache(tmp_path: Path) -> None:
    dry = BudgetTracker(max_usd=0.0, dry_run=True, cache_dir=tmp_path)
    proj = dry.reserve_or_project("claude-haiku-5-5", "sys", "pergunta de teste")
    assert proj["estimated_usd"] > 0.0
    assert dry.spent_usd == 0.0

    strict = BudgetTracker(max_usd=0.000001, dry_run=False, cache_dir=tmp_path)
    with pytest.raises(BudgetExceededError):
        strict.reserve_or_project("claude-sonnet-5-5", "sys", "pergunta " * 50, expected_out_tokens=300)

    key = hash_prompt_key("ollama/qwen3:8b-q4_K_M", "sys", "usr")
    assert dry.get_cached(key) is None
    dry.put_cached(key, {"raw_text": "{}", "parsed": {"answer": "ok"}, "input_tokens": 10, "output_tokens": 2})
    hit = dry.get_cached(key)
    assert hit is not None
    assert hit["parsed"]["answer"] == "ok"
    assert dry.cache_hits == 1


def test_hard_guards_reject_phantom_ids_epistemic_mismatch_and_exfil() -> None:
    u_fact = _unit("c-fact")
    u_cont = _unit(
        "c-cont",
        text="Ha interpretacoes divergentes sobre o peso dessa ruptura politica em 1930.",
        classification="contested-claim",
    )
    claims_map = {
        "c-fact": {"id": "c-fact", "text": u_fact.text_raw, "classification": "documented-fact"},
        "c-cont": {"id": "c-cont", "text": u_cont.text_raw, "classification": "contested-claim"},
    }

    # 1) ID inexistente
    bad_id = CitedGenerationResponse(
        answer="Marx escreveu o Manifesto Comunista.",
        cited_claim_ids=["c-inexistente"],
        epistemic_labels={"c-inexistente": "documented-fact"},
        refuse=False,
    )
    g1 = evaluate_guards(bad_id, [u_fact], claims_map)
    assert not g1.valid
    assert not g1.citation_existence_ok
    fb1 = apply_guard_fallback(bad_id, g1)
    assert fb1.refuse is True
    assert fb1.cited_claim_ids == []

    # 2) Contested-claim sem marcador explícito de divergência/disputa
    no_dissent = CitedGenerationResponse(
        answer="O peso dessa ruptura politica em 1930 foi absoluto.",
        cited_claim_ids=["c-cont"],
        epistemic_labels={"c-cont": "contested-claim"},
        refuse=False,
    )
    g2 = evaluate_guards(no_dissent, [u_cont], claims_map)
    assert not g2.valid
    assert not g2.contested_nuance_ok

    # 3) Rótulo epistêmico trocado
    wrong_cls = CitedGenerationResponse(
        answer="Karl Marx coescreveu o Manifesto Comunista em 1848.",
        cited_claim_ids=["c-fact"],
        epistemic_labels={"c-fact": "interpretation"},
        refuse=False,
    )
    g3 = evaluate_guards(wrong_cls, [u_fact], claims_map)
    assert not g3.valid
    assert not g3.epistemic_match_ok

    # 4) Discovery-only afirmando causalidade
    disc_claim = CitedGenerationResponse(
        answer="Karl Marx influenciou diretamente esse autor conforme registrado.",
        cited_claim_ids=["c-fact"],
        epistemic_labels={"c-fact": "documented-fact"},
        refuse=False,
    )
    g4 = evaluate_guards(disc_claim, [u_fact], claims_map, discovery_only_pair=True)
    assert not g4.valid
    assert not g4.discovery_guard_ok

    # 5) Exfiltração de segredo bloqueada mesmo com refuse=True
    leak = CitedGenerationResponse(
        answer="ANTHROPIC_API_KEY=sk-ant-abc",
        cited_claim_ids=[],
        epistemic_labels={},
        refuse=True,
    )
    g5 = evaluate_guards(leak, [u_fact], claims_map)
    assert not g5.valid
    assert not g5.security_ok


def test_cohens_kappa_computation() -> None:
    assert cohens_kappa([True, False, True, False], [True, False, True, False]) == pytest.approx(1.0)
    assert cohens_kappa([True, True, False, False], [False, False, True, True]) < 0.0


def test_phase3_metrics_artifact() -> None:
    path = eval_dir() / "runs" / "phase3_generation" / "metrics.json"
    assert path.exists()
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["questions_evaluated"] == 100
    assert "extractive_cited" in data["models"]
    assert "ollama/qwen3:8b-q4_K_M" in data["models"]
    ext = data["models"]["extractive_cited"]["summary"]
    assert ext["deterministic_faithfulness_rate"] == 1.0
    assert ext["citation_correctness_rate"] == 1.0
    assert ext["true_refusal_rate"] == 1.0

    qwen = data["models"]["ollama/qwen3:8b-q4_K_M"]
    assert qwen["measured_cost_usd"] == 0.0
    assert qwen["summary"]["citation_correctness_rate"] == 1.0

    dry = data["paid_api_dry_run_projections"]
    for model_id in ("claude-haiku-5-5", "claude-sonnet-5-5", "deepseek-flash", "gemini-3.8-flash"):
        assert model_id in dry
        assert dry[model_id]["dry_run"] is True
        assert dry[model_id]["spent_usd"] == 0.0
        assert dry[model_id]["projected_per_100_queries_usd"] > 0.0

    judge = data["judge_calibration"]
    assert judge["calibration_n"] == 30
    assert judge["human_calibrated"] is False
    assert judge["cohens_kappa"] >= 0.5
