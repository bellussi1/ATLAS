import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

import { wikiRawRoot } from '../wiki-extract/raw.mjs';

export const rawRoot = fileURLToPath(new URL('./raw/', import.meta.url));

/** Immutable public key of a captured JSON response, named by its SHA-256. */
export const rawKey = (sha256) => `raw/${sha256}.bin`;

/**
 * Raw captures are stored in R2 with gzip and `Content-Encoding: gzip`. Some clients hand the
 * compressed bytes back without decompressing them; decode by the gzip magic before the digest
 * check, because the manifest hashes the original JSON.
 */
export function decodeRawBody(body) {
  return body.length >= 2 && body[0] === 0x1f && body[1] === 0x8b ? gunzipSync(body) : body;
}

/**
 * Every JSON response named by a committed manifest, once per digest: Wikimedia captures and
 * Wikipedia captures (`raw/<tradição>/<instante>/`). HTML of articles is never listed, so it is never
 * published. Each entry keeps the capture directory that declared it, where the blob lives locally.
 */
export async function listJsonResponses(roots = [rawRoot, wikiRawRoot]) {
  const responses = new Map();
  for (const root of roots) {
    // A root that has no capture yet (a fresh checkout) contributes nothing.
    for (const collection of await readdir(root, { withFileTypes: true }).catch(() => [])) {
      if (!collection.isDirectory()) continue;
      for (const capture of await readdir(join(root, collection.name), { withFileTypes: true })) {
        if (!capture.isDirectory()) continue;
        const directory = join(root, collection.name, capture.name);
        const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
        for (const request of manifest.requests)
          if (request.kind === 'json' && !responses.has(request.sha256))
            responses.set(request.sha256, { ...request, directory });
      }
    }
  }
  return responses;
}
