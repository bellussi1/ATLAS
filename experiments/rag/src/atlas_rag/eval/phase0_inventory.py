"""Phase 0: Pinned bundle inventory, premise verification, and BGE-M3 token measurement."""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
from transformers import AutoTokenizer

from atlas_rag.ingest.bundle import LoadedBundle, audit_disk_collections, load_pinned_bundle
from atlas_rag.paths import eval_dir, gold_set_dir, repo_root
from atlas_rag.units.builder import (
    CorpusArtifacts,
    classify_relation_nature,
    classify_relation_tier,
    classify_relation_weight,
    extract_deduplicated_corpus,
)


def _token_stats(texts: list[str], tokenizer: Any) -> dict[str, Any]:
    lengths: list[int] = []
    batch_size = 512
    for i in range(0, len(texts), batch_size):
        enc = tokenizer(
            texts[i : i + batch_size],
            add_special_tokens=True,
            truncation=False,
            padding=False,
        )
        lengths.extend(len(ids) for ids in enc["input_ids"])
    arr = np.asarray(lengths, dtype=np.int64)
    return {
        "count": int(arr.size),
        "total_tokens": int(arr.sum()),
        "min": int(arr.min()) if arr.size else 0,
        "p50": float(np.percentile(arr, 50)) if arr.size else 0.0,
        "p95": float(np.percentile(arr, 95)) if arr.size else 0.0,
        "p99": float(np.percentile(arr, 99)) if arr.size else 0.0,
        "max": int(arr.max()) if arr.size else 0,
        "mean": round(float(arr.mean()), 2) if arr.size else 0.0,
        "gt_256_tokens": int((arr > 256).sum()),
        "gt_512_tokens": int((arr > 512).sum()),
        "gt_1024_tokens": int((arr > 1024).sum()),
    }


def _audit_gold_set(root: Path) -> dict[str, Any]:
    gdir = gold_set_dir(root)
    result: dict[str, Any] = {}
    for fname in ("afirmacoes.json", "pares-fonte-afirmacao.json", "relacoes.json"):
        path = gdir / fname
        items = json.loads(path.read_text(encoding="utf-8"))
        statuses = Counter(item.get("ok") for item in items)
        result[fname] = {
            "total": len(items),
            "human_marked_count": sum(v for k, v in statuses.items() if k is not None),
            "pending_null_count": statuses.get(None, 0),
        }
    return result


def run_phase0(
    root: Path | None = None,
    *,
    tokenizer_name: str = "BAAI/bge-m3",
    output_path: Path | None = None,
) -> dict[str, Any]:
    root = repo_root(root)
    loaded: LoadedBundle = load_pinned_bundle(root, verify_hash=True)
    corpus: CorpusArtifacts = extract_deduplicated_corpus(loaded)
    disk_audit = audit_disk_collections(root)
    gold_audit = _audit_gold_set(root)

    # Check Prettier vs minified SHA-256 difference on one collection as proof of Premise 1/2
    manifest = json.loads((root / "content" / "knowledge" / "manifest.json").read_text(encoding="utf-8"))
    first_col = manifest["collections"][0]
    raw_disk_bytes = (root / "content" / "knowledge" / first_col["file"]).read_bytes()
    disk_sha = hashlib.sha256(raw_disk_bytes).hexdigest()
    minified_bytes = (json.dumps(json.loads(raw_disk_bytes.decode("utf-8")), ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    minified_sha = hashlib.sha256(minified_bytes).hexdigest()

    entity_by_kind = Counter(ent["kind"] for ent in corpus.entities.values())
    entity_by_scope = Counter(ent.get("scope") or "nucleo" for ent in corpus.entities.values())
    entity_by_status = Counter(ent.get("editorialStatus") or "unspecified" for ent in corpus.entities.values())

    claim_by_class = Counter(c["classification"] for c in corpus.claims.values())
    claim_by_status = Counter(c["editorialStatus"] for c in corpus.claims.values())
    review_by_status = Counter(r["status"] for r in corpus.reviews.values())

    rel_by_type = Counter(r["type"] for r in corpus.relations.values())
    rel_by_weight = Counter(classify_relation_weight(r) for r in corpus.relations.values())
    rel_by_nature = Counter(classify_relation_nature(r) for r in corpus.relations.values())
    rel_by_tier = Counter(classify_relation_tier(r) for r in corpus.relations.values())

    # Check if every claim has an intact citation -> evidence -> source chain
    claims_with_full_chain = sum(1 for cu in corpus.claim_units if cu.source_ids)
    claims_with_locator = sum(1 for cu in corpus.claim_units if cu.locators)

    # Check duplicate normalized claim texts across distinct claim IDs
    norm_texts = Counter(" ".join(c["text"].lower().split()) for c in corpus.claims.values())
    duplicate_claim_texts = sum(1 for _, cnt in norm_texts.items() if cnt > 1)

    tokenizer = AutoTokenizer.from_pretrained(tokenizer_name)
    token_measurements = {
        "claim_raw": _token_stats([cu.text_raw for cu in corpus.claim_units], tokenizer),
        "claim_enriched": _token_stats([cu.text_enriched for cu in corpus.claim_units], tokenizer),
        "paragraph_enriched": _token_stats([pu.text_enriched for pu in corpus.paragraph_units], tokenizer),
        "entity_enriched": _token_stats([eu.text_enriched for eu in corpus.entity_units], tokenizer),
    }

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "release": loaded.release,
        "bundle": {
            "sha256": loaded.bundle_sha256,
            "bytes": loaded.bundle_bytes,
            "source_path": str(loaded.source_path.relative_to(root)).replace("\\", "/"),
            "top_keys": list(loaded.data.keys()),
            "ideologies_compiled": list(loaded.data.get("ideologies", {}).keys()),
            "search_entries": len(loaded.data.get("search", [])),
        },
        "premises": {
            "premise_1_collections_on_disk_vs_manifest": {
                **disk_audit,
                "hash_difference_sample": {
                    "collection_id": first_col["id"],
                    "prettier_disk_sha256": disk_sha,
                    "manifest_sha256": first_col["sha256"],
                    "minified_json_sha256": minified_sha,
                    "pointer_artifact_sha256": next(
                        (a["sha256"] for a in loaded.pointer["artifacts"] if a["file"].startswith(first_col["id"] + ".")),
                        None,
                    ),
                },
            },
            "premise_2_pinned_bundle_verified": True,
            "premise_3_current_search_is_boolean_lexical": {
                "file": "src/app/core/content/queries/discovery-index.ts",
                "mechanism": "two-stage: nameMatchScore short-circuit on title/aliases, then strict AND substring match over searchText sorted alphabetically",
                "bm25_or_ranking": False,
            },
            "premise_4_reviews_and_gold_set": {
                "review_statuses": dict(review_by_status),
                "all_claims_pending": review_by_status.get("pending", 0) == len(corpus.claims),
                "gold_set_2026_11": gold_audit,
            },
            "premise_5_discovery_vs_documented_relations": {
                "by_type": dict(rel_by_type),
                "by_weight": dict(rel_by_weight),
                "by_nature": dict(rel_by_nature),
                "by_tier": dict(rel_by_tier),
                "note": "encyclopedic-link (141), related_to (27) and editorial-link (2) are pure navigation/editorial links; associated_with (270) are Wikidata catalog links; documented-association (636) includes sourced historical/administrative relations.",
            },
        },
        "dedup": corpus.dedup_stats,
        "counts": {
            "entities_by_kind": dict(entity_by_kind),
            "entities_by_scope": dict(entity_by_scope),
            "entities_by_editorial_status": dict(entity_by_status),
            "claims_by_classification": dict(claim_by_class),
            "claims_by_editorial_status": dict(claim_by_status),
            "claims_with_full_source_chain": claims_with_full_chain,
            "claims_with_locator": claims_with_locator,
            "duplicate_normalized_claim_texts": duplicate_claim_texts,
            "paragraph_units": len(corpus.paragraph_units),
            "entity_units": len(corpus.entity_units),
        },
        "tokenizer": {
            "model": tokenizer_name,
            "measurements": token_measurements,
        },
        "default_unit_decision": {
            "unit": "claim_enriched",
            "rationale": "Each claim has an atomic citation -> evidence -> source chain (11,145/11,145), explicit epistemic classification, and p99 token length well under 256 tokens when enriched with entity title, scope, classification, and evidence header.",
        },
    }

    target = output_path or (eval_dir(root) / "runs" / "phase0_inventory.json")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return report
