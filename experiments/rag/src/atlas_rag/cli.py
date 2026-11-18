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
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
