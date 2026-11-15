"""Recuperação lexical (réplica da busca atual, overlap em claims e BM25Okapi)."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from typing import Iterable

from rank_bm25 import BM25Okapi

from atlas_rag.units.builder import RetrievalUnit

PT_STOPWORDS: frozenset[str] = frozenset(
    {
        "a",
        "ao",
        "aos",
        "as",
        "ate",
        "com",
        "como",
        "contra",
        "da",
        "das",
        "de",
        "do",
        "dos",
        "e",
        "em",
        "entre",
        "era",
        "essa",
        "esse",
        "esta",
        "este",
        "foi",
        "ha",
        "iss",
        "isso",
        "isto",
        "ja",
        "mais",
        "mas",
        "na",
        "nao",
        "nas",
        "nem",
        "no",
        "nos",
        "o",
        "os",
        "ou",
        "para",
        "pela",
        "pelas",
        "pelo",
        "pelos",
        "por",
        "quais",
        "qual",
        "quando",
        "que",
        "quem",
        "se",
        "sem",
        "ser",
        "seu",
        "seus",
        "sob",
        "sobre",
        "sao",
        "sua",
        "suas",
        "tem",
        "tendo",
        "um",
        "uma",
        "umas",
        "uns",
        "há",
        "nao",
        "sao",
    }
)


def fold_pt(text: str) -> str:
    """Normaliza texto removendo diacríticos (NFD) e convertendo para minúsculas."""
    decomposed = unicodedata.normalize("NFD", (text or "").lower())
    return "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")


def tokenize_bm25(text: str, *, remove_stopwords: bool = True) -> list[str]:
    """Tokeniza texto normalizado em português removendo stopwords opcionais."""
    tokens = re.findall(r"[a-z0-9]+", fold_pt(text))
    if not remove_stopwords:
        return tokens
    return [tok for tok in tokens if len(tok) >= 2 and tok not in PT_STOPWORDS]


def tokenize_strict_query(text: str) -> list[str]:
    """Replica a divisão por espaços do discovery-index.ts (normalizeText.split(/\\s+/))."""
    folded = fold_pt(text)
    cleaned = re.sub(r"[^\w\s]", " ", folded)
    return [tok for tok in cleaned.split() if len(tok) >= 1]


def _name_match_score(unit: RetrievalUnit, q_folded: str) -> int:
    title = fold_pt(unit.entity_title)
    aliases = [fold_pt(a) for a in unit.aliases]
    if title == q_folded or any(a == q_folded for a in aliases):
        return 4
    if title.startswith(q_folded) or any(a.startswith(q_folded) for a in aliases):
        return 3
    if q_folded in title or any(q_folded in a for a in aliases):
        return 2
    return 0


@dataclass(frozen=True)
class ScoredHit:
    unit_id: str
    score: float
    entity_id: str
    granularity: str


class StrictCurrentLexicalRetriever:
    """Réplica fiel da busca lexical do ATLAS (discovery-index.ts):
    1) nameMatchScore sobre título/aliases -> ordenação descendente de score + alfabética;
    2) fallback AND (todos os termos em searchText) ordenado alfabeticamente por título.
    """

    def __init__(self, entity_units: Iterable[RetrievalUnit]) -> None:
        self.units = list(entity_units)
        self._search_texts = [fold_pt(u.text_enriched) for u in self.units]

    def search(self, query: str, top_k: int = 20) -> list[ScoredHit]:
        q_folded = re.sub(r"[^\w\s]", " ", fold_pt(query)).strip()
        if not q_folded:
            return []
        # Stage 1: short-circuit no match de nome/alias se houver
        named: list[tuple[int, str, RetrievalUnit]] = []
        for u in self.units:
            score = _name_match_score(u, q_folded)
            if score > 0:
                named.append((score, fold_pt(u.entity_title), u))
        if named:
            named.sort(key=lambda item: (-item[0], item[1]))
            return [
                ScoredHit(unit_id=u.unit_id, score=float(score), entity_id=u.entity_id, granularity=u.granularity)
                for score, _, u in named[:top_k]
            ]

        # Stage 2: fallback estrito AND de todos os termos da consulta
        terms = [t for t in q_folded.split() if t]
        matched: list[tuple[str, RetrievalUnit]] = []
        for u, stext in zip(self.units, self._search_texts):
            if all(term in stext for term in terms):
                matched.append((fold_pt(u.entity_title), u))
        matched.sort(key=lambda item: item[0])
        return [
            ScoredHit(unit_id=u.unit_id, score=1.0, entity_id=u.entity_id, granularity=u.granularity)
            for _, u in matched[:top_k]
        ]


class ContentOverlapLexicalRetriever:
    """Baseline lexical ajustada para perguntas: overlap ponderado sem stopwords + bônus de título."""

    def __init__(self, units: Iterable[RetrievalUnit]) -> None:
        self.units = list(units)
        self._doc_tokens: list[set[str]] = [set(tokenize_bm25(u.text_enriched)) for u in self.units]
        self._title_tokens: list[set[str]] = [set(tokenize_bm25(u.entity_title)) for u in self.units]

    def search(self, query: str, top_k: int = 20) -> list[ScoredHit]:
        q_tokens = tokenize_bm25(query)
        if not q_tokens:
            return []
        q_set = set(q_tokens)
        scored: list[tuple[float, str, RetrievalUnit]] = []
        for u, dt, tt in zip(self.units, self._doc_tokens, self._title_tokens):
            overlap = len(q_set & dt)
            if overlap == 0:
                continue
            title_hits = len(q_set & tt)
            score = (overlap / len(q_set)) + 0.35 * title_hits
            scored.append((score, u.unit_id, u))
        scored.sort(key=lambda item: (-item[0], item[1]))
        return [
            ScoredHit(unit_id=u.unit_id, score=float(score), entity_id=u.entity_id, granularity=u.granularity)
            for score, _, u in scored[:top_k]
        ]


class BM25Retriever:
    """Recuperador BM25Okapi sobre tokens normalizados (sem stopwords em PT-BR)."""

    def __init__(self, units: Iterable[RetrievalUnit]) -> None:
        self.units = list(units)
        self._tokenized = [tokenize_bm25(u.text_enriched) for u in self.units]
        self._bm25 = BM25Okapi(self._tokenized)

    def search(self, query: str, top_k: int = 20) -> list[ScoredHit]:
        q_tokens = tokenize_bm25(query)
        if not q_tokens:
            return []
        scores = self._bm25.get_scores(q_tokens)
        # Ordena índices por score decrescente
        top_indices = sorted(
            (idx for idx, s in enumerate(scores) if s > 0.0),
            key=lambda idx: (-float(scores[idx]), self.units[idx].unit_id),
        )[:top_k]
        return [
            ScoredHit(
                unit_id=self.units[idx].unit_id,
                score=float(scores[idx]),
                entity_id=self.units[idx].entity_id,
                granularity=self.units[idx].granularity,
            )
            for idx in top_indices
        ]
