"""Build retrieval units (claim, paragraph, entity) with full citation chains from the bundle."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from atlas_rag.ingest.bundle import LoadedBundle

DISCOVERY_RELATION_TYPES = frozenset({"encyclopedic-link", "editorial-link", "related_to"})
CATALOG_RELATION_TYPES = frozenset({"associated_with"})
ACTION_DOCUMENTED_RE = re.compile(
    r"^(fundou|governou|presidiu|promulgou|escreveu|lutou|assumiu|dirigiu|liderou|chefiou|"
    r"comandou|organizou|criou|assinou|decretou|elegeu|derrubou|instaurou|proclamou|declarou|"
    r"votou|aprovou)\b",
    re.IGNORECASE,
)


def classify_relation_weight(relation: dict[str, Any]) -> str:
    """Mirror `relationWeightOf` from src/app/core/content/queries/knowledge-network.ts."""
    rtype = relation["type"]
    if rtype in {"associated_with", "related_to", "editorial-link", "encyclopedic-link"}:
        return "catalog"
    if rtype in {
        "influence",
        "influenced",
        "influenced_by",
        "reacted_against",
        "developed_into",
        "causal-claim",
        "event_influenced_ideology",
    }:
        return "historical"
    if rtype in {"participated_in", "wrote", "authored"}:
        return "action"
    if rtype == "documented-association" and ACTION_DOCUMENTED_RE.match(relation.get("label", "")):
        return "action"
    return "administrative"


def classify_relation_nature(relation: dict[str, Any]) -> str:
    """Mirror `natureOf` from src/app/core/content/queries/knowledge-network.ts."""
    prov = relation.get("provenance") or {}
    if prov.get("source") == "wikidata":
        return "catalogue"
    if relation["type"] == "encyclopedic-link":
        return "navigation"
    if relation["type"] == "editorial-link":
        return "editorial"
    if prov:
        return "stated"
    return "editorial"


def classify_relation_tier(relation: dict[str, Any]) -> str:
    """Group edges for RAG Phase 4: editorial (documented), catalog (Wikidata P737/P1142), discovery."""
    rtype = relation["type"]
    if rtype in DISCOVERY_RELATION_TYPES:
        return "discovery"
    if rtype in CATALOG_RELATION_TYPES:
        return "catalog"
    return "editorial"


@dataclass(frozen=True)
class RetrievalUnit:
    """A single deduplicated unit ready for lexical/dense indexing and citation tracing."""

    unit_id: str
    granularity: str  # "claim" | "paragraph" | "entity"
    entity_id: str
    entity_title: str
    entity_slug: str
    entity_kind: str
    scope: str
    atlas_id: str
    text_raw: str
    text_enriched: str
    classification: str | None = None
    editorial_status: str | None = None
    citation_ids: tuple[str, ...] = ()
    evidence_ids: tuple[str, ...] = ()
    source_ids: tuple[str, ...] = ()
    source_titles: tuple[str, ...] = ()
    source_urls: tuple[str, ...] = ()
    locators: tuple[str, ...] = ()
    aliases: tuple[str, ...] = ()
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class CorpusArtifacts:
    """All deduplicated entities, claims, chains, relations, and built units from a bundle."""

    entities: dict[str, dict[str, Any]]
    claims: dict[str, dict[str, Any]]
    sources: dict[str, dict[str, Any]]
    evidences: dict[str, dict[str, Any]]
    citations: dict[str, dict[str, Any]]
    reviews: dict[str, dict[str, Any]]
    relations: dict[str, dict[str, Any]]
    claim_units: list[RetrievalUnit]
    paragraph_units: list[RetrievalUnit]
    entity_units: list[RetrievalUnit]
    dedup_stats: dict[str, int]


def extract_deduplicated_corpus(loaded: LoadedBundle) -> CorpusArtifacts:
    """Ingest, deduplicate by ID, and build the 3 unit granularities from the pinned bundle."""
    atlases = loaded.data["graph"]["atlases"]

    entities: dict[str, dict[str, Any]] = {}
    sources: dict[str, dict[str, Any]] = {}
    evidences: dict[str, dict[str, Any]] = {}
    citations: dict[str, dict[str, Any]] = {}
    claims: dict[str, dict[str, Any]] = {}
    reviews: dict[str, dict[str, Any]] = {}
    relations: dict[str, dict[str, Any]] = {}

    raw_counts = {
        "atlases": len(atlases),
        "entities": 0,
        "sources": 0,
        "evidences": 0,
        "citations": 0,
        "claims": 0,
        "reviews": 0,
        "relations": 0,
    }

    for atlas in atlases:
        atlas_id = atlas["id"]
        for item in atlas.get("entities", []):
            raw_counts["entities"] += 1
            if item["id"] not in entities:
                entities[item["id"]] = {**item, "_atlas_id": atlas_id}
        for item in atlas.get("sources", []):
            raw_counts["sources"] += 1
            if item["id"] not in sources:
                sources[item["id"]] = {**item, "_atlas_id": atlas_id}
        for item in atlas.get("evidences", []):
            raw_counts["evidences"] += 1
            if item["id"] not in evidences:
                evidences[item["id"]] = {**item, "_atlas_id": atlas_id}
        for item in atlas.get("citations", []):
            raw_counts["citations"] += 1
            if item["id"] not in citations:
                citations[item["id"]] = {**item, "_atlas_id": atlas_id}
        for item in atlas.get("claims", []):
            raw_counts["claims"] += 1
            if item["id"] not in claims:
                claims[item["id"]] = {**item, "_atlas_id": atlas_id}
        for item in atlas.get("reviews", []):
            raw_counts["reviews"] += 1
            if item["id"] not in reviews:
                reviews[item["id"]] = {**item, "_atlas_id": atlas_id}
        for item in atlas.get("relations", []):
            raw_counts["relations"] += 1
            if item["id"] not in relations:
                relations[item["id"]] = {**item, "_atlas_id": atlas_id}

    dedup_stats = {
        "raw_entities": raw_counts["entities"],
        "unique_entities": len(entities),
        "duplicate_entities_dropped": raw_counts["entities"] - len(entities),
        "raw_claims": raw_counts["claims"],
        "unique_claims": len(claims),
        "duplicate_claims_dropped": raw_counts["claims"] - len(claims),
        "raw_relations": raw_counts["relations"],
        "unique_relations": len(relations),
        "duplicate_relations_dropped": raw_counts["relations"] - len(relations),
        "unique_sources": len(sources),
        "unique_evidences": len(evidences),
        "unique_citations": len(citations),
        "unique_reviews": len(reviews),
    }

    claim_units: list[RetrievalUnit] = []
    for claim_id, claim in claims.items():
        ent = entities[claim["entityId"]]
        aliases = tuple(ent.get("aliases") or ())
        scope = ent.get("scope") or "nucleo"
        cit_ids = tuple(claim.get("citationIds") or ())
        ev_ids: list[str] = []
        src_ids: list[str] = []
        src_titles: list[str] = []
        src_urls: list[str] = []
        locators: list[str] = []
        evidence_snippets: list[str] = []

        for cid in cit_ids:
            cit = citations.get(cid)
            if not cit:
                continue
            eid = cit["evidenceId"]
            ev = evidences.get(eid)
            if not ev:
                continue
            ev_ids.append(eid)
            loc = ev.get("locator", "").strip()
            if loc:
                locators.append(loc)
            src = sources.get(ev["sourceId"])
            if src:
                src_ids.append(src["id"])
                src_titles.append(src["title"])
                if src.get("url"):
                    src_urls.append(src["url"])
                evidence_snippets.append(f"{src['title']}: {loc}" if loc else src["title"])
            elif loc:
                evidence_snippets.append(loc)

        alias_part = f" ({', '.join(aliases[:4])})" if aliases else ""
        ev_text = " ; ".join(evidence_snippets[:2])
        header = (
            f"[{ent['title']}{alias_part} | tipo: {ent['kind']} | escopo: {scope} | "
            f"classificação: {claim['classification']}]"
        )
        enriched = f"{header} {claim['text']}"
        if ev_text:
            enriched = f"{enriched} | Evidência: {ev_text}"

        claim_units.append(
            RetrievalUnit(
                unit_id=claim_id,
                granularity="claim",
                entity_id=ent["id"],
                entity_title=ent["title"],
                entity_slug=ent["slug"],
                entity_kind=ent["kind"],
                scope=scope,
                atlas_id=claim["_atlas_id"],
                text_raw=claim["text"],
                text_enriched=enriched,
                classification=claim["classification"],
                editorial_status=claim["editorialStatus"],
                citation_ids=cit_ids,
                evidence_ids=tuple(ev_ids),
                source_ids=tuple(src_ids),
                source_titles=tuple(src_titles),
                source_urls=tuple(src_urls),
                locators=tuple(locators),
                aliases=aliases,
                metadata={
                    "citation_relations": [
                        citations[cid]["relation"] for cid in cit_ids if cid in citations
                    ],
                },
            )
        )

    claims_by_entity: dict[str, list[RetrievalUnit]] = {}
    for cu in claim_units:
        claims_by_entity.setdefault(cu.entity_id, []).append(cu)

    paragraph_units: list[RetrievalUnit] = []
    entity_units: list[RetrievalUnit] = []

    for ent_id, ent in entities.items():
        aliases = tuple(ent.get("aliases") or ())
        scope = ent.get("scope") or "nucleo"
        alias_part = f" ({', '.join(aliases[:4])})" if aliases else ""

        p_idx = 0
        section_blocks: list[str] = []
        for s_idx, section in enumerate(ent.get("sections") or []):
            heading = section.get("heading", "").strip()
            paragraphs = section.get("paragraphs") or []
            if heading and paragraphs:
                section_blocks.append(f"{heading}: {' '.join(paragraphs)}")
            for para in paragraphs:
                unit_id = f"para::{ent_id}::s{s_idx}::p{p_idx}"
                p_idx += 1
                enriched_para = f"[{ent['title']}{alias_part} | seção: {heading}] {para}"
                paragraph_units.append(
                    RetrievalUnit(
                        unit_id=unit_id,
                        granularity="paragraph",
                        entity_id=ent_id,
                        entity_title=ent["title"],
                        entity_slug=ent["slug"],
                        entity_kind=ent["kind"],
                        scope=scope,
                        atlas_id=ent["_atlas_id"],
                        text_raw=para,
                        text_enriched=enriched_para,
                        editorial_status=ent.get("editorialStatus"),
                        aliases=aliases,
                        metadata={"section_heading": heading, "section_index": s_idx},
                    )
                )

        ent_claims = claims_by_entity.get(ent_id, [])
        claim_lines = [f"- ({cu.classification}) {cu.text_raw}" for cu in ent_claims]
        full_raw = "\n".join(
            part
            for part in [
                ent["title"],
                ent.get("summary", ""),
                ent.get("context", ""),
                *section_blocks,
                *(cu.text_raw for cu in ent_claims),
            ]
            if part
        )
        full_enriched = "\n".join(
            part
            for part in [
                f"[{ent['title']}{alias_part} | tipo: {ent['kind']} | escopo: {scope}]",
                f"Resumo: {ent.get('summary', '')}",
                f"Contexto: {ent.get('context', '')}",
                *section_blocks,
                *(claim_lines),
            ]
            if part
        )
        entity_units.append(
            RetrievalUnit(
                unit_id=f"entity::{ent_id}",
                granularity="entity",
                entity_id=ent_id,
                entity_title=ent["title"],
                entity_slug=ent["slug"],
                entity_kind=ent["kind"],
                scope=scope,
                atlas_id=ent["_atlas_id"],
                text_raw=full_raw,
                text_enriched=full_enriched,
                editorial_status=ent.get("editorialStatus"),
                aliases=aliases,
                metadata={"claim_ids": [cu.unit_id for cu in ent_claims]},
            )
        )

    return CorpusArtifacts(
        entities=entities,
        claims=claims,
        sources=sources,
        evidences=evidences,
        citations=citations,
        reviews=reviews,
        relations=relations,
        claim_units=claim_units,
        paragraph_units=paragraph_units,
        entity_units=entity_units,
        dedup_stats=dedup_stats,
    )
