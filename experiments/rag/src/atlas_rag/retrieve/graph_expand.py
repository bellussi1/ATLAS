"""Expansão consciente do grafo editorial vs descoberta (Fase 4)."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from typing import Any, Mapping, Sequence

from atlas_rag.retrieve.lexical import ScoredHit, tokenize_bm25
from atlas_rag.units.builder import RetrievalUnit, classify_relation_tier


@dataclass(frozen=True)
class GraphExpandedHit:
    unit_id: str
    score: float
    entity_id: str
    granularity: str
    hop: int = 0  # 0 = recuperação base, 1 = vizinho 1-hop no grafo
    via_relation_id: str | None = None
    via_relation_type: str | None = None
    via_relation_tier: str | None = None  # editorial | discovery | catalog
    via_discovery_only: bool = False


class GraphExpander:
    """Expande hits top-k ao longo das arestas do grafo do acervo com pesos por estrato."""

    def __init__(
        self,
        claim_units: Sequence[RetrievalUnit],
        relations: Mapping[str, Mapping[str, Any]],
    ) -> None:
        self.unit_by_id: dict[str, RetrievalUnit] = {u.unit_id: u for u in claim_units}
        self.claims_by_entity: dict[str, list[RetrievalUnit]] = defaultdict(list)
        for u in claim_units:
            self.claims_by_entity[u.entity_id].append(u)

        # Lista de adjacência não direcionada preservando origem e estrato
        self.adj: dict[str, list[tuple[str, str, str, str, str]]] = defaultdict(list)
        for rid, rel in relations.items():
            s, t = rel.get("fromEntityId"), rel.get("toEntityId")
            if not s or not t or s == t:
                continue
            tier = classify_relation_tier(rel)
            rtype = str(rel.get("type") or "")
            ctx = str(rel.get("context") or rel.get("label") or "")
            self.adj[s].append((t, rid, rtype, tier, ctx))
            self.adj[t].append((s, rid, rtype, tier, ctx))

    def has_editorial_edge_between(self, ent_a: str, ent_b: str) -> bool:
        for nb, _rid, _rt, tier, _ctx in self.adj.get(ent_a, []):
            if nb == ent_b and tier == "editorial":
                return True
        return False

    def expand(
        self,
        query: str,
        base_hits: Sequence[ScoredHit],
        *,
        mode: str = "editorial_only",  # no_graph | editorial_only | full_with_low_discovery
        seed_entities_limit: int = 4,
        editorial_weight: float = 1.0,
        discovery_weight: float = 0.15,
        top_k: int = 20,
    ) -> list[GraphExpandedHit]:
        """Executa expansão em grafo respeitando estrato editorial vs descoberta/catálogo."""
        if mode == "no_graph" or not base_hits:
            return [
                GraphExpandedHit(
                    unit_id=h.unit_id,
                    score=float(h.score),
                    entity_id=h.entity_id,
                    granularity=h.granularity,
                    hop=0,
                )
                for h in base_hits[:top_k]
            ]

        q_toks = set(tokenize_bm25(query))
        best_by_unit: dict[str, GraphExpandedHit] = {}
        for h in base_hits:
            best_by_unit[h.unit_id] = GraphExpandedHit(
                unit_id=h.unit_id,
                score=float(h.score),
                entity_id=h.entity_id,
                granularity=h.granularity,
                hop=0,
            )

        # Identifica entidades âncora com maior score base (limitado a top seed_entities_limit)
        anchor_scores: dict[str, float] = {}
        for h in base_hits[:12]:
            anchor_scores[h.entity_id] = max(anchor_scores.get(h.entity_id, 0.0), float(h.score))
        anchors = sorted(anchor_scores.items(), key=lambda kv: -kv[1])[:seed_entities_limit]
        anchor_ids = {eid for eid, _ in anchors}

        for anchor_eid, anchor_score in anchors:
            for nb_eid, rid, rtype, tier, rel_ctx in self.adj.get(anchor_eid, []):
                if tier == "editorial":
                    w = editorial_weight
                    is_disc = False
                else:
                    if mode == "editorial_only":
                        continue
                    w = discovery_weight
                    is_disc = True

                # Bônus se relação ou entidade vizinha alinha com a consulta
                ctx_toks = set(tokenize_bm25(rel_ctx))
                rel_match = len(q_toks & ctx_toks) / max(len(q_toks), 1)
                # Ranqueia afirmações da entidade vizinha pela sobreposição lexical com consulta+relação
                nb_claims = self.claims_by_entity.get(nb_eid, [])
                scored_nb: list[tuple[float, RetrievalUnit]] = []
                for u in nb_claims:
                    u_toks = set(tokenize_bm25(u.text_enriched))
                    u_overlap = len(q_toks & u_toks) / max(len(q_toks), 1)
                    # Bônus estrutural para ponte entre entidades presentes no pool; vizinhos sem alinhamento ficam baixos
                    cross_anchor_bonus = 0.25 if (nb_eid in anchor_ids and not is_disc) else 0.0
                    hop_score = anchor_score * w * min(1.0, 0.08 + 0.52 * u_overlap + 0.30 * rel_match + cross_anchor_bonus)
                    scored_nb.append((hop_score, u))
                scored_nb.sort(key=lambda item: (-item[0], item[1].unit_id))

                for hop_score, u in scored_nb[:2]:
                    prev = best_by_unit.get(u.unit_id)
                    if prev is None:
                        best_by_unit[u.unit_id] = GraphExpandedHit(
                            unit_id=u.unit_id,
                            score=float(hop_score),
                            entity_id=u.entity_id,
                            granularity=u.granularity,
                            hop=1,
                            via_relation_id=rid,
                            via_relation_type=rtype,
                            via_relation_tier=tier,
                            via_discovery_only=is_disc and not self.has_editorial_edge_between(anchor_eid, nb_eid),
                        )
                    elif prev.hop == 0 and not is_disc:
                        # Promove hit já existente quando confirmado por ponte editorial
                        boosted = min(1.0, prev.score + 0.12 * float(hop_score))
                        best_by_unit[u.unit_id] = GraphExpandedHit(
                            unit_id=prev.unit_id,
                            score=float(boosted),
                            entity_id=prev.entity_id,
                            granularity=prev.granularity,
                            hop=0,
                            via_relation_id=rid,
                            via_relation_type=rtype,
                            via_relation_tier=tier,
                            via_discovery_only=False,
                        )
                    elif hop_score > prev.score:
                        best_by_unit[u.unit_id] = GraphExpandedHit(
                            unit_id=u.unit_id,
                            score=float(hop_score),
                            entity_id=u.entity_id,
                            granularity=u.granularity,
                            hop=1,
                            via_relation_id=rid,
                            via_relation_type=rtype,
                            via_relation_tier=tier,
                            via_discovery_only=is_disc and not self.has_editorial_edge_between(anchor_eid, nb_eid),
                        )

        ranked = sorted(best_by_unit.values(), key=lambda item: (-item.score, item.unit_id))
        return ranked[:top_k]
