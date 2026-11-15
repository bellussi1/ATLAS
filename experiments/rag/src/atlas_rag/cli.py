"""CLI unificada do experimento ATLAS RAG (atlas-rag)."""

from __future__ import annotations

import argparse
import json
from typing import Sequence

from atlas_rag.eval.dataset import build_and_write_dataset
from atlas_rag.eval.phase0_inventory import run_phase0
from atlas_rag.eval.phase2_runner import run_phase2
from atlas_rag.eval.phase3_runner import run_phase3
from atlas_rag.eval.phase4_runner import run_phase4
from atlas_rag.eval.regression import build_default_thresholds_from_runs, check_regression
from atlas_rag.eval.security import run_security_suite
from atlas_rag.mining.acervo_miner import run_archive_mining


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
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
