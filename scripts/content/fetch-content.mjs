#!/usr/bin/env node
// Fills generated/content-cache from the R2 release pinned in content-pointer.json. The prerender
// and the server reader read only this cache; every object is checked against its pinned size
// and SHA-256 before it is written.
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  artifactKey,
  atomicFile,
  cacheDirectory,
  parsePointer,
  pointerPath,
  verifyBytes,
} from './r2-content.mjs';

async function isCached(path, expected, label) {
  try {
    verifyBytes(await readFile(path), expected, label);
    return true;
  } catch {
    return false;
  }
}

const retryableStatus = new Set([429, 500, 502, 503, 504]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function download(
  fetchImpl,
  baseUrl,
  key,
  expected,
  { attempts = 5, retryBaseMs = 400 } = {},
) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    let response;
    try {
      response = await fetchImpl(`${baseUrl}/${key}`);
    } catch (error) {
      if (attempt === attempts - 1) throw error;
      await sleep(retryBaseMs * 2 ** attempt);
      continue;
    }
    if (response.ok) {
      const body = Buffer.from(await response.arrayBuffer());
      return verifyBytes(body, expected, key);
    }
    const error = new Error(`Falha ao baixar ${key}: HTTP ${response.status}`);
    if (!retryableStatus.has(response.status) || attempt === attempts - 1) throw error;
    const retryAfter = Number(response.headers?.get?.('retry-after'));
    await sleep(retryAfter > 0 ? retryAfter * 1000 : retryBaseMs * 2 ** attempt);
  }
  throw new Error(`Falha ao baixar ${key}: tentativas esgotadas.`);
}

/** Syncs the cache to a pointer text; returns how many objects were downloaded. */
export async function syncContentCache({
  pointerText,
  directory = cacheDirectory,
  fetchImpl = fetch,
  retryBaseMs = 400,
}) {
  const pointer = parsePointer(pointerText);
  await atomicFile(join(directory, 'pointer.json'), pointerText);
  const entries = [
    { key: artifactKey(pointer.manifest.sha256), expected: pointer.manifest, label: 'manifest' },
    ...pointer.artifacts.map((artifact) => ({
      key: artifactKey(artifact.sha256),
      expected: artifact,
      label: artifact.file,
    })),
  ];
  let downloaded = 0;
  for (const { key, expected, label } of entries) {
    const path = join(directory, key);
    if (await isCached(path, expected, label)) continue;
    await atomicFile(
      path,
      await download(fetchImpl, pointer.baseUrl, key, expected, { retryBaseMs }),
    );
    downloaded += 1;
  }
  return { release: pointer.release, downloaded, total: entries.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const pointerText = await readFile(pointerPath, 'utf8').catch((error) => {
    if (error.code === 'ENOENT')
      throw new Error('Ponteiro ausente: publique o conteúdo com `npm run content:publish`.');
    throw error;
  });
  const result = await syncContentCache({ pointerText });
  console.log(
    `Cache de conteúdo: release ${result.release}; ${result.downloaded} baixados de ${result.total}`,
  );
}
