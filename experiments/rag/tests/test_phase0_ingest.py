"""Tests for Phase 0: pinned bundle ingestion, deduplication, and unit construction."""

from __future__ import annotations

import json
from pathlib import Path

from atlas_rag.eval.phase0_inventory import run_phase0
from atlas_rag.ingest.bundle import audit_disk_collections, load_pinned_bundle
from atlas_rag.paths import eval_dir, repo_root
from atlas_rag.units.builder import extract_deduplicated_corpus


def test_pinned_bundle_hash_and_dedup() -> None:
    loaded = load_pinned_bundle(verify_hash=True)
    assert loaded.bundle_bytes == 29_780_495
    corpus = extract_deduplicated_corpus(loaded)

    assert corpus.dedup_stats["unique_entities"] == 1224
    assert corpus.dedup_stats["unique_claims"] == 11145
    assert corpus.dedup_stats["unique_relations"] == 1629
    assert corpus.dedup_stats["unique_sources"] == 1376
    assert len(corpus.claim_units) == 11145
    assert len(corpus.paragraph_units) == 4621
    assert len(corpus.entity_units) == 1224

    # Every claim unit must keep full citation -> evidence -> source chain
    assert all(cu.source_ids and cu.locators and cu.classification for cu in corpus.claim_units)


def test_manifest_vs_disk_collections() -> None:
    audit = audit_disk_collections()
    assert audit["manifest_collection_count"] == 16
    assert audit["disk_collection_file_count"] >= audit["manifest_collection_count"]
    assert audit["all_manifest_files_exist_on_disk"] is True


def test_phase0_inventory_artifact_exists_and_valid(tmp_path: Path) -> None:
    # Run inventory into a temp output or validate committed report if present
    committed = eval_dir(repo_root()) / "runs" / "phase0_inventory.json"
    if committed.exists():
        data = json.loads(committed.read_text(encoding="utf-8"))
    else:
        data = run_phase0(output_path=tmp_path / "phase0.json")

    assert data["dedup"]["unique_claims"] == 11145
    assert data["premises"]["premise_2_pinned_bundle_verified"] is True
    assert data["premises"]["premise_4_reviews_and_gold_set"]["all_claims_pending"] is True
    assert data["default_unit_decision"]["unit"] == "claim_enriched"
    assert data["tokenizer"]["measurements"]["claim_enriched"]["count"] == 11145
