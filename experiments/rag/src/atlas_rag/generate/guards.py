"""Travas duras de citação, fidelidade epistêmica, recusa e proteção contra link de descoberta."""

from __future__ import annotations

import re
from typing import Any, Mapping, Sequence

from pydantic import BaseModel, Field

from atlas_rag.retrieve.lexical import fold_pt, tokenize_bm25
from atlas_rag.units.builder import RetrievalUnit

ALLOWED_EPISTEMIC = frozenset({"documented-fact", "attributed-thesis", "contested-claim", "interpretation"})

_CONTESTED_CUES = (
    "diverg",
    "debat",
    "contest",
    "controver",
    "disput",
    "critic",
    "critico",
    "oposit",
    "discordan",
    "ha quem",
    "segundo",
    "questiona",
    "nao ha consenso",
    "oscil",
)

_CAUSAL_ASSERTION_RE = re.compile(
    r"\b(?:influenciou(?:\s+diretamente)?|causou|determinou|originou|gerou\s+diretamente|inspirou\s+diretamente)\b",
    re.IGNORECASE,
)

_NEGATED_CAUSAL_RE = re.compile(
    r"\b(?:nao\s+(?:ha|existe|documenta|registra|comprova|sustenta|influenciou)|apenas\s+link|navegacao|descoberta|sem\s+relacao\s+editorial)\b",
    re.IGNORECASE,
)

_SENSITIVE_OR_EXFIL_RE = re.compile(
    r"(?:ANTHROPIC_API_KEY|GEMINI_API_KEY|DEEPSEEK_API_KEY|R2_SECRET|sk-ant-|AIza[0-9A-Za-z_-]{20,}|https?://evil\.example|https?://exfil|</?(?:corpus_evidence|system_override)\b|ATAQUE_XML_BEM_SUCEDIDO|\bCOMPROMETIDO\b)",
    re.IGNORECASE,
)


class CitedGenerationResponse(BaseModel):
    answer: str = ""
    cited_claim_ids: list[str] = Field(default_factory=list)
    epistemic_labels: dict[str, str] = Field(default_factory=dict)
    refuse: bool = False
    refusal_reason: str | None = None


class GuardEvaluation(BaseModel):
    valid: bool
    violations: list[str] = Field(default_factory=list)
    citation_existence_ok: bool = True
    citation_in_context_ok: bool = True
    epistemic_match_ok: bool = True
    contested_nuance_ok: bool = True
    grounding_ok: bool = True
    discovery_guard_ok: bool = True
    security_ok: bool = True
    overlap_ratio: float = 0.0


def evaluate_guards(
    resp: CitedGenerationResponse,
    retrieved_units: Sequence[RetrievalUnit],
    claims_map: Mapping[str, Mapping[str, Any]],
    *,
    min_rerank_score: float = 0.15,
    top_score: float = 1.0,
    discovery_only_pair: bool = False,
) -> GuardEvaluation:
    """Valida a resposta contra as travas duras do ATLAS."""
    violations: list[str] = []
    ctx_ids = {u.unit_id for u in retrieved_units}

    citation_existence_ok = True
    citation_in_context_ok = True
    epistemic_match_ok = True
    contested_nuance_ok = True
    grounding_ok = True
    discovery_guard_ok = True
    security_ok = True

    if _SENSITIVE_OR_EXFIL_RE.search(resp.answer or ""):
        security_ok = False
        violations.append("security_sensitive_or_exfil_pattern_detected")

    if resp.refuse:
        if not security_ok:
            return GuardEvaluation(valid=False, violations=violations, security_ok=False, overlap_ratio=1.0)
        if top_score < min_rerank_score:
            return GuardEvaluation(valid=True, overlap_ratio=1.0)
        # Se recusou mas citou IDs inventados, ainda invalida
        for cid in resp.cited_claim_ids:
            if cid not in claims_map:
                citation_existence_ok = False
                violations.append(f"cited_nonexistent_id:{cid}")
        return GuardEvaluation(
            valid=citation_existence_ok,
            violations=violations,
            citation_existence_ok=citation_existence_ok,
            overlap_ratio=1.0,
        )

    # Caso refuse=False: precisa citar pelo menos 1 claim válido do contexto
    if not resp.cited_claim_ids:
        grounding_ok = False
        violations.append("missing_citations")

    cited_texts: list[str] = []
    has_contested = False

    for cid in resp.cited_claim_ids:
        if cid not in claims_map:
            citation_existence_ok = False
            violations.append(f"cited_nonexistent_id:{cid}")
            continue
        if cid not in ctx_ids:
            citation_in_context_ok = False
            violations.append(f"cited_unretrieved_id:{cid}")
        actual_cls = str(claims_map[cid].get("classification") or "")
        declared_cls = resp.epistemic_labels.get(cid)
        if declared_cls != actual_cls or actual_cls not in ALLOWED_EPISTEMIC:
            epistemic_match_ok = False
            violations.append(f"epistemic_mismatch:{cid}:expected={actual_cls}:got={declared_cls}")
        if actual_cls == "contested-claim":
            has_contested = True
        cited_texts.append(str(claims_map[cid].get("text") or ""))

    folded_ans = fold_pt(resp.answer)
    if has_contested:
        if not any(cue in folded_ans for cue in _CONTESTED_CUES):
            contested_nuance_ok = False
            violations.append("contested_claim_without_dissent_marker")

    if top_score < min_rerank_score:
        grounding_ok = False
        violations.append(f"below_min_rerank_score:{top_score:.4f}")

    if discovery_only_pair:
        # Só link de descoberta -> não pode afirmar relação causal/influência sem negar explicitamente
        if _CAUSAL_ASSERTION_RE.search(folded_ans) and not _NEGATED_CAUSAL_RE.search(folded_ans):
            discovery_guard_ok = False
            violations.append("discovery_only_causal_assertion")
        elif not _NEGATED_CAUSAL_RE.search(folded_ans):
            discovery_guard_ok = False
            violations.append("discovery_only_must_refuse_influence")

    # Suporte lexical mínimo da resposta nas afirmações citadas
    ans_tokens = set(tokenize_bm25(resp.answer))
    ctx_tokens = set(tokenize_bm25(" ".join(cited_texts)))
    overlap_ratio = len(ans_tokens & ctx_tokens) / max(len(ans_tokens), 1) if ans_tokens else 0.0
    if cited_texts and ans_tokens and overlap_ratio < 0.25:
        grounding_ok = False
        violations.append(f"low_grounding_overlap:{overlap_ratio:.2f}")

    return GuardEvaluation(
        valid=len(violations) == 0,
        violations=violations,
        citation_existence_ok=citation_existence_ok,
        citation_in_context_ok=citation_in_context_ok,
        epistemic_match_ok=epistemic_match_ok,
        contested_nuance_ok=contested_nuance_ok,
        grounding_ok=grounding_ok,
        discovery_guard_ok=discovery_guard_ok,
        overlap_ratio=round(overlap_ratio, 4),
    )


def apply_guard_fallback(
    resp: CitedGenerationResponse,
    guard: GuardEvaluation,
) -> CitedGenerationResponse:
    """Se alguma trava dura falhar, invalida a afirmação não sustentada e converte em recusa explícita."""
    if guard.valid:
        return resp
    reason = "; ".join(guard.violations)
    return CitedGenerationResponse(
        answer="Recusa automática pelas travas de confiabilidade: as evidências recuperadas ou citações não sustentam a resposta sem extrapolar o acervo.",
        cited_claim_ids=[],
        epistemic_labels={},
        refuse=True,
        refusal_reason=f"guard_blocked:{reason}",
    )
