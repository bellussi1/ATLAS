#!/usr/bin/env node
/**
 * Remove releases antigos do cache e artefatos órfãos do build local.
 *
 *   node scripts/content/prune-cache.mjs [--dry-run]
 *
 * Preserva apenas:
 * - o release pinado em `content/content-pointer.json`;
 * - o release local em `generated/content-cache/pointer.json` (se existir);
 * - os arquivos referenciados pelo `generated/content/manifest.json` atual.
 *
 * Nunca toca em `content/`, `src/`, `public/` nem em mídias fora de `m/`.
 */
import { readdir, readFile, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';

import { parsePointer, pointerPath, projectRoot } from './r2-content.mjs';

const dryRun = process.argv.includes('--dry-run');
const cache = join(projectRoot, 'generated/content-cache');
const compiled = join(projectRoot, 'generated/content');
const localPointerPath = join(cache, 'pointer.json');

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function collectPointerKeys(pointer) {
  const keys = new Set(['pointer.json', 'pointer.local.json']);
  if (!pointer) return keys;
  keys.add(`c/${pointer.manifest.sha256}.json`);
  for (const artifact of pointer.artifacts ?? []) keys.add(`c/${artifact.sha256}.json`);
  if (pointer.bundle) keys.add(`c/${pointer.bundle.sha256}.json`);
  if (pointer.networkBundle) keys.add(`c/${pointer.networkBundle.sha256}.json`);
  if (pointer.readingBundle) keys.add(`c/${pointer.readingBundle.sha256}.json`);
  for (const item of pointer.media ?? []) keys.add(item.key);
  return keys;
}

async function collectManifestFiles() {
  const path = join(compiled, 'manifest.json');
  if (!(await exists(path))) return new Set();
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  const files = new Set(['manifest.json']);
  const add = (resource) => {
    if (resource?.file) files.add(resource.file);
  };
  for (const collection of manifest.collections ?? []) add(collection);
  for (const ideology of manifest.ideologies ?? []) add(ideology);
  for (const itinerary of manifest.itineraries ?? []) add(itinerary);
  add(manifest.search);
  add(manifest.adjacency);
  add(manifest.layouts);
  add(manifest.network);
  add(manifest.bundle);
  add(manifest.networkBundle);
  add(manifest.readingBundle);
  return files;
}

async function size(path) {
  try {
    return (await stat(path)).size;
  } catch {
    return 0;
  }
}

async function main() {
  const pinned = await readFile(pointerPath, 'utf8')
    .then(parsePointer)
    .catch(() => null);
  const local = await readFile(localPointerPath, 'utf8')
    .then(parsePointer)
    .catch(() => null);
  const keepKeys = new Set([...collectPointerKeys(pinned), ...collectPointerKeys(local)]);
  const keepManifest = await collectManifestFiles();

  let freed = 0;
  let removed = 0;
  for (const directory of ['c', 'm']) {
    const path = join(cache, directory);
    const files = await readdir(path).catch(() => []);
    for (const file of files) {
      const key = `${directory}/${file}`;
      if (keepKeys.has(key)) continue;
      const target = join(path, file);
      freed += await size(target);
      removed += 1;
      if (!dryRun) await unlink(target).catch(() => undefined);
    }
  }
  const compiledFiles = await readdir(compiled).catch(() => []);
  for (const file of compiledFiles) {
    if (!/^[a-z0-9-]+\.[a-f0-9]{64}\.json$/.test(file)) continue;
    if (keepManifest.has(file)) continue;
    const target = join(compiled, file);
    freed += await size(target);
    removed += 1;
    if (!dryRun) await unlink(target).catch(() => undefined);
  }

  const label = dryRun ? '[dry-run] ' : '';
  console.log(
    `${label}${removed} arquivo(s) removido(s); ${(freed / 1024 / 1024).toFixed(1)} MB liberados`,
  );
  console.log(
    `Cache preservado: ${keepKeys.size} chaves (R2 ${pinned ? 'sim' : 'não'}, local ${local ? 'sim' : 'não'}); build atual: ${keepManifest.size} arquivos.`,
  );
}

await main();
