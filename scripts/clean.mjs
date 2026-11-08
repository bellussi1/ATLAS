#!/usr/bin/env node
/**
 * Removes build, test and editor caches that are safe to regenerate.
 *
 *   npm run clean            # lists what would be removed
 *   npm run clean -- --yes   # removes
 *   npm run clean -- --deep --yes  # also drops the raw Wikipedia cache
 *
 * It never touches content/, docs/, referencias/, output/ or tmp/: those hold source,
 * editorial evidence or the user's local media.
 */
import { readdir, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const safe = [
  'dist',
  '.angular',
  'test-results',
  'playwright-report',
  '.playwright-cli',
  '.playwright-mcp',
  '.wrangler',
  'generated/artifact-test',
  'generated/testing',
  'generated/tmp-snapshots',
];
const deep = ['generated/raw-cache'];
const args = new Set(process.argv.slice(2));
const yes = args.has('--yes');
const includeDeep = args.has('--deep');
const targets = [...safe, ...(includeDeep ? deep : [])];

async function sizeOf(path) {
  try {
    const info = await stat(path);
    if (!info.isDirectory()) return info.size;
    const entries = await readdir(path, { withFileTypes: true });
    let total = 0;
    for (const entry of entries) total += await sizeOf(join(path, entry.name));
    return total;
  } catch {
    return 0;
  }
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
let total = 0;
for (const target of targets) {
  const path = resolve(root, target);
  const bytes = await sizeOf(path);
  if (!bytes) continue;
  total += bytes;
  console.log(`${yes ? 'removendo' : 'removeria'} ${target} (${mb(bytes)})`);
  if (yes) await rm(path, { recursive: true, force: true });
}
if (!includeDeep)
  console.log(
    'Cache bruto da Wikipedia fica: use --deep para incluí-lo (recriável com ingest:fetch-raw).',
  );
console.log(`${yes ? 'liberado' : 'liberaria'} ${mb(total)}.`);
if (!yes) console.log('Nada foi removido. Rode com --yes para aplicar.');
