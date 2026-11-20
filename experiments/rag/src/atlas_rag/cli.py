"""CLI unificada do experimento ATLAS RAG (atlas-rag)."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Sequence

from atlas_rag.eval.dataset import build_and_write_dataset
from atlas_rag.eval.phase0_inventory import run_phase0
from atlas_rag.eval.phase2_runner import run_phase2
from atlas_rag.eval.phase3_runner import run_phase3
from atlas_rag.eval.phase4_runner import run_phase4
from atlas_rag.eval.regression import build_default_thresholds_from_runs, check_regression
from atlas_rag.eval.security import run_security_suite
from atlas_rag.ingest.continuous_enrichment import (
    DEFAULT_DRAFT_MODEL,
    run_enrichment_cycle,
    run_enrichment_loop,
)
from atlas_rag.ingest.claim_expansion import expand_claims_with_ollama
from atlas_rag.ingest.firecrawl_corpus import (
    build_gap_evidence_queue,
    index_firecrawl_corpus,
    query_firecrawl_corpus,
    search_atlas_and_firecrawl,
)
from atlas_rag.ingest.relation_drafts import draft_relations_with_ollama
from atlas_rag.mining.graph_gaps import build_graph_gap_queue
from atlas_rag.mining.relation_candidates import (
    build_cooccurrence_relation_queue,
    build_relation_candidate_queue,
    build_relation_pattern_queue,
)
from atlas_rag.ingest.public_sources import detect_installed_local_models, run_public_ingest
from atlas_rag.mining.acervo_miner import run_archive_mining, run_queue_ai_triage


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="atlas-rag", description="Busca semântica, RAG e avaliação do ATLAS")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("phase0", help="Inventário, deduplicação e contagem de tokens")
    sub.add_parser("phase1", help="Gera conjunto de avaliação e fila de revisão humana")

    p2 = sub.add_parser("phase2", help="Baselines de recuperação e reranking em GPU")
    p2.add_argument("--rebuild-index", action="store_true", help="Reconstruir vetores bge-m3 em disco")

    p3 = sub.add_parser("phase3", help="Geração com citações, travas e juiz calibrado")
    p3.add_argument("--limit", type=int, default=None, help="Limita quantidade de perguntas")

    sub.add_parser("phase4", help="Ablação consciente do grafo editorial vs descoberta")
    sub.add_parser("phase5-security", help="Suite adversarial de prompt injection")
    sub.add_parser("phase5-thresholds", help="Deriva limiares de regressão a partir dos baselines")
    sub.add_parser("ci-check", help="Verifica métricas versionadas contra baseline_thresholds.json")
    sub.add_parser("mine", help="Minera filas humanas de expansão do acervo (Seção 6)")
    sub.add_parser(
        "triage-queues",
        help="Pré-triagem por IA em queues/*.json preservando ok=null até revisão humana",
    )
    sub.add_parser("models", help="Lista modelos locais configurados (Ollama + GPU HuggingFace)")

    p_ingest = sub.add_parser(
        "ingest-public",
        help="Limpa, extrai afirmações com citação literal e embebeda fontes públicas localmente",
    )
    p_ingest.add_argument("--topic", default=None, help="Tema capturado em generated/wiki-extract/<tema>")
    p_ingest.add_argument("--wiki-title", default=None, help="Título de artigo da Wikipedia para captura local")
    p_ingest.add_argument("--input", type=Path, default=None, help="Arquivo JSON ou TXT local de entrada")
    p_ingest.add_argument("--lang", default="pt", help="Idioma da Wikipedia (padrão: pt)")
    p_ingest.add_argument(
        "--extractor",
        choices=["extractive", "ollama"],
        default="extractive",
        help="Modo de extração local (padrão: extractive)",
    )
    p_ingest.add_argument("--model", default="qwen3:8b-q4_K_M", help="Modelo Ollama para extração estruturada")
    p_ingest.add_argument("--limit", type=int, default=5, help="Máximo de artigos capturados do tema")
    p_ingest.add_argument("--max-paragraphs", type=int, default=30, help="Máximo de parágrafos processados")
    embed_group = p_ingest.add_mutually_exclusive_group()
    embed_group.add_argument("--embed", dest="embed", action="store_true", help="Gera embeddings bge-m3 na GPU")
    embed_group.add_argument("--no-embed", dest="embed", action="store_false", help="Pula etapa de embedding GPU")
    p_ingest.set_defaults(embed=True)

    p_fc = sub.add_parser(
        "ingest-firecrawl",
        help="Faz chunking, filtra e gera embeddings BAAI/bge-m3 na GPU para o corpus Firecrawl Local",
    )
    p_fc.add_argument("--domain", action="append", default=None, help="Filtra por domínio (pode repetir)")
    p_fc.add_argument("--batch-size", type=int, default=32, help="Tamanho de lote GPU para bge-m3")
    p_fc.add_argument(
        "--full-embed",
        action="store_true",
        help="Reembeda todo o corpus em vez de reaproveitar vetores inalterados",
    )

    p_fcq = sub.add_parser(
        "query-firecrawl",
        help="Busca semântica multilíngue (PT/EN) sobre o índice vetorial do corpus Firecrawl",
    )
    p_fcq.add_argument("query", help="Pergunta ou tema de pesquisa")
    p_fcq.add_argument("--top-k", type=int, default=8, help="Quantidade de trechos retornados")
    p_fcq.add_argument("--domain", default=None, help="Filtra por domínio")
    p_fcq.add_argument(
        "--usage-policy",
        choices=["open-reuse", "reference-only"],
        default=None,
        help="Filtra por política editorial de licença",
    )

    p_search = sub.add_parser(
        "search-all",
        help="Busca semântica unificada no acervo publicado ATLAS + corpus Firecrawl Local",
    )
    p_search.add_argument("query", nargs="+", help="Pergunta ou tema de pesquisa")
    p_search.add_argument("--top-k", type=int, default=5, help="Trechos por índice")

    p_gaps = sub.add_parser(
        "mine-firecrawl-gaps",
        help="Gera fila de evidências em eval/queues/firecrawl-lacunas-evidencias.json (ok=null)",
    )
    p_gaps.add_argument("--top-k", type=int, default=4, help="Evidências por lacuna")

    p_graph = sub.add_parser(
        "graph-gaps",
        help="Minera lacunas direto no grafo publicado (eval/queues/lacunas-do-grafo.json)",
    )
    p_graph.add_argument("--limit", type=int, default=400, help="Máximo de entidades na fila")
    p_graph.add_argument("--min-score", type=int, default=40, help="Score mínimo da fila")

    p_rel = sub.add_parser(
        "mine-relations",
        help="Cruza entidades por embeddings ou coocorrência no corpus e grava fila de relações",
    )
    p_rel.add_argument(
        "--mode",
        choices=["coocorrencia", "embeddings", "padrao"],
        default="coocorrencia",
        help="Pista principal do cruzamento (padrão: coocorrência no corpus)",
    )
    p_rel.add_argument("--top-k", type=int, default=6, help="Vizinhos por entidade (modo embeddings)")
    p_rel.add_argument("--threshold", type=float, default=0.55, help="Similaridade mínima (embeddings)")
    p_rel.add_argument("--max-pairs", type=int, default=250, help="Pares máximo na fila")
    p_rel.add_argument(
        "--index",
        default="claim_raw",
        help="Índice de afirmações usado no agrupamento (padrão: claim_raw)",
    )

    p_rel_drafts = sub.add_parser(
        "draft-relations",
        help="Propõe família, rótulo e fonte para pares da fila de embeddings (Ollama local)",
    )
    p_rel_drafts.add_argument("--max-drafts", type=int, default=5)
    p_rel_drafts.add_argument("--model", default=DEFAULT_DRAFT_MODEL)
    p_rel_drafts.add_argument("--force", action="store_true", help="Regrava rascunhos existentes")
    p_rel_drafts.add_argument(
        "--queue",
        type=Path,
        default=None,
        help="Fila de relações (padrão: eval/queues/relacoes-por-coocorrencia.json)",
    )

    p_expand = sub.add_parser(
        "expand-claims",
        help="Propõe novas afirmações para entidades com conteúdo fino (Ollama local)",
    )
    p_expand.add_argument("--max-entities", type=int, default=3)
    p_expand.add_argument("--model", default=DEFAULT_DRAFT_MODEL)
    p_expand.add_argument("--force", action="store_true", help="Regrava rascunhos existentes")

    p_enrich = sub.add_parser(
        "enrich",
        help="Ciclo local completo (ou contínuo): Firecrawl -> bge-m3 GPU -> RAG -> Rascunhos Ollama",
    )
    p_enrich.add_argument("--max-drafts", type=int, default=3, help="Rascunhos Ollama por ciclo")
    p_enrich.add_argument("--model", default=DEFAULT_DRAFT_MODEL, help="Modelo Ollama local")
    p_enrich.add_argument("--skip-scrape", action="store_true", help="Pula etapa Firecrawl Local")
    p_enrich.add_argument("--skip-embed", action="store_true", help="Pula etapa bge-m3 GPU")
    p_enrich.add_argument(
        "--no-discover",
        action="store_true",
        help="Não busca novas fontes em Wikidata/Wikipédia/Marxists neste ciclo",
    )
    p_enrich.add_argument(
        "--max-new-seeds",
        type=int,
        default=12,
        help="Máximo de seeds descobertos acrescentados por ciclo",
    )
    p_enrich.add_argument(
        "--min-score",
        type=int,
        default=70,
        help="Score mínimo para aceitar um candidato de descoberta",
    )
    p_enrich.add_argument(
        "--full-embed",
        action="store_true",
        help="Reembeda o corpus inteiro em vez de reaproveitar vetores inalterados",
    )
    p_enrich.add_argument(
        "--max-relations",
        type=int,
        default=3,
        help="Propostas de relação por ciclo",
    )
    p_enrich.add_argument(
        "--no-relations",
        action="store_true",
        help="Pula o cruzamento e os rascunhos de relação",
    )
    p_enrich.add_argument(
        "--max-expansions",
        type=int,
        default=2,
        help="Entidades com expansão de afirmações por ciclo",
    )
    p_enrich.add_argument(
        "--no-expand",
        action="store_true",
        help="Pula a expansão de afirmações de entidades existentes",
    )
    p_enrich.add_argument(
        "--graph-limit",
        type=int,
        default=400,
        help="Entidades consideradas na fila de lacunas do grafo",
    )
    p_enrich.add_argument(
        "--no-graph-gaps",
        action="store_true",
        help="Não recalcula a fila de lacunas do grafo neste ciclo",
    )
    p_enrich.add_argument("--loop", action="store_true", help="Mantém o ciclo rodando continuamente")
    p_enrich.add_argument(
        "--interval-minutes",
        type=int,
        default=60,
        help="Intervalo em minutos entre ciclos quando --loop estiver ativo",
    )
    p_enrich.add_argument("--max-cycles", type=int, default=None, help="Limite de ciclos em modo --loop")

    args = parser.parse_args(list(argv) if argv is not None else None)

    if args.cmd == "phase0":
        print(json.dumps(run_phase0(), indent=2, ensure_ascii=False))
    elif args.cmd == "phase1":
        print(json.dumps(build_and_write_dataset(), indent=2, ensure_ascii=False))
    elif args.cmd == "phase2":
        print(json.dumps(run_phase2(force_rebuild_index=args.rebuild_index), indent=2, ensure_ascii=False))
    elif args.cmd == "phase3":
        print(json.dumps(run_phase3(limit=args.limit), indent=2, ensure_ascii=False))
    elif args.cmd == "phase4":
        print(json.dumps(run_phase4(), indent=2, ensure_ascii=False))
    elif args.cmd == "phase5-security":
        print(json.dumps(run_security_suite(), indent=2, ensure_ascii=False))
    elif args.cmd == "phase5-thresholds":
        print(json.dumps(build_default_thresholds_from_runs(), indent=2, ensure_ascii=False))
    elif args.cmd == "ci-check":
        res = check_regression()
        print(json.dumps(res, indent=2, ensure_ascii=False))
        return 0 if res["passed"] else 1
    elif args.cmd == "mine":
        print(json.dumps(run_archive_mining(), indent=2, ensure_ascii=False))
    elif args.cmd == "triage-queues":
        print(json.dumps(run_queue_ai_triage(), indent=2, ensure_ascii=False))
    elif args.cmd == "models":
        print(json.dumps(detect_installed_local_models(), indent=2, ensure_ascii=False))
    elif args.cmd == "ingest-public":
        res = run_public_ingest(
            topic=args.topic,
            wiki_title=args.wiki_title,
            input_path=args.input,
            lang=args.lang,
            extractor=args.extractor,
            model=args.model,
            embed=args.embed,
            limit=args.limit,
            max_paragraphs=args.max_paragraphs,
        )
        print(json.dumps(res, indent=2, ensure_ascii=False))
    elif args.cmd == "ingest-firecrawl":
        res = index_firecrawl_corpus(
            domains=args.domain,
            batch_size=args.batch_size,
            incremental=not args.full_embed,
        )
        print(json.dumps(res, indent=2, ensure_ascii=False))
    elif args.cmd == "query-firecrawl":
        res = query_firecrawl_corpus(
            args.query,
            top_k=args.top_k,
            domain=args.domain,
            usage_policy=args.usage_policy,
        )
        print(json.dumps(res, indent=2, ensure_ascii=False))
    elif args.cmd == "search-all":
        res = search_atlas_and_firecrawl(" ".join(args.query), top_k=args.top_k)
        print(json.dumps(res, indent=2, ensure_ascii=False))
    elif args.cmd == "mine-firecrawl-gaps":
        res = build_gap_evidence_queue(top_k=args.top_k)
        print(json.dumps(res, indent=2, ensure_ascii=False))
    elif args.cmd == "graph-gaps":
        res = build_graph_gap_queue(limit=args.limit, min_score=args.min_score)
        print(json.dumps(res, indent=2, ensure_ascii=False))
    elif args.cmd == "mine-relations":
        if args.mode == "embeddings":
            res = build_relation_candidate_queue(
                index_name=args.index,
                top_k=args.top_k,
                threshold=args.threshold,
                max_pairs=args.max_pairs,
            )
        elif args.mode == "padrao":
            res = build_relation_pattern_queue(max_pairs=args.max_pairs)
        else:
            res = build_cooccurrence_relation_queue(max_pairs=args.max_pairs)
        print(json.dumps(res, indent=2, ensure_ascii=False))
    elif args.cmd == "draft-relations":
        res = draft_relations_with_ollama(
            max_drafts=args.max_drafts,
            model=args.model,
            queue_path=args.queue,
            force=args.force,
        )
        print(json.dumps(res, indent=2, ensure_ascii=False))
    elif args.cmd == "expand-claims":
        res = expand_claims_with_ollama(
            max_entities=args.max_entities,
            model=args.model,
            force=args.force,
        )
        print(json.dumps(res, indent=2, ensure_ascii=False))
    elif args.cmd == "enrich":
        if args.loop:
            run_enrichment_loop(
                interval_minutes=args.interval_minutes,
                max_drafts=args.max_drafts,
                model=args.model,
                max_cycles=args.max_cycles,
                discover=not args.no_discover,
                max_new_seeds=args.max_new_seeds,
                min_score=args.min_score,
                incremental_embed=not args.full_embed,
                graph_gaps=not args.no_graph_gaps,
                graph_limit=args.graph_limit,
                relations=not args.no_relations,
                max_relations=args.max_relations,
                expand_claims=not args.no_expand,
                max_expansions=args.max_expansions,
            )
        else:
            res = run_enrichment_cycle(
                max_drafts=args.max_drafts,
                model=args.model,
                skip_scrape=args.skip_scrape,
                skip_embed=args.skip_embed,
                discover=not args.no_discover,
                max_new_seeds=args.max_new_seeds,
                min_score=args.min_score,
                incremental_embed=not args.full_embed,
                graph_gaps=not args.no_graph_gaps,
                graph_limit=args.graph_limit,
                relations=not args.no_relations,
                max_relations=args.max_relations,
                expand_claims=not args.no_expand,
                max_expansions=args.max_expansions,
            )
            print(json.dumps(res, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
