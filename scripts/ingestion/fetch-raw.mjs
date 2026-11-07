#!/usr/bin/env node
// Fills generated/raw-cache with the JSON responses that captures reference but git no longer
// keeps, so `ingest:verify` can replay offline. Every body is checked against its manifest digest
// before it is written.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { atomicFile, parsePointer, pointerPath, sha256Hex } from '../content/r2-content.mjs';
import { rawCacheDirectory } from './wikimedia/archive.mjs';
import { decodeRawBody, listJsonResponses, rawKey } from './wikimedia/raw-store.mjs';

async function digestOf(path) {
  try {
    return sha256Hex(await readFile(path));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

const pointer = parsePointer(await readFile(pointerPath, 'utf8'));
const responses = await listJsonResponses();
let downloaded = 0;
const base = new URL(process.env.ATLAS_RAW_BASE_URL || pointer.baseUrl);
if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/')
  throw new Error('ATLAS_RAW_BASE_URL deve ser uma origem HTTPS sem caminho ou credenciais.');

async function download(key) {
  for (let attempt = 0; attempt < 7; attempt++) {
    const result = await fetch(new URL(key, base), {
      signal: AbortSignal.timeout(60_000),
    });
    if (result.ok) {
      const body = await result.arrayBuffer();
      // R2 stores the capture gzip-encoded; the digest is of the original JSON.
      return decodeRawBody(Buffer.from(body));
    }
    if (![429, 500, 502, 503, 504].includes(result.status) || attempt === 6)
      throw new Error(`Falha ao baixar ${key}: HTTP ${result.status}`);
    const retryAfter = result.headers.get('retry-after');
    const seconds = Number(retryAfter);
    const wait =
      retryAfter && !Number.isFinite(seconds)
        ? Date.parse(retryAfter) - Date.now()
        : seconds * 1000;
    await result.body?.cancel();
    await delay(Math.max(Number.isFinite(wait) ? wait : 0, 5000 * 2 ** attempt));
  }
  throw new Error(`Tentativas esgotadas: ${key}`);
}

async function fetchResponse([sha256, response]) {
  const local = join(response.directory, 'blobs', `${sha256}.bin`);
  const cached = join(rawCacheDirectory, `${sha256}.bin`);
  if ((await digestOf(cached)) === sha256) return;
  // The same response may live in one capture's blobs while every other capture needs it in the
  // shared cache; copy it instead of leaving the other captures without a body.
  if ((await digestOf(local)) === sha256) {
    await atomicFile(cached, await readFile(local));
    return;
  }
  const body = await download(rawKey(sha256));
  if (sha256Hex(body) !== sha256) throw new Error(`Falha de integridade: ${response.url}`);
  await atomicFile(cached, body);
  downloaded += 1;
}
// Bound parallel downloads so a cold CI runner can replay large captures without
// opening a connection for every manifest entry at once.
const pending = responses.entries();
async function worker() {
  for (const entry of pending) await fetchResponse(entry);
}
await Promise.all(Array.from({ length: process.env.ATLAS_RAW_BASE_URL ? 8 : 2 }, worker));
console.log(`Respostas brutas: ${downloaded} baixadas de ${responses.size}.`);
