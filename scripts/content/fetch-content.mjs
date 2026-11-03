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

async function download(fetchImpl, baseUrl, key, expected) {
  const response = await fetchImpl(`${baseUrl}/${key}`);
  if (!response.ok) throw new Error(`Falha ao baixar ${key}: HTTP ${response.status}`);
  const body = Buffer.from(await response.arrayBuffer());
  return verifyBytes(body, expected, key);
}

/** Syncs the cache to a pointer text; returns how many objects were downloaded. */
export async function syncContentCache({
  pointerText,
  directory = cacheDirectory,
  fetchImpl = fetch,
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
    await atomicFile(path, await download(fetchImpl, pointer.baseUrl, key, expected));
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
