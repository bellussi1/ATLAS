#!/usr/bin/env node
// Fills generated/raw-cache with the JSON responses that captures reference but git no longer
// keeps, so `ingest:verify` can replay offline. Every body is checked against its manifest digest
// before it is written.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { atomicFile, parsePointer, pointerPath, sha256Hex } from '../content/r2-content.mjs';
import { rawCacheDirectory } from './wikimedia/archive.mjs';
import { listJsonResponses, rawKey } from './wikimedia/raw-store.mjs';

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

for (const [sha256, response] of responses) {
  const local = join(response.directory, 'blobs', `${sha256}.bin`);
  const cached = join(rawCacheDirectory, `${sha256}.bin`);
  if ((await digestOf(local)) === sha256 || (await digestOf(cached)) === sha256) continue;
  const result = await fetch(`${pointer.baseUrl}/${rawKey(sha256)}`);
  if (!result.ok) throw new Error(`Falha ao baixar ${rawKey(sha256)}: HTTP ${result.status}`);
  const body = Buffer.from(await result.arrayBuffer());
  if (sha256Hex(body) !== sha256) throw new Error(`Falha de integridade: ${response.url}`);
  await atomicFile(cached, body);
  downloaded += 1;
}
console.log(`Respostas brutas: ${downloaded} baixadas de ${responses.size}.`);
