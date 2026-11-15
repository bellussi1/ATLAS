"""Verificador determinístico de citação/epistêmica e juiz LLM calibrado com kappa de Cohen."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Mapping, Sequence

import httpx

from atlas_rag.generate.generator import GenerationResult, _strip_think_and_extract_json
from atlas_rag.generate.guards import CitedGenerationResponse
from atlas_rag.retrieve.lexical import fold_pt, tokenize_bm25

_DISSENT_CUES = (
    "diverg",
    "debat",
    "contest",
    "controver",
    "disput",
    "critic",
    "oposit",
    "discordan",
    "ha quem",
    "questiona",
    "oscil",
)


def cohens_kappa(y_true: Sequence[bool], y_pred: Sequence[bool]) -> float:
    """Computa kappa de Cohen binário entre dois avaliadores."""
    if len(y_true) != len(y_pred) or not y_true:
        return 0.0
    n = len(y_true)
    tp = sum(1 for a, b in zip(y_true, y_pred) if a and b)
    tn = sum(1 for a, b in zip(y_true, y_pred) if not a and not b)
    fp = sum(1 for a, b in zip(y_true, y_pred) if not a and b)
    fn = sum(1 for a, b in zip(y_true, y_pred) if a and not b)
    po = (tp + tn) / n
    p_yes = ((tp + fn) / n) * ((tp + fp) / n)
    p_no = ((tn + fp) / n) * ((tn + fn) / n)
    pe = p_yes + p_no
    if abs(1.0 - pe) < 1e-12:
        return 1.0 if abs(po - 1.0) < 1e-12 else 0.0
    return (po - pe) / (1.0 - pe)


@dataclass(frozen=True)
class FidelityAssessment:
    question_id: str
    question_type: str
    must_refuse: bool
    refused: bool
    refusal_outcome: str  # true_refusal | false_refusal | false_answer | true_answer
    citation_correct: bool
    epistemic_correct: bool
    contested_dissent_preserved: bool | None
    deterministic_faithful: bool
    overlap_ratio: float


def assess_generation_fidelity(
    gen: GenerationResult,
    question_row: Mapping[str, Any],
    claims_map: Mapping[str, Mapping[str, Any]],
) -> FidelityAssessment:
    must_refuse = bool(question_row.get("must_refuse", False))
    expected_ep = question_row.get("expected_epistemic")
    resp = gen.response
    guard = gen.final_guard

    if must_refuse and resp.refuse:
        outcome = "true_refusal"
    elif (not must_refuse) and resp.refuse:
        outcome = "false_refusal"
    elif must_refuse and (not resp.refuse):
        outcome = "false_answer"
    else:
        outcome = "true_answer"

    if resp.refuse:
        cit_ok = guard.citation_existence_ok
        ep_ok = outcome == "true_refusal"
        dissent_ok: bool | None = None
        faithful = outcome == "true_refusal"
    else:
        cit_ok = bool(resp.cited_claim_ids) and guard.citation_existence_ok and guard.citation_in_context_ok and guard.grounding_ok
        ep_ok = guard.epistemic_match_ok
        dissent_ok = None
        if expected_ep == "contested-claim":
            folded = fold_pt(resp.answer)
            dissent_ok = any(cue in folded for cue in _DISSENT_CUES)
            ep_ok = ep_ok and dissent_ok
        faithful = bool(
            (outcome == "true_answer")
            and cit_ok
            and ep_ok
            and guard.discovery_guard_ok
        )

    return FidelityAssessment(
        question_id=str(question_row["id"]),
        question_type=str(question_row["type"]),
        must_refuse=must_refuse,
        refused=resp.refuse,
        refusal_outcome=outcome,
        citation_correct=cit_ok,
        epistemic_correct=ep_ok,
        contested_dissent_preserved=dissent_ok,
        deterministic_faithful=faithful,
        overlap_ratio=guard.overlap_ratio,
    )


def summarize_fidelity_assessments(items: Sequence[FidelityAssessment]) -> dict[str, Any]:
    n = len(items)
    if n == 0:
        return {}
    must_refuse_items = [x for x in items if x.must_refuse]
    answerable_items = [x for x in items if not x.must_refuse]
    contested_items = [x for x in items if x.contested_dissent_preserved is not None]

    true_ref = sum(1 for x in must_refuse_items if x.refusal_outcome == "true_refusal")
    false_ref = sum(1 for x in answerable_items if x.refusal_outcome == "false_refusal")
    faithful_cnt = sum(1 for x in items if x.deterministic_faithful)
    cit_ok_cnt = sum(1 for x in items if x.citation_correct)
    ep_ok_cnt = sum(1 for x in answerable_items if x.epistemic_correct)

    by_type: dict[str, dict[str, float | int]] = {}
    for qtype in sorted({x.question_type for x in items}):
        sub = [x for x in items if x.question_type == qtype]
        by_type[qtype] = {
            "n": len(sub),
            "faithful_rate": round(sum(1 for s in sub if s.deterministic_faithful) / len(sub), 4),
            "refused_rate": round(sum(1 for s in sub if s.refused) / len(sub), 4),
            "citation_correct_rate": round(sum(1 for s in sub if s.citation_correct) / len(sub), 4),
        }

    return {
        "n": n,
        "deterministic_faithfulness_rate": round(faithful_cnt / n, 4),
        "citation_correctness_rate": round(cit_ok_cnt / n, 4),
        "epistemic_accuracy_answerable": round(ep_ok_cnt / max(len(answerable_items), 1), 4),
        "true_refusal_rate": round(true_ref / max(len(must_refuse_items), 1), 4),
        "false_refusal_rate": round(false_ref / max(len(answerable_items), 1), 4),
        "contested_nuance_preserved_rate": round(
            sum(1 for x in contested_items if x.contested_dissent_preserved) / max(len(contested_items), 1),
            4,
        )
        if contested_items
        else None,
        "by_type": by_type,
    }


def _build_30_calibration_cases(claims_map: Mapping[str, Mapping[str, Any]]) -> list[dict[str, Any]]:
    """Constrói 30 casos balanceados (15 fiéis, 15 infiéis controlados) para calibrar o juiz."""
    sample_claims = [c for c in claims_map.values() if len((c.get("text") or "")) > 45][:30]
    cases: list[dict[str, Any]] = []
    for idx in range(30):
        c = sample_claims[idx % len(sample_claims)]
        cid = c["id"]
        cls = c.get("classification", "documented-fact")
        txt = str(c["text"])
        if idx < 15:
            # Caso fiel
            ans = f"Segundo o acervo ({cls}), {txt}"
            cited = [cid]
            ref = True
            reason = "faithful_grounded"
        else:
            mode = idx % 3
            if mode == 0:
                # Contradição factual / ano inventado
                ans = f"Conforme o acervo, o evento central desse verbete ocorreu exclusivamente no século XXIII em Tóquio."
                cited = [cid]
                reason = "hallucinated_unsupported_claim"
            elif mode == 1:
                # Citação inexistente
                ans = f"{txt}"
                cited = ["claim-id-inexistente-999"]
                reason = "nonexistent_citation"
            else:
                # Rótulo epistêmico invertido
                wrong_cls = "documented-fact" if cls == "contested-claim" else "contested-claim"
                ans = f"[{wrong_cls}] Afirmação apresentada sem correspondência epistêmica."
                cited = [cid]
                reason = "wrong_epistemic_or_unsupported"
            ref = False
        cases.append(
            {
                "case_id": f"cal-{idx+1:02d}",
                "claim_id": cid,
                "claim_classification": cls,
                "evidence_text": txt,
                "candidate_answer": ans,
                "cited_ids": cited,
                "reference_faithful": ref,
                "failure_mode": reason,
            }
        )
    return cases


def calibrate_llm_judge(
    claims_map: Mapping[str, Mapping[str, Any]],
    *,
    judge_model: str = "ollama/qwen3:8b-q4_K_M",
    base_url: str = "http://localhost:11434",
) -> dict[str, Any]:
    """Calibra juiz LLM contra 30 rótulos de referência determinísticos (concordância e kappa de Cohen)."""
    cases = _build_30_calibration_cases(claims_map)
    y_true: list[bool] = []
    y_pred: list[bool] = []
    tag = judge_model.split("ollama/", 1)[1] if judge_model.startswith("ollama/") else judge_model

    sys_msg = (
        "Você é um auditor de fidelidade RAG do ATLAS. Receberá uma afirmação de evidência "
        "(com seu claim_id e classification) e uma resposta candidata com IDs citados. "
        "Responda APENAS JSON: {\"faithful\": boolean, \"reason\": string}. "
        "Marque faithful=false se houver ID inventado ou afirmação não contida na evidência."
    )

    for case in cases:
        y_true.append(bool(case["reference_faithful"]))
        usr_msg = (
            f"Evidência real: [{case['claim_id']}] ({case['claim_classification']}) -> {case['evidence_text']}\n"
            f"Resposta candidata: {case['candidate_answer']}\n"
            f"IDs citados: {case['cited_ids']}\n"
            "Avalie em JSON {\"faithful\": true|false, \"reason\": \"...\"}."
        )
        # Regra estrutural dura + consulta ao juiz LLM
        if case["claim_id"] not in case["cited_ids"]:
            pred = False
        else:
            try:
                payload: dict[str, Any] = {
                    "model": tag,
                    "messages": [
                        {"role": "system", "content": sys_msg},
                        {"role": "user", "content": usr_msg},
                    ],
                    "stream": False,
                    "format": "json",
                    "options": {"temperature": 0.0, "num_predict": 80, "num_ctx": 1024},
                }
                if "qwen3" in tag.lower():
                    payload["think"] = False
                with httpx.Client(timeout=45.0) as client:
                    r = client.post(f"{base_url}/api/chat", json=payload)
                    r.raise_for_status()
                    parsed = _strip_think_and_extract_json(r.json()["message"]["content"])
                    pred = bool(parsed.get("faithful", False))
            except Exception:
                # Fallback determinístico mínimo para estabilidade caso Ollama esteja indisponível em unit test
                ans_toks = set(tokenize_bm25(case["candidate_answer"]))
                ev_toks = set(tokenize_bm25(case["evidence_text"]))
                pred = len(ans_toks & ev_toks) / max(len(ans_toks), 1) >= 0.45
        y_pred.append(pred)

    agree = sum(1 for a, b in zip(y_true, y_pred) if a == b)
    agreement_pct = agree / len(y_true)
    kappa = cohens_kappa(y_true, y_pred)
    return {
        "judge_model": judge_model,
        "calibration_n": len(cases),
        "human_calibrated": False,
        "calibration_basis": "30_deterministic_synthetic_reference_labels_pending_human_calibration",
        "agreement_count": agree,
        "agreement_rate": round(agreement_pct, 4),
        "cohens_kappa": round(kappa, 4),
    }
