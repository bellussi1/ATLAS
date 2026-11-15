"""Mineração semântica local (US$ 0.00) para filas de revisão humana do acervo (Seção 6)."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np

from atlas_rag.index.vector_store import LocalVectorIndex
from atlas_rag.ingest.bundle import load_pinned_bundle
from atlas_rag.paths import eval_dir, index_dir, repo_root
from atlas_rag.rerank.bge_reranker import BgeReranker
from atlas_rag.retrieve.lexical import fold_pt
from atlas_rag.units.builder import classify_relation_tier, extract_deduplicated_corpus

MIN_QUOTE_CHARS = 20
MIN_QUOTE_WORDS = 3

MAIN_READING_ATLASES = {
    "atlas-marx-valor": {"tradition": "marxismo", "baseline_target": 70},
    "atlas-liberalism": {"tradition": "liberalismo", "baseline_target": 35},
    "atlas-social-democracia": {"tradition": "social-democracia", "baseline_target": 70},
    "atlas-anarquismo": {"tradition": "anarquismo", "baseline_target": 50},
}

_STOP_MATCH_TOKENS = {"de", "do", "da", "dos", "das", "e", "o", "a", "em", "no", "na", "para", "por", "com"}


def _infer_relation_type(passage: str) -> tuple[str, str]:
    p = fold_pt(passage)
    if re.search(r"\b(?:critic\w*|opoz\w*|opos\w*|reagi\w*|contest\w*|contrari\w*)\b", p):
        return "reacted_against", "criticou / reagiu contra"
    if re.search(r"\b(?:influenci\w*|inspir\w*|retom\w*)\b", p):
        return "influenced", "influenciou"
    if re.search(r"\b(?:escrev\w*|public\w*|autor\w*)\b", p):
        return "wrote", "escreveu / publicou sobre"
    if re.search(r"\b(?:particip\w*|membro|fund\w*|lider\w*)\b", p):
        return "participated_in", "participou / vinculou-se a"
    return "documented-association", "associação documentada com"


def _extract_literal_quote(
    corpus_entities: dict[str, dict[str, Any]],
    corpus_claims: dict[str, dict[str, Any]],
    source_eid: str,
    target_title: str,
) -> tuple[str, str] | None:
    """Busca passagem literal (>=20 chars, >=3 palavras) no verbete de origem citando o alvo."""
    target_toks = [
        t for t in re.findall(r"[a-z0-9]+", fold_pt(target_title))
        if len(t) >= 4 and t not in _STOP_MATCH_TOKENS
    ]
    if not target_toks:
        return None

    ent = corpus_entities.get(source_eid, {})
    candidates: list[tuple[str, str]] = []
    for para in ent.get("paragraphs") or []:
        candidates.append((para, "paragraph"))
    for c in corpus_claims.values():
        if c.get("entityId") == source_eid and c.get("text"):
            candidates.append((str(c["text"]), str(c["id"])))

    target_fold = fold_pt(target_title)
    for text, origin_ref in candidates:
        t_clean = text.strip()
        if len(t_clean) < MIN_QUOTE_CHARS or len(t_clean.split()) < MIN_QUOTE_WORDS:
            continue
        folded = fold_pt(t_clean)
        if len(target_fold) >= 5 and re.search(rf"\b{re.escape(target_fold)}\b", folded):
            return t_clean[:420], origin_ref
        if len(target_toks) >= 2 and all(re.search(rf"\b{re.escape(tok)}\b", folded) for tok in target_toks):
            return t_clean[:420], origin_ref
        # Para sobrenomes únicos distintivos (>=6 chars, ex.: Proudhon, Bernstein, Bakunin, Rawls)
        long_toks = [tok for tok in target_toks if len(tok) >= 6]
        if len(target_toks) == 1 and long_toks and re.search(rf"\b{re.escape(long_toks[0])}\b", folded):
            return t_clean[:420], origin_ref
    return None


def _is_non_trivial_alias_pair(title_a: str, title_b: str) -> bool:
    fa, fb = fold_pt(title_a).strip(), fold_pt(title_b).strip()
    if fa == fb:
        return True
    ta = {t for t in re.findall(r"[a-z0-9]+", fa) if len(t) >= 3}
    tb = {t for t in re.findall(r"[a-z0-9]+", fb) if len(t) >= 3}
    if not ta or not tb:
        return False
    jaccard = len(ta & tb) / len(ta | tb)
    return jaccard >= 0.45


def run_archive_mining(
    *,
    use_reranker: bool = True,
    root: Path | None = None,
) -> dict[str, Any]:
    """Minera 4 filas de ampliação do acervo em eval/queues/ usando índices locais."""
    base = root or repo_root()
    loaded = load_pinned_bundle(base)
    corpus = extract_deduplicated_corpus(loaded)
    now_iso = datetime.now(timezone.utc).isoformat()

    idx_root = index_dir(base)
    ent_idx = LocalVectorIndex.load("entity_enriched", idx_root)
    claim_idx = LocalVectorIndex.load("claim_enriched", idx_root)

    # Mapa de relações existentes por par e contagem editorial por entidade/atlas
    editorial_pairs: set[tuple[str, str]] = set()
    all_pairs: set[tuple[str, str]] = set()
    editorial_deg: dict[str, int] = defaultdict(int)
    total_deg: dict[str, int] = defaultdict(int)
    editorial_by_atlas: dict[str, int] = defaultdict(int)

    for rel in corpus.relations.values():
        s, t = rel.get("fromEntityId"), rel.get("toEntityId")
        if not s or not t or s == t:
            continue
        pair = tuple(sorted([s, t]))
        all_pairs.add(pair)
        total_deg[s] += 1
        total_deg[t] += 1
        if classify_relation_tier(rel) == "editorial":
            editorial_pairs.add(pair)
            editorial_deg[s] += 1
            editorial_deg[t] += 1
            atlas = rel.get("_atlas_id") or "unknown"
            editorial_by_atlas[atlas] += 1

    claims_by_ent: dict[str, int] = defaultdict(int)
    for c in corpus.claims.values():
        eid = c.get("entityId")
        if eid:
            claims_by_ent[eid] += 1

    # 1) DEDUPLICAÇÃO DE ENTIDADES (vetores entity_enriched, similaridade >= 0.85)
    V_ent = ent_idx.vectors
    sim_ent = V_ent @ V_ent.T
    np.fill_diagonal(sim_ent, -1.0)
    dedup_candidates: list[dict[str, Any]] = []
    seen_dedup: set[tuple[str, str]] = set()
    rows, cols = np.where(sim_ent >= 0.84)
    pairs_scored = sorted(
        ((float(sim_ent[r, c]), int(r), int(c)) for r, c in zip(rows, cols) if r < c),
        key=lambda x: -x[0],
    )
    for sc, i, j in pairs_scored:
        ua, ub = ent_idx.units[i], ent_idx.units[j]
        pair = tuple(sorted([ua.entity_id, ub.entity_id]))
        if pair in seen_dedup or ua.entity_id == ub.entity_id:
            continue
        if not _is_non_trivial_alias_pair(ua.entity_title, ub.entity_title):
            continue
        seen_dedup.add(pair)
        dedup_candidates.append(
            {
                "id": f"dedup-{len(dedup_candidates)+1:03d}",
                "entity_a": {"id": ua.entity_id, "title": ua.entity_title, "atlas": ua.atlas_id, "kind": ua.entity_kind},
                "entity_b": {"id": ub.entity_id, "title": ub.entity_title, "atlas": ub.atlas_id, "kind": ub.entity_kind},
                "bge_m3_cosine": round(sc, 4),
                "ok": None,
                "review": {
                    "by": "ai",
                    "model": "BAAI/bge-m3",
                    "stage": "mining-dedup",
                    "verdict": "pending-human",
                    "reviewedAt": now_iso,
                },
                "note": "[conferência de IA] Par com alta similaridade semântica e sobreposição nominal; conferir possível duplicação/alias.",
            }
        )
        if len(dedup_candidates) >= 30:
            break

    # 2) RELAÇÕES CANDIDATAS (órfãs e tradições principais com passagem literal >=20 chars)
    # Prioriza entidades com editorial_deg == 0 ou pertencentes às 4 tradições principais
    ent_pos = {u.entity_id: idx for idx, u in enumerate(ent_idx.units)}
    priority_entities = sorted(
        corpus.entities.values(),
        key=lambda e: (
            0 if editorial_deg.get(e["id"], 0) == 0 else 1,
            0 if e.get("_atlas_id") in MAIN_READING_ATLASES else 1,
            editorial_deg.get(e["id"], 0),
            e["id"],
        ),
    )

    raw_rel_candidates: list[dict[str, Any]] = []
    seen_rel_pairs: set[tuple[str, str]] = set()
    for ent in priority_entities[:450]:
        sid = ent["id"]
        if sid not in ent_pos:
            continue
        s_vec = sim_ent[ent_pos[sid]]
        top_nbrs = np.argpartition(s_vec, -12)[-12:]
        top_nbrs = top_nbrs[np.argsort(-s_vec[top_nbrs])]
        for n_idx in top_nbrs:
            tid = ent_idx.units[int(n_idx)].entity_id
            cos = float(s_vec[int(n_idx)])
            if tid == sid or cos < 0.56:
                continue
            pair = tuple(sorted([sid, tid]))
            if pair in editorial_pairs or pair in seen_rel_pairs:
                continue
            t_ent = corpus.entities[tid]
            quote_res = _extract_literal_quote(corpus.entities, corpus.claims, sid, t_ent["title"])
            if quote_res is None:
                continue
            quote_text, origin_ref = quote_res
            rel_type, rel_label = _infer_relation_type(quote_text)
            seen_rel_pairs.add(pair)
            src_urls = ent_idx.units[ent_pos[sid]].source_urls
            raw_rel_candidates.append(
                {
                    "id": f"cand-rel-{len(raw_rel_candidates)+1:03d}",
                    "from": {"id": sid, "title": ent["title"], "atlas": ent.get("_atlas_id"), "editorial_degree": editorial_deg.get(sid, 0)},
                    "to": {"id": tid, "title": t_ent["title"], "atlas": t_ent.get("_atlas_id"), "editorial_degree": editorial_deg.get(tid, 0)},
                    "suggested_type": rel_type,
                    "suggested_label": rel_label,
                    "literal_quote": quote_text,
                    "quote_origin": origin_ref,
                    "source_url": src_urls[0] if src_urls else None,
                    "from_is_orphan": editorial_deg.get(sid, 0) == 0,
                    "existing_discovery_link": pair in all_pairs,
                    "bge_m3_cosine": round(cos, 4),
                    "rerank_score": None,
                    "ok": None,
                    "review": {
                        "by": "ai",
                        "model": "BAAI/bge-m3+bge-reranker-v2-m3" if use_reranker else "BAAI/bge-m3",
                        "stage": "mining-relation",
                        "verdict": "pending-human",
                        "reviewedAt": now_iso,
                    },
                    "note": "[conferência de IA] Candidata extraída de citação literal do próprio verbete; validar vínculo editorial e fontes.",
                }
            )
            if len(raw_rel_candidates) >= 120:
                break
        if len(raw_rel_candidates) >= 120:
            break

    # Refina e reordena relações candidatas com cross-encoder BAAI/bge-reranker-v2-m3 em FP16
    if use_reranker and raw_rel_candidates:
        pairs_to_score = [
            (
                f"{item['from']['title']} {item['suggested_label']} {item['to']['title']}",
                item["literal_quote"],
            )
            for item in raw_rel_candidates
        ]
        with BgeReranker(max_length=256) as reranker:
            r_scores, _ = reranker.score_pairs(pairs_to_score, batch_size=16, normalize_sigmoid=True)
        for item, r_sc in zip(raw_rel_candidates, r_scores):
            item["rerank_score"] = round(float(r_sc), 4)
        raw_rel_candidates.sort(
            key=lambda it: (-(it["rerank_score"] or 0.0), -it["bge_m3_cosine"])
        )

    rel_queue = raw_rel_candidates[:80]

    # 3) DEBATES E CONTRADIÇÕES (pares de claims similares com polaridade/tensão epistêmica)
    # Analisamos claims com foco em ideologias e pensadores centrais (top-2500 ou amostragem determinística por entidade)
    V_clm = claim_idx.vectors
    # Para manter matriz rápida (~2s em CPU), seleciona 1 claim mais informativo de cada entidade + claims contested
    selected_indices: list[int] = []
    for idx, u in enumerate(claim_idx.units):
        if u.classification in {"contested-claim", "interpretation"} or idx % 4 == 0:
            selected_indices.append(idx)
        if len(selected_indices) >= 3000:
            break

    sub_V = V_clm[selected_indices]
    sub_sim = sub_V @ sub_V.T
    np.fill_diagonal(sub_sim, -1.0)
    debate_cands: list[dict[str, Any]] = []
    seen_debate: set[tuple[str, str]] = set()
    d_rows, d_cols = np.where(sub_sim >= 0.72)
    # Limita varredura aos pares mais similares
    top_d = sorted(
        ((float(sub_sim[r, c]), selected_indices[int(r)], selected_indices[int(c)]) for r, c in zip(d_rows, d_cols) if r < c),
        key=lambda x: -x[0],
    )[:600]

    _CONTRAST_CUES = ("critic", "contest", "diverg", "oposi", "contra", "neg", "nao ")
    for cos, idx_a, idx_b in top_d:
        ua, ub = claim_idx.units[idx_a], claim_idx.units[idx_b]
        if ua.entity_id == ub.entity_id:
            continue
        pair = tuple(sorted([ua.unit_id, ub.unit_id]))
        if pair in seen_debate:
            continue
        cls_pair = {ua.classification, ub.classification}
        has_tension = (
            "contested-claim" in cls_pair
            or (
                any(cue in fold_pt(ua.text_raw) for cue in _CONTRAST_CUES)
                != any(cue in fold_pt(ub.text_raw) for cue in _CONTRAST_CUES)
            )
        )
        if not has_tension:
            continue
        seen_debate.add(pair)
        debate_cands.append(
            {
                "id": f"debate-{len(debate_cands)+1:03d}",
                "bge_m3_cosine": round(cos, 4),
                "claim_a": {
                    "claim_id": ua.unit_id,
                    "entity_id": ua.entity_id,
                    "entity_title": ua.entity_title,
                    "classification": ua.classification,
                    "text": ua.text_raw,
                },
                "claim_b": {
                    "claim_id": ub.unit_id,
                    "entity_id": ub.entity_id,
                    "entity_title": ub.entity_title,
                    "classification": ub.classification,
                    "text": ub.text_raw,
                },
                "ok": None,
                "review": {
                    "by": "ai",
                    "model": "BAAI/bge-m3",
                    "stage": "mining-debate",
                    "verdict": "pending-human",
                    "reviewedAt": now_iso,
                },
                "note": "[conferência de IA] Par de afirmações com alta proximidade semântica e contraste epistêmico; revisar se configura debate editorial.",
            }
        )
        if len(debate_cands) >= 40:
            break

    # 4) LACUNAS DE COBERTURA (contagens observadas vs metas de expansão)
    orphan_editorial = [
        {"id": eid, "title": ent.get("title"), "atlas": ent.get("_atlas_id"), "kind": ent.get("kind"), "claims_count": claims_by_ent.get(eid, 0)}
        for eid, ent in sorted(corpus.entities.items())
        if editorial_deg.get(eid, 0) == 0
    ]
    zero_total_degree = [
        x for x in orphan_editorial if total_deg.get(x["id"], 0) == 0
    ]
    zero_claim_entities = [
        {"id": eid, "title": ent.get("title"), "atlas": ent.get("_atlas_id"), "kind": ent.get("kind"), "editorial_degree": editorial_deg.get(eid, 0)}
        for eid, ent in sorted(corpus.entities.items())
        if claims_by_ent.get(eid, 0) == 0
    ]
    traditions_coverage = {}
    for atlas_id, cfg in MAIN_READING_ATLASES.items():
        ed_cnt = editorial_by_atlas.get(atlas_id, 0)
        cand_cnt = sum(1 for item in rel_queue if item["from"].get("atlas") == atlas_id or item["to"].get("atlas") == atlas_id)
        traditions_coverage[atlas_id] = {
            "tradition": cfg["tradition"],
            "observed_editorial_relations": ed_cnt,
            "baseline_target_from_docs": cfg["baseline_target"],
            "gap_to_target": max(0, cfg["baseline_target"] - ed_cnt),
            "mined_candidates_in_queue": cand_cnt,
        }

    lacunas = {
        "release": loaded.release,
        "bundle_sha256": loaded.bundle_sha256,
        "generated_at": now_iso,
        "total_entities": len(corpus.entities),
        "entities_without_editorial_edges": len(orphan_editorial),
        "entities_zero_total_degree": len(zero_total_degree),
        "entities_zero_claims": len(zero_claim_entities),
        "main_reading_traditions": traditions_coverage,
        "orphan_sample": orphan_editorial[:67],
        "zero_claim_sample": zero_claim_entities[:50],
    }

    qdir = eval_dir(base) / "queues"
    qdir.mkdir(parents=True, exist_ok=True)
    (qdir / "relacoes-candidatas.json").write_text(json.dumps(rel_queue, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (qdir / "debates-e-contradicoes.json").write_text(json.dumps(debate_cands, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (qdir / "deduplicacao-entidades.json").write_text(json.dumps(dedup_candidates, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (qdir / "lacunas-cobertura.json").write_text(json.dumps(lacunas, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    summary = {
        "relacoes_candidatas": len(rel_queue),
        "orphan_targets_in_relacoes": sum(1 for x in rel_queue if x["from_is_orphan"]),
        "debates_e_contradicoes": len(debate_cands),
        "deduplicacao_entidades": len(dedup_candidates),
        "entities_without_editorial_edges": len(orphan_editorial),
        "entities_zero_total_degree": len(zero_total_degree),
        "entities_zero_claims": len(zero_claim_entities),
        "all_ok_null": all(x.get("ok") is None for q_list in (rel_queue, debate_cands, dedup_candidates) for x in q_list),
        "main_reading_traditions": traditions_coverage,
    }
    (eval_dir(base) / "runs" / "phase6_mining.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return summary


if __name__ == "__main__":
    print(json.dumps(run_archive_mining(), indent=2, ensure_ascii=False))
