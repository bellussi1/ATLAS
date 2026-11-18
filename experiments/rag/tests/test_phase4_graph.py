"""Testes da Fase 4: expansão consciente do grafo editorial vs descoberta."""

from __future__ import annotations

import json

from atlas_rag.paths import eval_dir
from atlas_rag.retrieve.graph_expand import GraphExpander
from atlas_rag.retrieve.lexical import ScoredHit
from atlas_rag.units.builder import RetrievalUnit


def _unit(uid: str, eid: str, title: str, text: str) -> RetrievalUnit:
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
        classification="documented-fact",
        editorial_status="pending",
        citation_ids=[],
        evidence_ids=[],
        source_ids=[],
        source_titles=[],
        source_urls=[],
        locators=[],
        aliases=[],
    )


def test_graph_expander_respects_editorial_vs_discovery_tier() -> None:
    units = [
        _unit("c-locke", "e-locke", "John Locke", "Locke defendeu o consentimento e empirismo."),
        _unit("c-jefferson", "e-jefferson", "Thomas Jefferson", "Jefferson redigiu a declaração de independência."),
        _unit("c-smith", "e-smith", "Adam Smith", "Smith publicou A Riqueza das Nações."),
    ]
    relations = {
        "r-ed": {"id": "r-ed", "fromEntityId": "e-locke", "toEntityId": "e-jefferson", "type": "influenced", "context": "Locke influenciou Jefferson"},
        "r-disc": {"id": "r-disc", "fromEntityId": "e-locke", "toEntityId": "e-smith", "type": "encyclopedic-link", "context": ""},
    }
    exp = GraphExpander(units, relations)
    base = [ScoredHit("c-locke", 0.9, "e-locke", "claim")]

    ed_hits = exp.expand("Quem Locke influenciou sobre independência?", base, mode="editorial_only", top_k=5)
    ed_ids = [h.unit_id for h in ed_hits]
    assert "c-jefferson" in ed_ids
    assert "c-smith" not in ed_ids

    full_hits = exp.expand("Locke e Smith", base, mode="full_with_low_discovery", discovery_weight=0.15, top_k=5)
    smith_hit = next(h for h in full_hits if h.unit_id == "c-smith")
    assert smith_hit.via_discovery_only is True
    assert smith_hit.score < 0.25


def test_phase4_ablation_metrics_artifact() -> None:
    data = json.loads((eval_dir() / "runs" / "phase4_graph" / "metrics.json").read_text(encoding="utf-8"))
    v = data["variants"]
    assert v["hybrid_rerank__editorial_only"]["multi_hop"]["recall_10"]["mean"] > v["hybrid_rerank__no_graph"]["multi_hop"]["recall_10"]["mean"]
    assert v["hybrid_rrf__editorial_only"]["multi_hop"]["recall_5"]["mean"] > v["hybrid_rrf__no_graph"]["multi_hop"]["recall_5"]["mean"]
    assert v["hybrid_rerank__editorial_only"]["discovery_link_audit"]["guarded_false_influence_assertion_rate"] == 0.0
