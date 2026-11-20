"""Cruzamento de relações por similaridade de embeddings no acervo publicado.

Agrupa as afirmações do índice `claim_enriched` por entidade, calcula o vetor
médio de cada entidade e ranqueia pares semanticamente próximos que ainda não
têm relação editorial. A fila é uma pista de pesquisa: não cria aresta, não
classifica família e não publica. O pareamento só vira rascunho depois de
evidência recuperada e validação de URL.
"""

from __future__ import annotations

import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

import numpy as np

from atlas_rag.index.vector_store import LocalVectorIndex
from atlas_rag.ingest.bundle import load_pinned_bundle
from atlas_rag.mining.graph_gaps import collect_graph_state
from atlas_rag.paths import eval_dir, index_dir


def entity_vectors(
    index: LocalVectorIndex,
    *,
    min_claims: int = 2,
) -> tuple[list[str], np.ndarray, dict[str, dict[str, Any]]]:
    """Média L2-normalizada das afirmações de cada entidade."""
    grouped: dict[str, list[int]] = defaultdict(list)
    meta: dict[str, dict[str, Any]] = {}
    for position, unit in enumerate(index.units):
        grouped[unit.entity_id].append(position)
        if unit.entity_id not in meta:
            meta[unit.entity_id] = {
                "entity_id": unit.entity_id,
                "title": unit.entity_title,
                "slug": unit.entity_slug,
                "kind": unit.entity_kind,
                "scope": unit.scope,
                "atlas_id": unit.atlas_id,
            }

    ids = [entity_id for entity_id, positions in grouped.items() if len(positions) >= min_claims]
    if not ids:
        return [], np.zeros((0, index.vectors.shape[1]), dtype=np.float32), {}
    matrix = np.vstack(
        [index.vectors[grouped[entity_id]].mean(axis=0) for entity_id in ids]
    ).astype(np.float32)
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    matrix /= norms
    return ids, matrix, {entity_id: meta[entity_id] for entity_id in ids}


def _normalize_title(value: str) -> str:
    text = unicodedata.normalize("NFD", value or "")
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def rank_entity_pairs(
    ids: Sequence[str],
    vectors: np.ndarray,
    *,
    existing_pairs: set[tuple[str, str]] | None = None,
    titles: dict[str, str] | None = None,
    top_k: int = 6,
    threshold: float = 0.55,
    max_pairs: int = 250,
) -> list[dict[str, Any]]:
    """Retorna pares não existentes ordenados por similaridade de cosseno."""
    if len(ids) < 2:
        return []
    existing = existing_pairs or set()
    titles = titles or {}
    similarity = vectors @ vectors.T
    np.fill_diagonal(similarity, -1.0)
    best: dict[tuple[str, str], float] = {}

    k = min(top_k, len(ids) - 1)
    for row, entity_id in enumerate(ids):
        row_scores = similarity[row]
        candidate_positions = np.argpartition(row_scores, -k)[-k:]
        for col in candidate_positions:
            score = float(row_scores[int(col)])
            if score < threshold:
                continue
            other = ids[int(col)]
            pair = tuple(sorted((entity_id, other)))
            if pair in existing:
                continue
            if _normalize_title(titles.get(entity_id, "")) == _normalize_title(
                titles.get(other, "")
            ):
                continue
            if score > best.get(pair, 0.0):
                best[pair] = score

    ranked = [
        {"a": a, "b": b, "score": round(score, 4)}
        for (a, b), score in best.items()
    ]
    ranked.sort(key=lambda item: -item["score"])
    return ranked[:max_pairs]


def _claim_excerpts(
    index: LocalVectorIndex,
    entity_id: str,
    *,
    limit: int = 2,
) -> list[dict[str, Any]]:
    excerpts: list[dict[str, Any]] = []
    for unit in index.units:
        if unit.entity_id != entity_id:
            continue
        if not unit.source_urls:
            continue
        excerpts.append(
            {
                "unit_id": unit.unit_id,
                "text": unit.text_raw[:420],
                "classification": unit.classification,
                "source_title": unit.source_titles[0] if unit.source_titles else None,
                "source_url": unit.source_urls[0],
                "locator": unit.locators[0] if unit.locators else None,
            }
        )
        if len(excerpts) >= limit:
            break
    return excerpts


def _words(text: str) -> list[str]:
    return _normalize_title(text).split()


def _words(text: str) -> list[str]:
    return _normalize_title(text).split()


RELATION_PATTERNS: tuple[tuple[str, str, str, bool], ...] = (
    (r"\bfundou\b|\bcriou\b|\bcriaram\b", "Criação", "fundou", False),
    (r"\bfundad[oa]s? por\b|\bcriad[oa]s? por\b", "Criação", "fundado por", True),
    (r"\binfluenciou\b|\binfluenciaram\b|\binspirou\b", "Influência", "influenciou", False),
    (r"\binfluenciad[oa]s? por\b|\binspirad[oa]s? por\b", "Influência", "influenciado por", True),
    (r"\brompeu com\b|\bromperam com\b|\bruptura com\b|\bseparou-se de\b", "Ruptura", "rompeu com", False),
    (r"\bpresidiu\b|\bliderou\b", "Atuação", "presidiu", False),
    (r"\bpresidente d[eo]\b|\bliderad[oa]s? por\b", "Atuação", "presidido por", True),
    (r"\bmembro d[eo]\b|\bfiliad[oa]s? a\b|\bpertenceu a\b|\bpertence a\b", "Filiação", "membro de", False),
    (r"\bescreveu\b|\bpublicou\b|\bautor d[eo]\b|\bobra d[eo]\b", "Criação", "escreveu", False),
    (r"\bocorreu em\b|\baconteceu em\b|\bsediad[oa]s? em\b", "Lugar", "ocorreu em", False),
)

GENERIC_TITLES = frozenset(
    {
        "advogado",
        "associacao",
        "lideranca",
        "politica",
        "politico",
        "eleicao",
        "governo",
        "partido",
        "estado",
        "pais",
        "cidade",
        "guerra",
        "movimento",
        "revolucao",
        "constituicao",
        "lei",
        "direito",
        "economia",
        "sociedade",
        "cultura",
        "historia",
        "poder",
        "povo",
        "nacao",
        "presidente",
        "deputado",
        "senador",
        "ministro",
        "juiz",
        "tribunal",
        "empresa",
        "igreja",
        "escola",
        "universidade",
    }
)


def build_relation_pattern_queue(
    *,
    bundle_data: dict[str, Any] | None = None,
    firecrawl_index: LocalVectorIndex | None = None,
    output_path: Path | None = None,
    max_pairs: int = 300,
    max_entity_df: int = 60,
    max_sentence_chars: int = 420,
) -> dict[str, Any]:
    """Extrai relações de frases do corpus com verbo relacional e dois títulos.

    Alta precisão e baixo recall: só entra par cujos dois títulos aparecem na
    mesma frase e a frase contém um padrão explícito. A frase vira a citação do
    rascunho; direção e família ainda pedem revisão humana.
    """
    if bundle_data is None:
        loaded = load_pinned_bundle()
        bundle_data = loaded.data
        release = loaded.release
    else:
        release = bundle_data.get("release") or "local"

    state = collect_graph_state(bundle_data)
    entities = state["entities"]
    fc_index = firecrawl_index or LocalVectorIndex.load(
        "firecrawl_corpus", base_dir=index_dir()
    )

    title_index: dict[str, str] = {}
    ambiguous: set[str] = set()
    for entity_id, entity in entities.items():
        for value in [entity.get("title", ""), *(entity.get("aliases") or [])]:
            key = _normalize_title(value)
            if len(key) < 3 or len(key.split()) > 8:
                continue
            if key in title_index and title_index[key] != entity_id:
                ambiguous.add(key)
            else:
                title_index[key] = entity_id
    for key in ambiguous:
        title_index.pop(key, None)

    doc_freq: Counter[str] = Counter()
    sentences: list[tuple[str, Any]] = []
    for unit in fc_index.units:
        for raw in re.split(r"(?<=[.!?])\s+|\n+", unit.text_raw):
            sentence = raw.strip()
            if len(sentence) < 30 or len(sentence) > max_sentence_chars:
                continue
            words = _words(sentence)
            found: list[str] = []
            seen: set[str] = set()
            for start in range(len(words)):
                for size in range(1, 9):
                    if start + size > len(words):
                        break
                    entity_id = title_index.get(" ".join(words[start : start + size]))
                    if entity_id and entity_id not in seen:
                        seen.add(entity_id)
                        found.append(entity_id)
            if len(found) >= 2:
                doc_freq.update(found)
                sentences.append((sentence, unit))

    allowed = {entity_id for entity_id, freq in doc_freq.items() if freq <= max_entity_df}
    keys_by_entity: dict[str, list[str]] = {}
    for key, entity_id in title_index.items():
        if entity_id in allowed and key not in GENERIC_TITLES:
            keys_by_entity.setdefault(entity_id, []).append(key)
    keys_by_entity = {
        entity_id: sorted(keys, key=len, reverse=True)
        for entity_id, keys in keys_by_entity.items()
    }

    found_pairs: dict[tuple[str, str], dict[str, Any]] = {}
    for sentence, unit in sentences:
        normalized = f" {_normalize_title(sentence)} "
        spans: dict[str, tuple[int, int]] = {}
        for entity_id, keys in keys_by_entity.items():
            best: tuple[int, int] | None = None
            for key in keys:
                marker = f" {key} "
                position = normalized.find(marker)
                if position < 0:
                    continue
                start = position + 1
                end = start + len(key)
                if best is None or start < best[0]:
                    best = (start, end)
                break
            if best is not None:
                spans[entity_id] = best
        if len(spans) < 2:
            continue
        ordered = sorted(spans.items(), key=lambda item: item[1][0])
        for left_index in range(len(ordered)):
            left_id, (_, left_end) = ordered[left_index]
            for right_index in range(left_index + 1, len(ordered)):
                right_id, (right_start, _) = ordered[right_index]
                if right_start <= left_end:
                    continue
                between = normalized[left_end:right_start].strip()
                if not between or len(between) > 180:
                    continue
                for pattern, family, label, reverse in RELATION_PATTERNS:
                    if not re.fullmatch(
                        rf"(?:tambem|depois|entao|posteriormente|em seguida|ainda|mesmo|nao|nunca|ja|e|foi)?\s*"
                        rf"(?:{pattern})\s*"
                        rf"(?:o|a|os|as|um|uma|seu|sua|de|do|da|dos|das)?",
                        between,
                    ):
                        continue
                    pair = tuple(sorted((left_id, right_id)))
                    if pair in state["relationPairs"]:
                        continue
                    subject = right_id if reverse else left_id
                    direction = "a->b" if subject == pair[0] else "b->a"
                    record = found_pairs.setdefault(
                        pair,
                        {
                            "family": family,
                            "label": label,
                            "direction": direction,
                            "direction_conflict": False,
                            "sentences": [],
                        },
                    )
                    if record["direction"] != direction:
                        record["direction_conflict"] = True
                    if len(record["sentences"]) < 2:
                        record["sentences"].append(
                            {
                                "sentence": sentence,
                                "title": unit.entity_title,
                                "section": unit.locators[0] if unit.locators else None,
                                "url": unit.source_urls[0] if unit.source_urls else None,
                                "license": unit.metadata.get("license"),
                                "usagePolicy": unit.metadata.get(
                                    "usagePolicy", "reference-only"
                                ),
                            }
                        )
                    break

    now = datetime.now(timezone.utc).isoformat()
    items: list[dict[str, Any]] = []
    for (left, right), record in found_pairs.items():
        evidence = [entry for entry in record["sentences"] if entry["url"]]
        if not evidence:
            continue
        left_entity = entities[left]
        right_entity = entities[right]
        items.append(
            {
                "id": f"rel-pat-{left}--{right}",
                "fromEntityId": left,
                "toEntityId": right,
                "fromTitle": left_entity["title"],
                "toTitle": right_entity["title"],
                "fromKind": left_entity["kind"],
                "toKind": right_entity["kind"],
                "relation": {
                    "family": record["family"],
                    "label": record["label"],
                    "direction": record["direction"],
                    "direction_conflict": record["direction_conflict"],
                    "claim": evidence[0]["sentence"],
                    "classification": "documented-fact",
                    "source_url": evidence[0]["url"],
                    "source_title": evidence[0]["title"],
                    "section": evidence[0]["section"],
                    "license": evidence[0]["license"],
                    "usagePolicy": evidence[0]["usagePolicy"],
                },
                "evidence": evidence,
                "confidence": (
                    "lexical-pattern-conflict"
                    if record["direction_conflict"]
                    else "lexical-pattern"
                ),
                "ok": None,
            }
        )

    items.sort(key=lambda item: (-len(item["evidence"]), item["fromTitle"].lower()))
    items = items[:max_pairs]
    kind_counts = Counter(f"{item['fromKind']}->{item['toKind']}" for item in items)

    payload = {
        "generated_at": now,
        "release": release,
        "human_reviewed": False,
        "origin": "relation-pattern-mining",
        "description": (
            "Pares cujos dois títulos aparecem na mesma frase do corpus com verbo relacional "
            "explícito. A frase é a citação de apoio; direção, família e rótulo ainda pedem "
            "revisão humana antes de criar a aresta."
        ),
        "summary": {
            "firecrawl_chunks": len(fc_index.units),
            "sentences_with_two_entities": len(sentences),
            "filtered_ubiquitous": len(title_index) - len(allowed),
            "candidates": len(items),
            "by_kind_pair": dict(kind_counts.most_common(10)),
            "brazil": sum(
                1
                for item in items
                if any(
                    hint in f"{item['fromTitle']} {item['toTitle']}".lower()
                    for hint in ("brasil", "vargas", "1964", "ditadura")
                )
            ),
        },
        "review": {
            "by": "ai",
            "model": "padrões lexicais + corpus Firecrawl",
            "stage": "relation-pattern-mining",
            "verdict": "pending-human",
            "reviewedAt": now,
        },
        "items": items,
    }

    dest = output_path or (eval_dir() / "queues" / "relacoes-por-padrao.json")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return {
        "output_path": str(dest),
        "release": release,
        "summary": payload["summary"],
        "top": [
            {
                "from": item["fromTitle"],
                "to": item["toTitle"],
                "family": item["relation"]["family"],
                "evidence": len(item["evidence"]),
            }
            for item in items[:12]
        ],
    }

def build_cooccurrence_relation_queue(
    *,
    bundle_data: dict[str, Any] | None = None,
    firecrawl_index: LocalVectorIndex | None = None,
    claim_index: LocalVectorIndex | None = None,
    output_path: Path | None = None,
    max_entities_per_chunk: int = 12,
    max_pairs: int = 400,
    min_similarity: float = 0.45,
    max_entity_df: int = 60,
    max_evidence: int = 3,
) -> dict[str, Any]:
    """Cruza entidades que aparecem juntas em trechos do corpus Firecrawl.

    A coocorrência é a pista principal; a similaridade de embeddings entra como
    desempate. O par só entra na fila se ainda não tiver relação editorial.
    """
    if bundle_data is None:
        loaded = load_pinned_bundle()
        bundle_data = loaded.data
        release = loaded.release
    else:
        release = bundle_data.get("release") or "local"

    state = collect_graph_state(bundle_data)
    entities = state["entities"]
    fc_index = firecrawl_index or LocalVectorIndex.load(
        "firecrawl_corpus", base_dir=index_dir()
    )
    claims = claim_index or LocalVectorIndex.load("claim_raw", base_dir=index_dir())
    ids, matrix, _meta = entity_vectors(claims, min_claims=1)
    vectors_by_entity = {entity_id: matrix[row] for row, entity_id in enumerate(ids)}

    title_index: dict[str, str] = {}
    ambiguous: set[str] = set()
    for entity_id, entity in entities.items():
        for value in [entity.get("title", ""), *(entity.get("aliases") or [])]:
            key = _normalize_title(value)
            if len(key) < 3 or len(key.split()) > 8:
                continue
            if key in title_index and title_index[key] != entity_id:
                ambiguous.add(key)
            else:
                title_index[key] = entity_id
    for key in ambiguous:
        title_index.pop(key, None)

    pairs: dict[tuple[str, str], dict[str, Any]] = {}
    doc_freq: Counter[str] = Counter()
    chunk_entities: list[tuple[list[str], Any]] = []
    for unit in fc_index.units:
        words = _words(unit.text_raw)
        found: list[str] = []
        seen: set[str] = set()
        for start in range(len(words)):
            for size in range(1, 9):
                if start + size > len(words):
                    break
                entity_id = title_index.get(" ".join(words[start : start + size]))
                if entity_id and entity_id not in seen:
                    seen.add(entity_id)
                    found.append(entity_id)
                    if len(found) >= max_entities_per_chunk:
                        break
            if len(found) >= max_entities_per_chunk:
                break
        if len(found) < 2:
            continue
        doc_freq.update(found)
        chunk_entities.append((found, unit))

    # Entidades onipresentes ("Estado", "Capital", "Política") conectariam tudo
    # com tudo e afogariam a fila. O corte por frequência de documento remove
    # esses nós sem apagar o verbete do acervo.
    allowed = {entity_id for entity_id, freq in doc_freq.items() if freq <= max_entity_df}

    for found, unit in chunk_entities:
        found = [entity_id for entity_id in found if entity_id in allowed]
        if len(found) < 2:
            continue
        found.sort()
        url = unit.source_urls[0] if unit.source_urls else None
        for left in range(len(found)):
            for right in range(left + 1, len(found)):
                pair = (found[left], found[right])
                if pair in state["relationPairs"]:
                    continue
                record = pairs.setdefault(
                    pair,
                    {
                        "count": 0,
                        "evidence": [],
                    },
                )
                record["count"] += 1
                if url and len(record["evidence"]) < max_evidence:
                    record["evidence"].append(
                        {
                            "unit_id": unit.unit_id,
                            "title": unit.entity_title,
                            "section": unit.locators[0] if unit.locators else None,
                            "url": url,
                            "license": unit.metadata.get("license"),
                            "usagePolicy": unit.metadata.get("usagePolicy", "reference-only"),
                            "excerpt": unit.text_raw[:700],
                        }
                    )

    now = datetime.now(timezone.utc).isoformat()
    items: list[dict[str, Any]] = []
    for (left, right), record in pairs.items():
        vector_left = vectors_by_entity.get(left)
        vector_right = vectors_by_entity.get(right)
        similarity = (
            float(vector_left @ vector_right)
            if vector_left is not None and vector_right is not None
            else 0.0
        )
        if similarity < min_similarity and record["count"] < 2:
            continue
        if not record["evidence"]:
            continue
        left_entity = entities[left]
        right_entity = entities[right]
        brazil = any(
            hint in f"{left_entity['title']} {right_entity['title']}".lower()
            for hint in ("brasil", "vargas", "1964", "ditadura")
        )
        score = 30 + min(record["count"], 5) * 8 + 30 * max(0.0, similarity) + (5 if brazil else 0)
        items.append(
            {
                "id": f"rel-co-{left}--{right}",
                "fromEntityId": left,
                "toEntityId": right,
                "fromTitle": left_entity["title"],
                "toTitle": right_entity["title"],
                "fromKind": left_entity["kind"],
                "toKind": right_entity["kind"],
                "fromAliases": left_entity.get("aliases", [])[:6],
                "toAliases": right_entity.get("aliases", [])[:6],
                "cooccurrence": record["count"],
                "similarity": round(similarity, 4),
                "score": min(100, int(round(score))),
                "query": f"{left_entity['title']} {right_entity['title']} relação histórica",
                "evidence": record["evidence"],
                "ok": None,
            }
        )

    items.sort(key=lambda item: (-item["score"], -item["cooccurrence"]))
    items = items[:max_pairs]
    kind_counts = Counter(f"{item['fromKind']}->{item['toKind']}" for item in items)

    payload = {
        "generated_at": now,
        "release": release,
        "human_reviewed": False,
        "origin": "relation-cooccurrence-mining",
        "description": (
            "Pares de entidades que aparecem no mesmo trecho do corpus Firecrawl e ainda não "
            "têm relação editorial. Coocorrência não prova vínculo: cada par traz o trecho para "
            "conferência humana."
        ),
        "model": "BAAI/bge-m3 + corpus Firecrawl",
        "summary": {
            "firecrawl_chunks": len(fc_index.units),
            "entities_with_title": len(title_index),
            "entities_evaluated": len(entities),
            "filtered_ubiquitous": len(title_index) - len(allowed),
            "existing_relation_pairs": len(state["relationPairs"]),
            "candidates": len(items),
            "top_cooccurrence": items[0]["cooccurrence"] if items else None,
            "by_kind_pair": dict(kind_counts.most_common(10)),
            "brazil": sum(
                1
                for item in items
                if any(
                    hint in f"{item['fromTitle']} {item['toTitle']}".lower()
                    for hint in ("brasil", "vargas", "1964", "ditadura")
                )
            ),
        },
        "review": {
            "by": "ai",
            "model": "BAAI/bge-m3 + coocorrência",
            "stage": "relation-cooccurrence-mining",
            "verdict": "pending-human",
            "reviewedAt": now,
        },
        "items": items,
    }

    dest = output_path or (eval_dir() / "queues" / "relacoes-por-coocorrencia.json")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return {
        "output_path": str(dest),
        "release": release,
        "summary": payload["summary"],
        "top": [
            {
                "from": item["fromTitle"],
                "to": item["toTitle"],
                "score": item["score"],
                "cooccurrence": item["cooccurrence"],
                "similarity": item["similarity"],
            }
            for item in items[:12]
        ],
    }

def build_relation_candidate_queue(
    *,
    bundle_data: dict[str, Any] | None = None,
    index: LocalVectorIndex | None = None,
    index_name: str = "claim_raw",
    output_path: Path | None = None,
    top_k: int = 6,
    threshold: float = 0.55,
    max_pairs: int = 250,
    min_claims: int = 2,
) -> dict[str, Any]:
    """Gera a fila `relacoes-por-embedding.json` a partir do release e do índice."""
    if bundle_data is None:
        loaded = load_pinned_bundle()
        bundle_data = loaded.data
        release = loaded.release
    else:
        release = bundle_data.get("release") or "local"

    claim_index = index or LocalVectorIndex.load(index_name, base_dir=index_dir())
    ids, vectors, meta = entity_vectors(claim_index, min_claims=min_claims)
    state = collect_graph_state(bundle_data)
    titles = {entity_id: details.get("title", "") for entity_id, details in meta.items()}
    pairs = rank_entity_pairs(
        ids,
        vectors,
        existing_pairs=state["relationPairs"],
        titles=titles,
        top_k=top_k,
        threshold=threshold,
        max_pairs=max_pairs,
    )

    now = datetime.now(timezone.utc).isoformat()
    items: list[dict[str, Any]] = []
    for pair in pairs:
        a = meta[pair["a"]]
        b = meta[pair["b"]]
        items.append(
            {
                "id": f"rel-emb-{pair['a']}--{pair['b']}",
                "fromEntityId": pair["a"],
                "toEntityId": pair["b"],
                "fromTitle": a["title"],
                "toTitle": b["title"],
                "fromKind": a["kind"],
                "toKind": b["kind"],
                "similarity": pair["score"],
                "query": f"{a['title']} {b['title']} relação histórica",
                "fromClaims": _claim_excerpts(claim_index, pair["a"]),
                "toClaims": _claim_excerpts(claim_index, pair["b"]),
                "existingRelation": False,
                "ok": None,
            }
        )

    kind_counts = Counter(
        f"{item['fromKind']}->{item['toKind']}" for item in items
    )
    payload = {
        "generated_at": now,
        "release": release,
        "human_reviewed": False,
        "origin": "relation-embedding-mining",
        "description": (
            "Pares de entidades semanticamente próximos sem relação editorial no release. "
            "Similaridade não é evidência: cada par precisa de fonte que cite os dois lados."
        ),
        "model": "BAAI/bge-m3",
        "summary": {
            "entities_with_claims": len(ids),
            "claims_indexed": len(claim_index.units),
            "existing_relation_pairs": len(state["relationPairs"]),
            "candidates": len(items),
            "max_similarity": items[0]["similarity"] if items else None,
            "min_similarity": items[-1]["similarity"] if items else None,
            "by_kind_pair": dict(kind_counts.most_common(10)),
            "brazil": sum(
                1
                for item in items
                if any(
                    hint in f"{item['fromTitle']} {item['toTitle']}".lower()
                    for hint in ("brasil", "vargas", "1964", "ditadura")
                )
            ),
        },
        "review": {
            "by": "ai",
            "model": "BAAI/bge-m3",
            "stage": "relation-embedding-mining",
            "verdict": "pending-human",
            "reviewedAt": now,
        },
        "items": items,
    }

    dest = output_path or (eval_dir() / "queues" / "relacoes-por-embedding.json")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return {
        "output_path": str(dest),
        "release": release,
        "summary": payload["summary"],
        "top": [
            {
                "from": item["fromTitle"],
                "to": item["toTitle"],
                "score": item["similarity"],
            }
            for item in items[:12]
        ],
    }
