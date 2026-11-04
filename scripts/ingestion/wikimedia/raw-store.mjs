import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { wikiRawRoot } from '../wiki-extract/raw.mjs';

export const rawRoot = fileURLToPath(new URL('./raw/', import.meta.url));

/** Immutable public key of a captured JSON response, named by its SHA-256. */
export const rawKey = (sha256) => `raw/${sha256}.bin`;

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
