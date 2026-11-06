#!/usr/bin/env node
// Publishes the captured JSON responses to the public bucket as immutable raw/<sha256>.bin objects,
// so git can keep only the manifests. Image responses are not published: each file needs its own
// reproduction licence first, so they stay in the repository until that review.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { loadR2Config, putImmutable, r2, sha256Hex } from '../content/r2-content.mjs';
import { listJsonResponses, rawKey } from './wikimedia/raw-store.mjs';

const dryRun = process.argv.includes('--dry-run');
const config = dryRun ? null : await loadR2Config();
const responses = await listJsonResponses();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/** R2 answers 429 under bursts; retry those and transient server errors with backoff. */
async function withRetry(label, run) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      const message = String(error);
      if (!/HTTP (429|5\d\d)/.test(message) || attempt >= 5) throw error;
      const pause = 1000 * 2 ** attempt;
      console.warn(`${label}: ${message}; nova tentativa em ${pause} ms`);
      await wait(pause);
    }
  }
}

for (const [sha256, response] of responses) {
  const key = rawKey(sha256);
  let body;
  try {
    body = await readFile(join(response.directory, 'blobs', `${sha256}.bin`));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    // Older captures may have dropped their local bodies after the blob was published.
    if (dryRun) {
      console.log(`[dry-run] sem corpo local: ${key}`);
      continue;
    }
    const head = await withRetry(key, () => r2(config, 'HEAD', key));
    if (head.status === 200) {
      console.log(`já publicado, sem corpo local: ${key}`);
      continue;
    }
    // A capture older than the local checkout may have lost its body; report it and keep going so
    // the other captures still publish. The CI will surface the gap if that blob is ever needed.
    console.warn(`corpo ausente e não publicado: ${key} (${response.url})`);
    continue;
  }
  if (sha256Hex(body) !== sha256) throw new Error(`Falha de integridade: ${response.url}`);
  await withRetry(key, () =>
    putImmutable(
      config,
      { key, body, contentType: 'application/json; charset=utf-8', compress: true },
      { dryRun },
    ),
  );
  // Small pause keeps the whole capture from arriving as one burst at the bucket.
  await wait(25);
}
console.log(`${responses.size} respostas JSON verificadas para raw/.`);
