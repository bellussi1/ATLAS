#!/usr/bin/env node
// Publishes the compiled content and licensed media to the public R2 bucket, then pins the
// release in src/content/content-pointer.json. Run `npm run content:build` first.
import './content/register-source-modules.mjs';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { formatJson } from './content/source-graph.mjs';
import {
  artifactKey,
  atomicFile,
  buildPointer,
  loadR2Config,
  mediaContentType,
  mediaKey,
  parsePointer,
  pointerPath,
  projectRoot,
  sha256Hex,
  signRequest,
  verifyBytes,
} from './content/r2-content.mjs';

const { contentManifestSchema } =
  await import('../src/app/core/content/models/content-artifacts.ts');
const { DEFAULT_CONTENT_BASE_URL } =
  await import('../src/app/core/content/models/content-pointer.ts');
const dryRun = process.argv.includes('--dry-run');
const compiled = join(projectRoot, 'generated/content');

/** Signed S3-compatible request to the R2 bucket; `config` never leaves this process. */
async function r2(config, method, key, { body, contentType, cacheControl } = {}) {
  const url = new URL(`/${config.bucket}/${key}`, config.endpoint);
  const headers = Object.fromEntries(
    Object.entries({ 'content-type': contentType, 'cache-control': cacheControl }).filter(
      ([, value]) => value !== undefined,
    ),
  );
  const { host, authorization, ...transport } = signRequest({
    method,
    url,
    headers,
    body,
    config,
    now: new Date(),
  });
  return fetch(url, { method, headers: { ...transport, authorization }, body });
}

/** Content-addressed objects are immutable: an existing key with the same size is reused. */
async function putImmutable(config, { key, body, contentType }) {
  if (dryRun) return console.log(`[dry-run] ${key} (${body.byteLength} bytes)`);
  const head = await r2(config, 'HEAD', key);
  if (head.status === 200) {
    if (Number(head.headers.get('content-length')) !== body.byteLength)
      throw new Error(`Objeto imutável com tamanho divergente: ${key}`);
    return console.log(`já publicado: ${key}`);
  }
  if (head.status !== 404) throw new Error(`Falha ao consultar ${key}: HTTP ${head.status}`);
  const put = await r2(config, 'PUT', key, {
    body,
    contentType,
    cacheControl: 'public, max-age=31536000, immutable',
  });
  if (!put.ok) throw new Error(`Falha ao publicar ${key}: HTTP ${put.status}`);
  console.log(`publicado: ${key}`);
}

async function loadArtifacts() {
  const manifestBody = await readFile(join(compiled, 'manifest.json'));
  const manifest = contentManifestSchema.parse(JSON.parse(manifestBody.toString('utf8')));
  const resources = [
    ...manifest.collections,
    manifest.search,
    manifest.adjacency,
    manifest.layouts,
  ];
  const artifacts = [];
  for (const resource of resources) {
    const body = await readFile(join(compiled, resource.file));
    verifyBytes(body, resource, resource.file);
    artifacts.push({ file: resource.file, sha256: resource.sha256, bytes: resource.bytes, body });
  }
  const manifestEntry = { sha256: sha256Hex(manifestBody), bytes: manifestBody.byteLength };
  return { manifest, manifestBody, manifestEntry, artifacts };
}

/** Only media with a known, reproducible licence is published; the rest are reported. */
async function loadMedia(manifest) {
  const seen = new Map();
  const skipped = [];
  for (const collection of manifest.collections) {
    const atlas = JSON.parse(await readFile(join(compiled, collection.file), 'utf8'));
    for (const license of atlas.assetLicenses) {
      if (!license.assetPath.startsWith('/') || seen.has(license.assetPath)) continue;
      seen.set(license.assetPath, license);
      if (license.status !== 'known' || license.reproduction !== 'allowed' || !license.license) {
        skipped.push(`${license.assetPath}: licença não reproduzível`);
        continue;
      }
      const file = join(projectRoot, 'public', license.assetPath);
      try {
        await stat(file);
      } catch {
        skipped.push(`${license.assetPath}: arquivo ausente em public/`);
        continue;
      }
      const extension = license.assetPath.split('.').pop().toLowerCase();
      const body = await readFile(file);
      seen.set(license.assetPath, { ...license, body, extension });
    }
  }
  const media = [];
  for (const entry of seen.values()) {
    if (!entry.body) continue;
    const sha256 = sha256Hex(entry.body);
    media.push({
      path: entry.assetPath,
      key: mediaKey(sha256, entry.extension),
      sha256,
      bytes: entry.body.byteLength,
      contentType: mediaContentType(entry.extension),
      license: {
        assetPath: entry.assetPath,
        creator: entry.creator,
        license: entry.license,
        licenseUrl: entry.licenseUrl,
        ...(entry.sourceUrl ? { sourceUrl: entry.sourceUrl } : {}),
        status: entry.status,
        reproduction: entry.reproduction,
      },
      body: entry.body,
    });
  }
  return { media, skipped };
}

async function main() {
  const config = await loadR2Config().catch((error) => {
    if (!dryRun) throw error;
    console.log(`[dry-run] sem credenciais: ${error.message}`);
    return null;
  });
  const existing = await readFile(pointerPath, 'utf8')
    .then(parsePointer)
    .catch(() => null);
  const baseUrl = config?.publicUrl ?? existing?.baseUrl;
  if (!baseUrl) throw new Error('URL pública ausente: defina R2_PUBLIC_URL.');
  if (baseUrl !== DEFAULT_CONTENT_BASE_URL)
    throw new Error(`R2_PUBLIC_URL difere da URL que o app lê: ${DEFAULT_CONTENT_BASE_URL}`);

  const { manifest, manifestBody, manifestEntry, artifacts } = await loadArtifacts();
  const { media, skipped } = await loadMedia(manifest);

  await putImmutable(config, {
    key: artifactKey(manifestEntry.sha256),
    body: manifestBody,
    contentType: 'application/json',
  });
  for (const artifact of artifacts)
    await putImmutable(config, {
      key: artifactKey(artifact.sha256),
      body: artifact.body,
      contentType: 'application/json',
    });
  for (const item of media)
    await putImmutable(config, { key: item.key, body: item.body, contentType: item.contentType });

  const pointer = buildPointer({
    baseUrl,
    release: manifest.release,
    manifest: manifestEntry,
    artifacts: artifacts.map(({ file, sha256, bytes }) => ({ file, sha256, bytes })),
    media: media.map(({ body, ...item }) => item),
  });
  const pointerText = await formatJson(pointer);
  if (dryRun) {
    console.log(`[dry-run] pointer release ${pointer.release}; ${media.length} mídias`);
  } else {
    const put = await r2(config, 'PUT', 'pointer.json', {
      body: Buffer.from(pointerText),
      contentType: 'application/json',
      cacheControl: 'no-cache',
    });
    if (!put.ok) throw new Error(`Falha ao publicar pointer.json: HTTP ${put.status}`);
    const live = await fetch(`${baseUrl}/pointer.json`, { cache: 'no-store' });
    if (!live.ok || (await live.text()) !== pointerText)
      throw new Error('pointer.json publicado não confere com o ponteiro local.');
    await atomicFile(pointerPath, pointerText);
    console.log(`ponteiro atualizado: src/content/content-pointer.json (${pointer.release})`);
  }
  for (const reason of skipped) console.log(`mídia não publicada: ${reason}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
