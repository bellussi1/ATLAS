// Incremental, content-addressed mirror of local model artifacts into the private drafts bucket.
// Objects live at backup/objects/<sha256>; each set has a mutable index at backup/<set>/index.json
// that maps relative paths to digests. Nothing here can name the public bucket: the storage is
// built from loadR2DraftsConfig, which is hard-wired to atlas-drafts.
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

import { sha256Hex } from '../content/r2-content.mjs';

export const backupPrefix = 'backup';
export const objectKey = (sha256) => `${backupPrefix}/objects/${sha256}`;
export const indexKey = (set) => `${backupPrefix}/${set}/index.json`;

/** Local artifacts that are regenerable or not yet approved, and therefore not in git. */
export const defaultSets = {
  queues: 'experiments/rag/eval/queues',
  runs: 'experiments/rag/eval/runs',
};

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? walk(path) : [path];
    }),
  );
  return nested.flat();
}

/** Every file under `directory` with its digest; paths are POSIX-style and relative. */
export async function scanDirectory(directory) {
  const files = (
    await walk(directory).catch((error) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    })
  ).sort();
  const entries = [];
  for (const path of files) {
    const body = await readFile(path);
    entries.push({
      path: relative(directory, path).split(sep).join('/'),
      sha256: sha256Hex(body),
      bytes: (await stat(path)).size,
      body,
    });
  }
  return entries;
}

/** Digests that must be uploaded: the ones the bucket does not hold yet, once each. */
export function planUploads(entries, existingKeys) {
  const missing = new Map();
  for (const entry of entries)
    if (!existingKeys.has(objectKey(entry.sha256))) missing.set(entry.sha256, entry);
  return [...missing.values()];
}

export function buildIndex(set, entries, now = new Date()) {
  return {
    schemaVersion: 1,
    set,
    createdAt: now.toISOString(),
    entries: Object.fromEntries(
      entries.map(({ path, sha256, bytes }) => [path, { sha256, bytes }]),
    ),
  };
}

/**
 * `storage` is { existing(): Set<key>, put(key, body, contentType, cache?), get(key): Buffer|null }.
 * With `dryRun` nothing is written.
 */
export async function backupSet({ set, directory, storage, dryRun = false, log = () => {} }) {
  const entries = await scanDirectory(directory);
  const existing = await storage.existing();
  const uploads = planUploads(entries, existing);
  const bytes = uploads.reduce((sum, entry) => sum + entry.bytes, 0);
  log(
    `${set}: ${entries.length} arquivos, ${uploads.length} novos (${(bytes / 1024).toFixed(0)} KiB)` +
      (dryRun ? ' [dry-run]' : ''),
  );
  if (!dryRun) {
    for (const entry of uploads)
      await storage.put(objectKey(entry.sha256), entry.body, 'application/octet-stream');
    await storage.put(
      indexKey(set),
      Buffer.from(`${JSON.stringify(buildIndex(set, entries), null, 2)}\n`),
      'application/json',
      'no-cache',
    );
  }
  return { files: entries.length, uploaded: uploads.length, bytes };
}

/** Restores a set into `destination`, verifying every digest and refusing to leave the folder. */
export async function restoreSet({ set, destination, storage, log = () => {} }) {
  const raw = await storage.get(indexKey(set));
  if (!raw) throw new Error(`Índice ausente para o conjunto ${set}.`);
  const index = JSON.parse(raw.toString('utf8'));
  const base = resolve(destination);
  let restored = 0;
  for (const [path, entry] of Object.entries(index.entries)) {
    const target = resolve(base, path);
    if (target !== base && !target.startsWith(base + sep))
      throw new Error(`Caminho fora do destino: ${path}`);
    const body = await storage.get(objectKey(entry.sha256));
    if (!body || sha256Hex(body) !== entry.sha256 || body.byteLength !== entry.bytes)
      throw new Error(`Falha de integridade: ${path}`);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body);
    restored += 1;
  }
  log(`${set}: ${restored} arquivos restaurados em ${destination}`);
  return { restored };
}
