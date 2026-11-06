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
    const head = await r2(config, 'HEAD', key);
    if (head.status === 200) {
      console.log(`já publicado, sem corpo local: ${key}`);
      continue;
    }
    throw new Error(`Corpo ausente e não publicado: ${key} (${response.url})`);
  }
  if (sha256Hex(body) !== sha256) throw new Error(`Falha de integridade: ${response.url}`);
  await putImmutable(
    config,
    { key, body, contentType: 'application/json; charset=utf-8' },
    { dryRun },
  );
}
console.log(`${responses.size} respostas JSON verificadas para raw/.`);
