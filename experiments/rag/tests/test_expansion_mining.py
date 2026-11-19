"""Testes das camadas de cruzamento: lacunas do grafo, pares e rascunhos."""

from __future__ import annotations

import numpy as np

from atlas_rag.index.vector_store import LocalVectorIndex
from atlas_rag.ingest.claim_expansion import is_duplicate_claim, validate_claims
from atlas_rag.ingest.relation_drafts import validate_relation_proposal
from atlas_rag.mining.graph_gaps import (
    collect_graph_state,
    gap_reasons,
    gap_score,
    infer_domain,
)
from atlas_rag.mining.relation_candidates import (
    build_relation_pattern_queue,
    entity_vectors,
    rank_entity_pairs,
)
from atlas_rag.units.builder import RetrievalUnit


def _unit(unit_id: str, entity_id: str, title: str, text: str, url: str = "") -> RetrievalUnit:
    return RetrievalUnit(
        unit_id=unit_id,
        granularity="claim",
        entity_id=entity_id,
        entity_title=title,
        entity_slug=entity_id,
        entity_kind="concept",
        scope="nucleo",
        atlas_id="atlas-teste",
        text_raw=text,
        text_enriched=f"[{title}] {text}",
        classification="documented-fact",
        editorial_status="pending",
        source_ids=(),
        source_titles=(),
        source_urls=(url,) if url else (),
        locators=(),
        aliases=(),
        metadata={},
    )


def _bundle() -> dict:
    return {
        "graph": {
            "atlases": [
                {
                    "id": "atlas-a",
                    "slug": "historia-brasil",
                    "entities": [
                        {
                            "id": "person-a",
                            "slug": "a",
                            "title": "Pessoa A",
                            "kind": "person",
                            "summary": "Uma pessoa brasileira com resumo suficiente para pontuar.",
                            "aliases": ["A"],
                        },
                        {
                            "id": "concept-b",
                            "slug": "b",
                            "title": "Conceito B",
                            "kind": "concept",
                            "summary": "Conceito sem relação.",
                        },
                    ],
                    "relations": [
                        {
                            "id": "r1",
                            "fromEntityId": "person-a",
                            "toEntityId": "institution-c",
                            "type": "documented-association",
                            "label": "presidiu",
                        }
                    ],
                    "claims": [
                        {
                            "id": "c1",
                            "entityId": "person-a",
                            "text": "Afirmação com fonte.",
                            "classification": "documented-fact",
                            "citationIds": ["cit1"],
                        }
                    ],
                    "citations": [{"id": "cit1", "evidenceId": "ev1", "relation": "supports"}],
                    "evidences": [{"id": "ev1", "sourceId": "src1", "locator": "x"}],
                    "sources": [{"id": "src1", "title": "Fonte", "url": "https://example.org/fonte"}],
                },
                {
                    "id": "atlas-b",
                    "slug": "marxismo",
                    "entities": [
                        {
                            "id": "person-a",
                            "slug": "a",
                            "title": "Pessoa A",
                            "kind": "person",
                            "summary": "Duplicada entre coleções.",
                        },
                        {
                            "id": "institution-c",
                            "slug": "c",
                            "title": "Instituição C",
                            "kind": "institution",
                            "summary": "Instituição com uma relação.",
                        },
                    ],
                    "relations": [],
                    "claims": [],
                    "citations": [],
                    "evidences": [],
                    "sources": [],
                },
            ]
        }
    }


def test_collect_graph_state_merges_atlases_and_counts_evidence() -> None:
    state = collect_graph_state(_bundle())
    assert state["atlases"] == 2
    assert set(state["entities"]) == {"person-a", "concept-b", "institution-c"}
    person = state["entities"]["person-a"]
    assert person["atlasSlugs"] == ["historia-brasil", "marxismo"]
    assert person["degree"] == 1
    assert person["claims"] == 1
    assert person["sources"] == 1
    assert ("institution-c", "person-a") in state["relationPairs"]


def test_gap_reasons_and_score_prioritize_missing_evidence() -> None:
    empty = {
        "id": "concept-x",
        "title": "Mais-valia",
        "summary": "Conceito central da economia política marxista, com resumo longo o suficiente.",
        "kind": "concept",
        "atlasSlugs": ["marxismo"],
        "degree": 0,
        "claims": 0,
        "sources": 0,
    }
    reasons = gap_reasons(empty)
    assert "sem_relacao" in reasons
    assert "sem_afirmacao" in reasons
    assert "sem_fonte" in reasons
    assert infer_domain(empty) == "filosofia-politica"
    assert gap_score(empty, reasons) >= 70


def test_entity_vectors_and_pair_ranking_skip_existing_and_same_title() -> None:
    units = [
        _unit("u1", "a", "Alfa", "primeira afirmação"),
        _unit("u2", "a", "Alfa", "segunda afirmação"),
        _unit("u3", "b", "Beta", "primeira afirmação"),
        _unit("u4", "b", "Beta", "segunda afirmação"),
        _unit("u5", "c", "Alfa", "outra afirmação"),
        _unit("u6", "c", "Alfa", "mais uma afirmação"),
    ]
    vectors = np.array(
        [[1, 0], [1, 0], [0.9, 0.1], [0.9, 0.1], [0, 1], [0, 1]],
        dtype=np.float32,
    )
    vectors /= np.linalg.norm(vectors, axis=1, keepdims=True)
    index = LocalVectorIndex(name="t", vectors=vectors, units=units, manifest={})

    ids, matrix, meta = entity_vectors(index, min_claims=2)
    assert ids == ["a", "b", "c"]
    assert matrix.shape == (3, 2)
    assert meta["a"]["title"] == "Alfa"

    pairs = rank_entity_pairs(
        ids,
        matrix,
        titles={key: value["title"] for key, value in meta.items()},
        top_k=2,
        threshold=0.5,
    )
    # a-b são próximos; c tem o mesmo título de a e deve ser descartado.
    assert len(pairs) == 1
    assert (pairs[0]["a"], pairs[0]["b"]) == ("a", "b")
    assert pairs[0]["score"] > 0.9

    skipped = rank_entity_pairs(
        ids,
        matrix,
        existing_pairs={("a", "b")},
        titles={key: value["title"] for key, value in meta.items()},
        top_k=2,
        threshold=0.5,
    )
    assert skipped == []


def test_relation_proposal_requires_allowed_url_and_family() -> None:
    unit_by_url = {
        "https://example.org/fonte": {
            "title": "Fonte",
            "section": "Seção",
            "license": "CC BY-SA 4.0",
            "usagePolicy": "open-reuse",
            "text": "Alfa influenciou Beta no debate sobre o Estado e a soberania popular.",
        }
    }
    valid = {
        "relation": {
            "family": "Influência",
            "label": "influenciou",
            "direction": "a->b",
            "claim": "Alfa influenciou Beta no debate sobre o Estado.",
            "quote": "Alfa influenciou Beta no debate sobre o Estado e a soberania popular.",
            "classification": "documented-fact",
            "source_url": "https://example.org/fonte",
        }
    }
    result = validate_relation_proposal(
        valid,
        allowed_urls={"https://example.org/fonte"},
        unit_by_url=unit_by_url,
        entity_terms_a=["Alfa"],
        entity_terms_b=["Beta"],
    )
    assert result is not None
    assert result["license"] == "CC BY-SA 4.0"

    # Criação de país por pessoa é combinação impossível no contrato atual.
    assert (
        validate_relation_proposal(
            {"relation": {**valid["relation"], "family": "Criação"}},
            allowed_urls={"https://example.org/fonte"},
            unit_by_url=unit_by_url,
            entity_terms_a=["Alfa"],
            entity_terms_b=["Beta"],
            from_kind="person",
            to_kind="place",
        )
        is None
    )

    # A citação precisa nomear os dois lados; não basta a URL ser válida.
    assert (
        validate_relation_proposal(
            valid,
            allowed_urls={"https://example.org/fonte"},
            unit_by_url=unit_by_url,
            entity_terms_a=["Alfa"],
            entity_terms_b=["Gama"],
        )
        is None
    )

    bad_url = {"relation": {**valid["relation"], "source_url": "https://fake.example/x"}}
    assert (
        validate_relation_proposal(
            bad_url, allowed_urls={"https://example.org/fonte"}, unit_by_url=unit_by_url
        )
        is None
    )
    bad_family = {"relation": {**valid["relation"], "family": "Parentesco"}}
    assert (
        validate_relation_proposal(
            bad_family, allowed_urls={"https://example.org/fonte"}, unit_by_url=unit_by_url
        )
        is None
    )


def test_claim_expansion_drops_duplicates_and_ungrounded_sources() -> None:
    existing = ["A Revolução Russa ocorreu em 1917 e transformou o Estado."]
    assert is_duplicate_claim("A Revolução Russa ocorreu em 1917 e transformou o Estado.", existing)
    assert not is_duplicate_claim("O Soviete de Petrogrado organizou a defesa da cidade.", existing)

    parsed = {
        "claims": [
            {
                "text": "O Soviete de Petrogrado organizou a defesa da cidade durante a revolução.",
                "quote": "O Soviete de Petrogrado organizou a defesa da cidade durante a revolução.",
                "classification": "documented-fact",
                "source_url": "https://example.org/fonte",
            },
            {
                "text": "A Revolução Russa ocorreu em 1917 e transformou o Estado.",
                "quote": "A Revolução Russa ocorreu em 1917 e transformou o Estado.",
                "classification": "documented-fact",
                "source_url": "https://example.org/fonte",
            },
            {
                "text": "Uma afirmação inventada sem fonte que não deveria passar daqui.",
                "quote": "Uma afirmação inventada sem fonte que não deveria passar daqui.",
                "classification": "documented-fact",
                "source_url": "https://fake.example/x",
            },
        ]
    }
    accepted, dropped = validate_claims(
        parsed,
        allowed_urls={"https://example.org/fonte"},
        unit_by_url={
            "https://example.org/fonte": {
                "title": "Fonte",
                "section": "Seção",
                "text": "O Soviete de Petrogrado organizou a defesa da cidade durante a revolução. "
                "A Revolução Russa ocorreu em 1917 e transformou o Estado.",
            }
        },
        existing_claims=existing,
    )
    assert len(accepted) == 1
    assert dropped == 2
    assert accepted[0]["source_title"] == "Fonte"

    # Gate de pertinência: a passagem precisa falar da entidade, não só ter URL válida.
    irrelevant, dropped_irrelevant = validate_claims(
        {
            "claims": [
                {
                    "text": "O movimento civil e militar aparece descrito como uma revolução nacional.",
                    "quote": "O movimento civil e militar aparece descrito como uma revolução nacional.",
                    "classification": "documented-fact",
                    "source_url": "https://example.org/fonte",
                }
            ]
        },
        allowed_urls={"https://example.org/fonte"},
        unit_by_url={
            "https://example.org/fonte": {
                "title": "Fonte",
                "section": "Seção",
                "text": "O movimento civil e militar aparece descrito como uma revolução nacional.",
            }
        },
        existing_claims=[],
        entity_terms=["Movimento político"],
    )
    assert irrelevant == []
    assert dropped_irrelevant == 1


def test_relation_pattern_queue_requires_verb_between_titles_and_keeps_direction(tmp_path) -> None:
    bundle = {
        "graph": {
            "atlases": [
                {
                    "slug": "marxismo",
                    "entities": [
                        {"id": "person-lenin", "slug": "lenin", "title": "Lenin", "kind": "person"},
                        {
                            "id": "org-bolchevique",
                            "slug": "bolchevique",
                            "title": "Bolchevique",
                            "kind": "institution",
                        },
                        {
                            "id": "event-revolucao",
                            "slug": "revolucao",
                            "title": "Revolução de Outubro",
                            "kind": "event",
                        },
                    ],
                    "relations": [],
                    "claims": [],
                    "citations": [],
                    "evidences": [],
                    "sources": [],
                }
            ]
        }
    }
    units = [
        _unit("fc1", "firecrawl::a", "Fonte A", "Lenin fundou o Bolchevique em 1903.", "https://a"),
        _unit(
            "fc2",
            "firecrawl::b",
            "Fonte B",
            "O Bolchevique foi fundado por Lenin durante a cisão do partido.",
            "https://b",
        ),
        _unit(
            "fc3",
            "firecrawl::c",
            "Fonte C",
            "Lenin presidiu o conselho, enquanto a Revolução de Outubro ocorria.",
            "https://c",
        ),
    ]
    index = LocalVectorIndex(
        name="fc", vectors=np.ones((3, 2), dtype=np.float32), units=units, manifest={}
    )
    result = build_relation_pattern_queue(
        bundle_data=bundle,
        firecrawl_index=index,
        output_path=tmp_path / "padrao.json",
    )
    assert result["summary"]["candidates"] == 1
    # O retorno resumido não inclui itens; lê a fila gravada.
    import json

    payload = json.loads((tmp_path / "padrao.json").read_text(encoding="utf-8"))
    item = payload["items"][0]
    assert {item["fromTitle"], item["toTitle"]} == {"Lenin", "Bolchevique"}
    assert item["relation"]["family"] == "Criação"
    # A ordem alfabética coloca Bolchevique em "a"; Lenin é o sujeito em "b".
    assert item["fromTitle"] == "Bolchevique"
    assert item["relation"]["direction"] == "b->a"
    assert item["confidence"] in {"lexical-pattern", "lexical-pattern-conflict"}
    assert item["ok"] is None
