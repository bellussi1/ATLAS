"""Chunking, filtragem, embedding (BAAI/bge-m3) e busca semântica sobre o corpus Firecrawl Local."""

from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Sequence

import numpy as np

from atlas_rag.embed.bge_m3 import BgeM3Embedder, EncodeTelemetry
from atlas_rag.index.vector_store import LocalVectorIndex, build_manifest
from atlas_rag.ingest.public_sources import detect_prompt_injection
from atlas_rag.paths import eval_dir, index_dir, repo_root
from atlas_rag.retrieve.lexical import fold_pt
from atlas_rag.units.builder import RetrievalUnit

FIRECRAWL_INDEX_NAME = "firecrawl_corpus"
ATLAS_CLAIMS_INDEX_NAME = "claim_enriched"

PRIORITY_GRAPH_GAPS: tuple[dict[str, str], ...] = (
    {
        "id": "gap-ai5-1968",
        "topic": "Ato Institucional nº 5 (AI-5)",
        "query": "Ato Institucional nº 5 de 1968 recesso do Congresso suspensão de direitos políticos ditadura militar",
        "domain": "historia-brasil",
    },
    {
        "id": "gap-ai1-golpe-1964",
        "topic": "Golpe de 1964 e Ato Institucional nº 1",
        "query": "Ato Institucional nº 1 de 9 de abril de 1964 Comando Supremo da Revolução cassação de mandatos",
        "domain": "historia-brasil",
    },
    {
        "id": "gap-estado-novo-1937",
        "topic": "Getúlio Vargas — Estado Novo (Constituição de 1937)",
        "query": "Constituição de 1937 Estado Novo poderes do Presidente da República corporativismo Brasil",
        "domain": "historia-brasil",
    },
    {
        "id": "gap-constituicao-1988",
        "topic": "Constituição brasileira de 1988",
        "query": "Constituição da República Federativa do Brasil de 1988 direitos e garantias fundamentais cidadania",
        "domain": "historia-brasil",
    },
    {
        "id": "gap-abolicao-escravatura",
        "topic": "Abolição da escravatura no Brasil (1888)",
        "query": "Lei Áurea 1888 abolição da escravidão no Brasil Lei do Ventre Livre Lei Eusébio de Queirós",
        "domain": "historia-brasil",
    },
    {
        "id": "gap-proclamacao-republica",
        "topic": "Proclamação da República do Brasil (1889)",
        "query": "Decreto nº 1 de 1889 Proclamação da República Federativa do Brasil governo provisório",
        "domain": "historia-brasil",
    },
    {
        "id": "gap-lei-anistia-1979",
        "topic": "Lei da Anistia (1979)",
        "query": "Lei nº 6.683 de 1979 Lei da Anistia crimes políticos e conexos redemocratização Brasil",
        "domain": "historia-brasil",
    },
    {
        "id": "gap-prestes-tenentismo",
        "topic": "Luís Carlos Prestes — Tenentismo",
        "query": "Luís Carlos Prestes Coluna Prestes tenentismo comunismo no Brasil",
        "domain": "historia-brasil",
    },
    {
        "id": "gap-contrato-social",
        "topic": "Contrato social",
        "query": "Teoria do contrato social legitimidade do Estado Hobbes Locke Rousseau consentimento",
        "domain": "filosofia-politica",
    },
    {
        "id": "gap-montesquieu-poderes",
        "topic": "Montesquieu — Separação dos poderes",
        "query": "Montesquieu O Espírito das Leis separação dos poderes legislativo executivo judiciário contra despotismo",
        "domain": "filosofia-politica",
    },
    {
        "id": "gap-hegemonia-cultural",
        "topic": "Hegemonia cultural (Antonio Gramsci)",
        "query": "Antonio Gramsci conceito de hegemonia cultural sociedade civil consenso e coerção intelectuais orgânicos",
        "domain": "sociologia",
    },
    {
        "id": "gap-neoliberalismo",
        "topic": "Neoliberalismo (Hayek / Friedman)",
        "query": "Neoliberalismo Friedrich Hayek livre mercado desregulamentação crítica ao Estado de bem-estar",
        "domain": "filosofia-politica",
    },
    {
        "id": "gap-declaracao-eua-1776",
        "topic": "Declaração de Independência dos Estados Unidos (1776)",
        "query": "Declaração de Independência dos Estados Unidos 1776 direitos inalienáveis vida liberdade",
        "domain": "documento-primario",
    },
    {
        "id": "gap-revolucao-francesa-1789",
        "topic": "Revolução Francesa — Declaração dos Direitos do Homem e do Cidadão",
        "query": "Declaração dos Direitos do Homem e do Cidadão 1789 soberania nacional igualdade perante a lei liberalismo",
        "domain": "documento-primario",
    },
    {
        "id": "gap-paulo-freire",
        "topic": "Paulo Freire — Pedagogia do Oprimido",
        "query": "Paulo Freire Pedagogia do Oprimido educação bancária conscientização diálogo libertação",
        "domain": "sociologia",
    },
    {
        "id": "gap-frantz-fanon",
        "topic": "Frantz Fanon — Anticolonialismo",
        "query": "Frantz Fanon descolonização colonialismo racismo alienação luta anticolonial",
        "domain": "sociologia",
    },
    {
        "id": "gap-amilcar-cabral",
        "topic": "Amílcar Cabral — Guiné-Bissau e anticolonialismo",
        "query": "Amílcar Cabral libertação nacional Guiné-Bissau Cabo Verde cultura e resistência anticolonial",
        "domain": "historia-mundial",
    },
    {
        "id": "gap-desobediencia-civil",
        "topic": "Desobediência civil e direitos humanos",
        "query": "Desobediência civil resistência não violenta injustiça legal legitimidade democrática",
        "domain": "filosofia-politica",
    },
)

_SKIP_SECTIONS = frozenset(
    {
        "bibliography",
        "bibliografia",
        "academic tools",
        "other internet resources",
        "related entries",
        "references",
        "referencias",
        "notes",
        "notas",
        "acknowledgments",
        "acknowledgements",
        "further reading",
        "external links",
        "ligacoes externas",
        "see also",
        "ver tambem",
    }
)

_HEADING_RE = re.compile(r"^(#{1,4})\s+(.+?)\s*$")
_MD_LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]+\)")
_MD_IMG_RE = re.compile(r"!\[[^\]]*\]\([^)]+\)")


def firecrawl_corpus_dir(start: Path | None = None) -> Path:
    return repo_root(start) / "generated" / "firecrawl-corpus"


def _clean_markdown_line(line: str) -> str:
    text = _MD_IMG_RE.sub(" ", line)
    text = _MD_LINK_RE.sub(r"\1", text)
    text = text.replace("**", "").replace("__", "").replace("`", "")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _is_toc_or_boilerplate_paragraph(paragraph: str) -> bool:
    if len(paragraph) < 60:
        return True
    # Listas densas de índice / sumário (vários marcadores "- 1." / "1.1")
    if paragraph.startswith("- ") and paragraph.count(" - ") >= 3:
        return True
    lowered = paragraph.lower()
    if lowered.startswith("first published ") and "substantive revision" in lowered and len(paragraph) < 160:
        return True
    return False


def chunk_markdown_document(
    markdown: str,
    *,
    target_words: int = 220,
    max_words: int = 290,
) -> list[tuple[str, str]]:
    """Segmenta Markdown em chunks respeitando cabeçalhos e descartando bibliografia/ruído."""
    sections: list[tuple[str, list[str]]] = []
    current_heading = "Introdução"
    skip_section = False
    buffer: list[str] = []

    def flush_paragraph() -> None:
        nonlocal buffer
        if not buffer:
            return
        para = re.sub(r"\s+", " ", " ".join(buffer)).strip()
        buffer = []
        if not skip_section and para and not _is_toc_or_boilerplate_paragraph(para):
            if not sections or sections[-1][0] != current_heading:
                sections.append((current_heading, []))
            sections[-1][1].append(para)

    for raw_line in (markdown or "").splitlines():
        stripped = raw_line.strip()
        heading_match = _HEADING_RE.match(stripped)
        if heading_match:
            flush_paragraph()
            heading_text = _clean_markdown_line(heading_match.group(2))
            folded = fold_pt(re.sub(r"^\d+(?:\.\d+)*\.?\s*", "", heading_text))
            skip_section = folded in _SKIP_SECTIONS
            current_heading = heading_text or "Seção"
            continue

        if not stripped or stripped == "---" or stripped.startswith("| ---"):
            flush_paragraph()
            continue

        cleaned = _clean_markdown_line(stripped)
        if not cleaned:
            continue
        # Evita linhas soltas de TOC numerado de enciclopédia
        if re.match(r"^[-*]\s+\d+(?:\.\d+)*\.?\s+", stripped) and len(cleaned) < 120:
            continue
        buffer.append(cleaned)

    flush_paragraph()

    chunks: list[tuple[str, str]] = []
    for heading, paragraphs in sections:
        acc_paras: list[str] = []
        acc_words = 0

        for para in paragraphs:
            words = para.split()
            if len(words) > max_words:
                if acc_paras:
                    chunks.append((heading, " ".join(acc_paras)))
                    acc_paras = []
                    acc_words = 0
                # Quebra parágrafos muito longos em janelas de `target_words`
                for start in range(0, len(words), target_words):
                    piece = " ".join(words[start : start + target_words]).strip()
                    if len(piece) >= 60:
                        chunks.append((heading, piece))
                continue

            if acc_words + len(words) > max_words and acc_paras:
                chunks.append((heading, " ".join(acc_paras)))
                acc_paras = [para]
                acc_words = len(words)
            else:
                acc_paras.append(para)
                acc_words += len(words)
                if acc_words >= target_words:
                    chunks.append((heading, " ".join(acc_paras)))
                    acc_paras = []
                    acc_words = 0

        if acc_paras:
            joined = " ".join(acc_paras)
            if len(joined) >= 60:
                chunks.append((heading, joined))

    return chunks


def build_firecrawl_units(
    corpus_dir: Path | None = None,
    *,
    domains: Sequence[str] | None = None,
    target_words: int = 220,
    max_words: int = 290,
) -> tuple[list[RetrievalUnit], dict[str, Any]]:
    """Lê manifest.json e constrói RetrievalUnits limpas e verificadas contra prompt injection."""
    root = corpus_dir or firecrawl_corpus_dir()
    manifest_path = root / "manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(
            f"Manifesto Firecrawl não encontrado em {manifest_path}. Rode `npm run firecrawl:extract` primeiro."
        )

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    domain_filter = set(domains) if domains else None
    units: list[RetrievalUnit] = []
    stats = {
        "documents_total": 0,
        "documents_indexed": 0,
        "chunks_built": 0,
        "chunks_dropped_injection": 0,
        "by_domain": {},
        "by_usage_policy": {},
    }

    digest = hashlib.sha256()

    for item in manifest.get("items", []):
        if item.get("status") != "ok":
            continue
        domain = item.get("domain", "desconhecido")
        if domain_filter and domain not in domain_filter:
            continue
        stats["documents_total"] += 1

        rel_md = item.get("localMarkdownPath")
        if not rel_md:
            continue
        md_path = root / rel_md
        if not md_path.exists():
            continue

        markdown = md_path.read_text(encoding="utf-8")
        digest.update((item.get("sha256") or "").encode("utf-8"))
        chunks = chunk_markdown_document(markdown, target_words=target_words, max_words=max_words)
        if not chunks:
            continue

        stats["documents_indexed"] += 1
        stats["by_domain"][domain] = stats["by_domain"].get(domain, 0) + 1
        policy = item.get("usagePolicy", "reference-only")
        stats["by_usage_policy"][policy] = stats["by_usage_policy"].get(policy, 0) + 1

        slug = item["slug"]
        title = item["title"]
        source_name = item.get("sourceName", "Firecrawl Local")
        url = item["url"]
        language = item.get("language", "en")

        for idx, (heading, text) in enumerate(chunks):
            if detect_prompt_injection(text):
                stats["chunks_dropped_injection"] += 1
                continue
            enriched = f"[{domain} | {title} | {heading}] {text}"
            units.append(
                RetrievalUnit(
                    unit_id=f"fc::{slug}::{idx:04d}",
                    granularity="firecrawl_chunk",
                    entity_id=f"firecrawl::{slug}",
                    entity_title=title,
                    entity_slug=slug,
                    entity_kind=domain,
                    scope=language,
                    atlas_id="firecrawl-local",
                    text_raw=text,
                    text_enriched=enriched,
                    classification=policy,
                    editorial_status="external_corpus",
                    source_ids=(slug,),
                    source_titles=(f"{source_name} — {title}",),
                    source_urls=(url,),
                    locators=(heading,),
                    metadata={
                        "license": item.get("license"),
                        "usagePolicy": policy,
                        "atlasGap": item.get("atlasGap"),
                        "domain": domain,
                        "language": language,
                        "sourceName": source_name,
                        "sha256": item.get("sha256"),
                        "word_count": len(text.split()),
                        "origin": item.get("origin"),
                        "review": item.get("review"),
                        "discoveredFrom": item.get("discoveredFrom"),
                    },
                )
            )
            stats["chunks_built"] += 1

    stats["corpus_sha256"] = digest.hexdigest()
    return units, stats


def index_firecrawl_corpus(
    *,
    corpus_dir: Path | None = None,
    base_index_dir: Path | None = None,
    index_name: str = FIRECRAWL_INDEX_NAME,
    domains: Sequence[str] | None = None,
    batch_size: int = 32,
    incremental: bool = True,
    embedder_factory: Callable[[], Any] | None = None,
) -> dict[str, Any]:
    """Constrói unidades, reutiliza vetores inalterados e embeda só o que mudou.

    Com `incremental=True`, vetores de documentos cujo `sha256` e `unit_id` não
    mudaram são reaproveitados do índice em disco. Sem documento novo, o modelo
    BAAI/bge-m3 nem é carregado na GPU.
    """
    units, stats = build_firecrawl_units(corpus_dir=corpus_dir, domains=domains)
    if not units:
        raise ValueError("Nenhuma unidade válida construída a partir do corpus Firecrawl.")

    root_index_dir = base_index_dir or index_dir()
    existing: LocalVectorIndex | None = None
    if incremental and (root_index_dir / index_name / "vectors.npy").exists():
        try:
            existing = LocalVectorIndex.load(index_name, base_dir=root_index_dir)
        except (FileNotFoundError, ValueError):
            existing = None

    reusable: dict[int, Any] = {}
    to_embed: list[int] = []
    if existing is not None:
        for position, unit in enumerate(units):
            old_unit = existing.unit_by_id.get(unit.unit_id)
            if old_unit is None:
                to_embed.append(position)
                continue
            same_document = (
                unit.metadata.get("sha256") is not None
                and old_unit.metadata.get("sha256") == unit.metadata.get("sha256")
                and old_unit.text_enriched == unit.text_enriched
            )
            if same_document:
                reusable[position] = existing.vectors[existing.id_to_pos[unit.unit_id]]
            else:
                to_embed.append(position)
    else:
        to_embed = list(range(len(units)))

    new_vectors: Any = None
    telemetry_obj: EncodeTelemetry | None = None
    if to_embed:
        factory = embedder_factory or BgeM3Embedder
        embedder = factory()
        try:
            new_vectors, telemetry = embedder.encode_texts(
                [units[i].text_enriched for i in to_embed],
                batch_size=batch_size,
            )
            telemetry_obj = telemetry
        finally:
            unload = getattr(embedder, "unload", None)
            if callable(unload):
                unload()

    if to_embed and new_vectors is not None:
        dim = int(new_vectors.shape[1])
        if reusable and next(iter(reusable.values())).shape[0] != dim:
            # Modelo ou dimensão mudou: reembeda tudo para não misturar espaços vetoriais.
            reusable = {}
            embedder = (embedder_factory or BgeM3Embedder)()
            try:
                new_vectors, telemetry = embedder.encode_texts(
                    [u.text_enriched for u in units], batch_size=batch_size
                )
                telemetry_obj = telemetry
            finally:
                unload = getattr(embedder, "unload", None)
                if callable(unload):
                    unload()
            dim = int(new_vectors.shape[1])
            to_embed = list(range(len(units)))
    elif reusable:
        dim = int(next(iter(reusable.values())).shape[0])
        if existing is not None and isinstance(existing.manifest.get("telemetry"), dict):
            telemetry_obj = EncodeTelemetry(**existing.manifest["telemetry"])
    else:
        raise ValueError("Nenhum vetor disponível para montar o índice.")

    vectors = np.empty((len(units), dim), dtype=np.float32)
    for position, vector in reusable.items():
        vectors[position] = vector
    if to_embed and new_vectors is not None:
        vectors[to_embed] = new_vectors

    if telemetry_obj is None:
        telemetry_obj = EncodeTelemetry(
            model_name="reused-index",
            device="unknown",
            dtype="unknown",
            count=len(units),
            dim=dim,
            elapsed_seconds=0.0,
            items_per_second=0.0,
            peak_vram_mb=0.0,
        )

    stats["vectors_reused"] = len(reusable)
    stats["vectors_embedded"] = len(to_embed)

    manifest = build_manifest(
        name=index_name,
        bundle_sha256=stats["corpus_sha256"],
        use_enriched=True,
        telemetry=telemetry_obj,
        units=units,
    )
    manifest["corpus_stats"] = stats
    manifest["incremental"] = bool(incremental)

    vec_index = LocalVectorIndex(name=index_name, vectors=vectors, units=units, manifest=manifest)
    saved_path = vec_index.save(base_dir=root_index_dir)
    return {
        "index_name": index_name,
        "saved_path": str(saved_path),
        "stats": stats,
        "telemetry": manifest["telemetry"],
    }


def query_firecrawl_corpus(
    query: str,
    *,
    top_k: int = 8,
    domain: str | None = None,
    usage_policy: str | None = None,
    base_index_dir: Path | None = None,
    index_name: str = FIRECRAWL_INDEX_NAME,
) -> dict[str, Any]:
    """Consulta semântica multilíngue (PT/EN) sobre o índice vetorial do corpus Firecrawl."""
    vec_index = LocalVectorIndex.load(index_name, base_dir=base_index_dir or index_dir())
    embedder = BgeM3Embedder()
    try:
        q_vecs, _ = embedder.encode_texts([query], batch_size=1)
    finally:
        embedder.unload()

    fetch_k = max(top_k * 4, 30) if (domain or usage_policy) else top_k
    raw_hits = vec_index.search_vector(q_vecs[0], top_k=fetch_k)

    hits: list[dict[str, Any]] = []
    for unit, score in raw_hits:
        if domain and unit.entity_kind != domain:
            continue
        if usage_policy and unit.metadata.get("usagePolicy") != usage_policy:
            continue
        hits.append(
            {
                "score": round(score, 4),
                "unit_id": unit.unit_id,
                "title": unit.entity_title,
                "domain": unit.entity_kind,
                "language": unit.scope,
                "section": unit.locators[0] if unit.locators else None,
                "url": unit.source_urls[0] if unit.source_urls else None,
                "sourceName": unit.metadata.get("sourceName"),
                "license": unit.metadata.get("license"),
                "usagePolicy": unit.metadata.get("usagePolicy"),
                "atlasGap": unit.metadata.get("atlasGap"),
                "excerpt": unit.text_raw[:450],
            }
        )
        if len(hits) >= top_k:
            break

    return {
        "query": query,
        "index_name": index_name,
        "total_indexed_chunks": len(vec_index.units),
        "filters": {"domain": domain, "usage_policy": usage_policy},
        "hits": hits,
    }


def search_atlas_and_firecrawl(
    query: str,
    *,
    top_k: int = 5,
    base_index_dir: Path | None = None,
    atlas_index_name: str = ATLAS_CLAIMS_INDEX_NAME,
    firecrawl_index_name: str = FIRECRAWL_INDEX_NAME,
) -> dict[str, Any]:
    """Consulta unificada (acervo publicado ATLAS + corpus Firecrawl Local) com um único embedding."""
    root = base_index_dir or index_dir()
    fc_index = LocalVectorIndex.load(firecrawl_index_name, base_dir=root)
    atlas_index: LocalVectorIndex | None = None
    if (root / atlas_index_name / "vectors.npy").exists():
        atlas_index = LocalVectorIndex.load(atlas_index_name, base_dir=root)

    embedder = BgeM3Embedder()
    try:
        q_vecs, _ = embedder.encode_texts([query], batch_size=1)
    finally:
        embedder.unload()

    q_vec = q_vecs[0]
    atlas_hits: list[dict[str, Any]] = []
    if atlas_index is not None:
        for unit, score in atlas_index.search_vector(q_vec, top_k=top_k):
            atlas_hits.append(
                {
                    "score": round(score, 4),
                    "unit_id": unit.unit_id,
                    "entity_title": unit.entity_title,
                    "entity_kind": unit.entity_kind,
                    "classification": unit.classification,
                    "url": unit.source_urls[0] if unit.source_urls else None,
                    "text": unit.text_raw[:350],
                }
            )

    fc_hits: list[dict[str, Any]] = []
    for unit, score in fc_index.search_vector(q_vec, top_k=top_k):
        policy = unit.metadata.get("usagePolicy", "reference-only")
        fc_hits.append(
            {
                "score": round(score, 4),
                "unit_id": unit.unit_id,
                "title": unit.entity_title,
                "domain": unit.entity_kind,
                "section": unit.locators[0] if unit.locators else None,
                "url": unit.source_urls[0] if unit.source_urls else None,
                "license": unit.metadata.get("license"),
                "usagePolicy": policy,
                "atlasGap": unit.metadata.get("atlasGap"),
                "excerpt": unit.text_raw[:420] if policy == "open-reuse" else unit.text_raw[:220],
            }
        )

    best_atlas = atlas_hits[0]["score"] if atlas_hits else 0.0
    best_fc = fc_hits[0]["score"] if fc_hits else 0.0
    return {
        "query": query,
        "best_atlas_score": best_atlas,
        "best_firecrawl_score": best_fc,
        "gap_opportunity": bool(best_fc >= 0.56 and best_fc > best_atlas + 0.04),
        "atlas_published_hits": atlas_hits,
        "firecrawl_external_hits": fc_hits,
    }


def build_gap_evidence_queue(
    *,
    gaps: Sequence[dict[str, str]] = PRIORITY_GRAPH_GAPS,
    top_k: int = 4,
    base_index_dir: Path | None = None,
    output_path: Path | None = None,
) -> dict[str, Any]:
    """Minera evidências do corpus Firecrawl para fechar lacunas de GRAFO-TIPOS.md (ok=null até revisão humana)."""
    root = base_index_dir or index_dir()
    fc_index = LocalVectorIndex.load(FIRECRAWL_INDEX_NAME, base_dir=root)
    atlas_index: LocalVectorIndex | None = None
    if (root / ATLAS_CLAIMS_INDEX_NAME / "vectors.npy").exists():
        atlas_index = LocalVectorIndex.load(ATLAS_CLAIMS_INDEX_NAME, base_dir=root)

    embedder = BgeM3Embedder()
    try:
        q_vecs, telemetry = embedder.encode_texts([g["query"] for g in gaps], batch_size=16)
    finally:
        embedder.unload()

    now_iso = datetime.now(timezone.utc).isoformat()
    items: list[dict[str, Any]] = []

    for idx, gap in enumerate(gaps):
        q_vec = q_vecs[idx]
        atlas_top = atlas_index.search_vector(q_vec, top_k=2) if atlas_index is not None else []
        fc_top = fc_index.search_vector(q_vec, top_k=top_k)

        best_atlas = round(atlas_top[0][1], 4) if atlas_top else 0.0
        best_fc = round(fc_top[0][1], 4) if fc_top else 0.0

        evidence_candidates: list[dict[str, Any]] = []
        for unit, score in fc_top:
            policy = unit.metadata.get("usagePolicy", "reference-only")
            candidate: dict[str, Any] = {
                "score": round(score, 4),
                "unit_id": unit.unit_id,
                "source_title": unit.source_titles[0] if unit.source_titles else unit.entity_title,
                "section": unit.locators[0] if unit.locators else None,
                "url": unit.source_urls[0] if unit.source_urls else None,
                "license": unit.metadata.get("license"),
                "usagePolicy": policy,
                "language": unit.scope,
            }
            if policy == "open-reuse":
                # Domínio público: pode guardar trecho literal completo para citação direta
                candidate["open_reuse_excerpt"] = unit.text_raw[:500]
            else:
                # Reference-only (SEP/IEP/MIA): guarda apenas referência bibliográfica + lead curto
                candidate["reference_lead"] = unit.text_raw[:180]
            evidence_candidates.append(candidate)

        items.append(
            {
                "id": gap["id"],
                "topic": gap["topic"],
                "domain": gap["domain"],
                "query": gap["query"],
                "best_atlas_score": best_atlas,
                "best_firecrawl_score": best_fc,
                "atlas_nearest": [
                    {
                        "score": round(s, 4),
                        "entity_title": u.entity_title,
                        "unit_id": u.unit_id,
                    }
                    for u, s in atlas_top
                ],
                "firecrawl_evidences": evidence_candidates,
                "review": {
                    "by": "ai",
                    "model": "BAAI/bge-m3",
                    "stage": "firecrawl-gap-mining",
                    "verdict": "pending-human",
                    "reviewedAt": now_iso,
                },
                "note": (
                    "[conferência de IA] Evidências recuperadas localmente via Firecrawl Local + BAAI/bge-m3 "
                    "para subsidiar redação/revisão humana de verbetes e relações ausentes em GRAFO-TIPOS.md."
                ),
                "ok": None,
            }
        )

    payload = {
        "generated_at": now_iso,
        "license": "CC BY-SA 4.0 (metadados da fila; respeitar usagePolicy de cada fonte referenciada)",
        "human_reviewed": False,
        "origin": "firecrawl-local-rag-gap-mining",
        "model": "BAAI/bge-m3",
        "count": len(items),
        "telemetry": {
            "queries": telemetry.count,
            "elapsed_seconds": telemetry.elapsed_seconds,
            "device": telemetry.device,
        },
        "items": items,
    }

    dest = output_path or (eval_dir() / "queues" / "firecrawl-lacunas-evidencias.json")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return {
        "output_path": str(dest),
        "count": len(items),
        "avg_best_firecrawl_score": round(
            sum(i["best_firecrawl_score"] for i in items) / max(len(items), 1), 4
        ),
        "avg_best_atlas_score": round(
            sum(i["best_atlas_score"] for i in items) / max(len(items), 1), 4
        ),
    }
