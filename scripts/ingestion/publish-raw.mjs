#!/usr/bin/env node
// Publishes the captured JSON responses to the public bucket as immutable raw/<sha256>.bin objects,
// so git can keep only the manifests. Image responses are not published: each file needs its own
// reproduction licence first, so they stay in the repository until that review.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { loadR2Config, putImmutable, sha256Hex } from '../content/r2-content.mjs';
import { listJsonResponses, rawKey } from './wikimedia/raw-store.mjs';

const dryRun = process.argv.includes('--dry-run');
const config = dryRun ? null : await loadR2Config();
const responses = await listJsonResponses();

for (const [sha256, response] of responses) {
  const body = await readFile(join(response.directory, 'blobs', `${sha256}.bin`));
  if (sha256Hex(body) !== sha256) throw new Error(`Falha de integridade: ${response.url}`);
  await putImmutable(
    config,
    { key: rawKey(sha256), body, contentType: 'application/json; charset=utf-8' },
    { dryRun },
  );
}
console.log(`${responses.size} respostas JSON verificadas para raw/.`);
