"""Ingestion and integrity verification for the pinned ATLAS content bundle."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from atlas_rag.paths import content_cache_dir, knowledge_dir, pointer_path, repo_root


@dataclass(frozen=True)
class LoadedBundle:
    """Validated pinned bundle plus metadata from content-pointer.json."""

    release: str
    bundle_sha256: str
    bundle_bytes: int
    source_path: Path
    pointer: dict[str, Any]
    data: dict[str, Any]


def sha256_bytes(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def load_pointer(root: Path | None = None) -> dict[str, Any]:
    path = pointer_path(root)
    return json.loads(path.read_text(encoding="utf-8"))


def resolve_pinned_bundle_path(root: Path | None = None) -> tuple[Path, dict[str, Any]]:
    """Locate the local cached or built bundle file matching content-pointer.json."""
    root = repo_root(root)
    pointer = load_pointer(root)
    bundle_meta = pointer.get("bundle")
    if not bundle_meta:
        raise ValueError("content-pointer.json does not pin a bundle artifact")
    digest = bundle_meta["sha256"]
    candidates = [
        content_cache_dir(root) / "c" / f"{digest}.json",
        root / "generated" / "content" / f"bundle.{digest}.json",
    ]
    for path in candidates:
        if path.exists():
            return path, pointer
    raise FileNotFoundError(
        f"Pinned bundle {digest} not found in generated/content-cache/ or generated/content/. "
        "Run `npm run content:fetch` or `npm run content:build` first."
    )


def load_pinned_bundle(root: Path | None = None, *, verify_hash: bool = True) -> LoadedBundle:
    """Load and verify the pinned ATLAS bundle against content-pointer.json."""
    bundle_file, pointer = resolve_pinned_bundle_path(root)
    raw = bundle_file.read_bytes()
    expected_bytes = int(pointer["bundle"]["bytes"])
    expected_sha = str(pointer["bundle"]["sha256"])

    if verify_hash:
        if len(raw) != expected_bytes:
            raise ValueError(
                f"Bundle size mismatch: expected {expected_bytes} bytes, got {len(raw)} bytes ({bundle_file})"
            )
        actual_sha = sha256_bytes(raw)
        if actual_sha != expected_sha:
            raise ValueError(
                f"Bundle SHA-256 mismatch: expected {expected_sha}, got {actual_sha} ({bundle_file})"
            )

    data = json.loads(raw.decode("utf-8"))
    return LoadedBundle(
        release=str(pointer["release"]),
        bundle_sha256=expected_sha,
        bundle_bytes=expected_bytes,
        source_path=bundle_file,
        pointer=pointer,
        data=data,
    )


def audit_disk_collections(root: Path | None = None) -> dict[str, Any]:
    """Compare content/knowledge/manifest.json with files on disk in content/knowledge/collections/."""
    kdir = knowledge_dir(root)
    manifest = json.loads((kdir / "manifest.json").read_text(encoding="utf-8"))
    collections_dir = kdir / "collections"
    disk_files = sorted(p.name for p in collections_dir.glob("*.json")) if collections_dir.exists() else []
    manifest_files = [Path(item["file"]).name for item in manifest.get("collections", [])]
    manifest_set = set(manifest_files)
    stale_files = [name for name in disk_files if name not in manifest_set]
    return {
        "manifest_collection_count": len(manifest_files),
        "disk_collection_file_count": len(disk_files),
        "stale_or_older_files_count": len(stale_files),
        "all_manifest_files_exist_on_disk": all((kdir / item["file"]).exists() for item in manifest.get("collections", [])),
        "manifest_ids": [item["id"] for item in manifest.get("collections", [])],
    }
