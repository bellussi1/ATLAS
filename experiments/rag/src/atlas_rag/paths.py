"""Filesystem paths for the ATLAS RAG experiment and pinned repository artifacts."""

from __future__ import annotations

from pathlib import Path


def repo_root(start: Path | None = None) -> Path:
    """Locate the ATLAS repository root containing `content/content-pointer.json`."""
    cur = (start or Path(__file__)).resolve()
    for candidate in (cur, *cur.parents):
        if (candidate / "content" / "content-pointer.json").exists():
            return candidate
    raise FileNotFoundError("Could not locate ATLAS repository root with content/content-pointer.json")


def rag_root(start: Path | None = None) -> Path:
    return repo_root(start) / "experiments" / "rag"


def pointer_path(start: Path | None = None) -> Path:
    return repo_root(start) / "content" / "content-pointer.json"


def content_cache_dir(start: Path | None = None) -> Path:
    return repo_root(start) / "generated" / "content-cache"


def knowledge_dir(start: Path | None = None) -> Path:
    return repo_root(start) / "content" / "knowledge"


def gold_set_dir(start: Path | None = None) -> Path:
    return repo_root(start) / "docs" / "research" / "gold-set-2026-11"


def research_docs_dir(start: Path | None = None) -> Path:
    return repo_root(start) / "docs" / "research"


def data_dir(start: Path | None = None) -> Path:
    return rag_root(start) / "data"


def index_dir(start: Path | None = None) -> Path:
    return data_dir(start) / "index"


def eval_dir(start: Path | None = None) -> Path:
    return rag_root(start) / "eval"
