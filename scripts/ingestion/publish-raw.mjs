#!/usr/bin/env node
// Publishes the captured JSON responses to the public bucket as immutable raw/<sha256>.bin objects,
// so git can keep only the manifests. Image responses are not published: each file needs its own
// reproduction licence first, so they stay in the repository until that review.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { listR2Objects, loadR2Config, putImmutable, sha256Hex } from '../content/r2-content.mjs';
import { listJsonResponses, rawKey } from './wikimedia/raw-store.mjs';

const dryRun = process.argv.includes('--dry-run');
const config = dryRun ? null : await loadR2Config();
const responses = await listJsonResponses();
const existingKeys = dryRun
  ? new Set()
  : new Set((await listR2Objects(config, 'raw/')).map((item) => item.key));

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

let processed = 0;
let alreadyPublished = 0;
let uploaded = 0;
let missing = 0;
const pending = responses.entries();

async function processEntry([sha256, response]) {
  const key = rawKey(sha256);
  if (existingKeys.has(key)) {
    alreadyPublished += 1;
    processed += 1;
    return;
  }
  let body;
  try {
    body = await readFile(join(response.directory, 'blobs', `${sha256}.bin`));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    missing += 1;
    processed += 1;
    console.warn(`corpo ausente e não publicado: ${key} (${response.url})`);
    return;
  }
  if (sha256Hex(body) !== sha256) throw new Error(`Falha de integridade: ${response.url}`);
  await withRetry(key, () =>
    putImmutable(
      config,
      { key, body, contentType: 'application/json; charset=utf-8', compress: true },
      { dryRun, quiet: dryRun || responses.size > 100 },
    ),
  );
  uploaded += 1;
  processed += 1;
  if (processed % 1000 === 0 || processed === responses.size) {
    console.log(
      `Progresso raw/: ${processed}/${responses.size} (${uploaded} publicados, ${alreadyPublished} já no R2)`,
    );
  }
}

async function worker() {
  for (const entry of pending) await processEntry(entry);
}

await Promise.all(Array.from({ length: 8 }, worker));
console.log(
  `${responses.size} respostas JSON verificadas para raw/ (${uploaded} publicados, ${alreadyPublished} já no R2, ${missing} ausentes).`,
);
if (!dryRun && missing > 0) {
  throw new Error(`${missing} respostas JSON ausentes sem cópia no R2.`);
}
