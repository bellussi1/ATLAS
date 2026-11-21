#!/usr/bin/env node
// Mirrors the reproducible Commons thumbnails into the public bucket as immutable m/<sha256>.<ext>
// objects and records creator, licence and origin in content/media-mirror.json (committed).
// Run `npm run content:build` first: candidates come from the compiled collections.
//   npm run infra:mirror-media -- --dry-run          lists candidates and exclusions, no network
//   npm run infra:mirror-media -- --limit 25         mirrors at most 25 new images
//   npm run infra:mirror-media                       mirrors every new candidate
// Then `npm run content:publish` pins the mirror index in the pointer.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { loadR2Config, projectRoot, putImmutable } from '../content/r2-content.mjs';
import {
  extensionFor,
  maxImageBytes,
  mirrorEntry,
  mirrorFile,
  selectCandidates,
  serializeMirror,
  sniffImage,
} from './media-mirror.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : Infinity;
const userAgent = 'atlas-media-mirror/1.0 (+https://atlas-bellussi.pages.dev)';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function download(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(url, { headers: { 'user-agent': userAgent } });
    if (response.ok) {
      const length = Number(response.headers.get('content-length') ?? 0);
      if (length > maxImageBytes) throw new Error(`arquivo grande demais (${length} bytes)`);
      const body = Buffer.from(await response.arrayBuffer());
      if (body.byteLength > maxImageBytes) throw new Error('arquivo grande demais');
      return body;
    }
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 4)
      throw new Error(`HTTP ${response.status}`);
    const retryAfter = Number(response.headers.get('retry-after'));
    await sleep(retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt);
  }
  throw new Error('tentativas esgotadas');
}

async function loadCompiledAtlases() {
  const compiled = join(projectRoot, 'generated/content');
  const manifest = JSON.parse(await readFile(join(compiled, 'manifest.json'), 'utf8'));
  const atlases = [];
  for (const collection of manifest.collections)
    atlases.push(JSON.parse(await readFile(join(compiled, collection.file), 'utf8')));
  return atlases;
}

async function main() {
  const path = join(projectRoot, mirrorFile);
  const existing = await readFile(path, 'utf8')
    .then((text) => JSON.parse(text).entries)
    .catch((error) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
  const mirrored = new Map(existing.map((entry) => [entry.path, entry]));
  const { candidates, skipped } = selectCandidates(await loadCompiledAtlases());
  const pending = candidates.filter((license) => !mirrored.has(license.assetPath));
  console.log(
    `${candidates.length} imagens reproduzíveis; ${mirrored.size} já espelhadas; ` +
      `${pending.length} novas; ${skipped.length} excluídas por licença.`,
  );
  for (const item of skipped.slice(0, 10)) console.log(`  excluída: ${item.reason}: ${item.path}`);
  if (dryRun) return console.log('[dry-run] nada foi baixado nem enviado.');
  if (pending.length === 0) return;

  const config = await loadR2Config();
  const today = new Date().toISOString().slice(0, 10);
  let done = 0;
  const failures = [];
  for (const license of pending.slice(0, limit)) {
    try {
      const bytes = await download(license.assetPath);
      const contentType = sniffImage(bytes);
      if (!contentType || !extensionFor(contentType)) throw new Error('formato não suportado');
      const entry = mirrorEntry({ license, bytes, contentType, mirroredAt: today });
      await putImmutable(config, { key: entry.key, body: bytes, contentType }, { quiet: true });
      mirrored.set(entry.path, entry);
      done += 1;
      if (done % 25 === 0) {
        await writeFile(path, serializeMirror([...mirrored.values()]));
        console.log(`  ${done}/${Math.min(limit, pending.length)}`);
      }
    } catch (error) {
      failures.push(`${license.assetPath}: ${error.message}`);
    }
    await sleep(250);
  }
  await writeFile(path, serializeMirror([...mirrored.values()]));
  console.log(`${done} imagens espelhadas; ${failures.length} falhas; registro em ${mirrorFile}.`);
  for (const failure of failures.slice(0, 10)) console.log(`  falhou: ${failure}`);
  console.log('Próximo passo: npm run content:publish (fixa o índice do espelho no ponteiro).');
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
