#!/usr/bin/env node
/**
 * Monta um release local a partir de `generated/content`, sem R2 e sem rede.
 *
 *   node scripts/content/build-local-release.mjs
 *
 * Escreve `generated/content-cache/pointer.json` com `baseUrl` local e copia os
 * artefatos para `generated/content-cache/c/`. As mídias já baixadas do release
 * pinado são reaproveitadas; arquivos novos em `generated/media-source/` também
 * entram quando existem. Nada é publicado.
 */
import './register-source-modules.mjs';
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  artifactKey,
  buildPointer,
  cacheDirectory,
  mediaContentType,
  mediaKey,
  parsePointer,
  pointerPath,
  projectRoot,
  sha256Hex,
  verifyBytes,
} from './r2-content.mjs';

const { contentManifestSchema } =
  await import('../../src/app/core/content/models/content-artifacts.ts');

const compiled = join(projectRoot, 'generated/content');
const mediaSource = join(projectRoot, 'generated/media-source');
const localBaseUrl = process.env.ATLAS_LOCAL_CONTENT_URL || 'http://127.0.0.1:4305/content';

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function loadArtifacts() {
  const manifestBody = await readFile(join(compiled, 'manifest.json'));
  const manifest = contentManifestSchema.parse(JSON.parse(manifestBody.toString('utf8')));
  const resources = [
    ...manifest.collections,
    ...manifest.ideologies,
    ...(manifest.itineraries ?? []),
    manifest.search,
    manifest.adjacency,
    manifest.layouts,
    ...(manifest.network ? [manifest.network] : []),
    ...(manifest.bundle ? [manifest.bundle] : []),
    ...(manifest.networkBundle ? [manifest.networkBundle] : []),
  ];
  const artifacts = [];
  for (const resource of resources) {
    const body = await readFile(join(compiled, resource.file));
    verifyBytes(body, resource, resource.file);
    artifacts.push({ file: resource.file, sha256: resource.sha256, bytes: resource.bytes, body });
  }
  return {
    manifest,
    manifestBody,
    manifestEntry: { sha256: sha256Hex(manifestBody), bytes: manifestBody.byteLength },
    artifacts,
  };
}

async function loadMedia(pinned) {
  const media = [];
  const skipped = [];
  for (const item of pinned?.media ?? []) {
    const cached = join(cacheDirectory, item.key);
    const source = join(mediaSource, item.path);
    let body;
    let key = item.key;
    let contentType = item.contentType;
    if (await exists(cached)) {
      body = await readFile(cached);
      verifyBytes(body, item, item.path);
    } else if (await exists(source)) {
      body = await readFile(source);
      const extension = item.path.split('.').pop()?.toLowerCase() ?? 'jpg';
      const digest = sha256Hex(body);
      key = mediaKey(digest, extension);
      contentType = mediaContentType(extension);
    } else {
      skipped.push(`${item.path}: mídia ausente no cache e em generated/media-source/`);
      continue;
    }
    media.push({ ...item, key, contentType, body });
  }
  return { media, skipped };
}

async function main() {
  const pinned = await readFile(pointerPath, 'utf8')
    .then(parsePointer)
    .catch(() => null);
  const { manifest, manifestBody, manifestEntry, artifacts } = await loadArtifacts();
  const { media, skipped } = await loadMedia(pinned);

  await mkdir(join(cacheDirectory, 'c'), { recursive: true });
  await mkdir(join(cacheDirectory, 'm'), { recursive: true });
  await writeFile(join(cacheDirectory, artifactKey(manifestEntry.sha256)), manifestBody);
  for (const artifact of artifacts) {
    await writeFile(join(cacheDirectory, artifactKey(artifact.sha256)), artifact.body);
  }
  for (const item of media) {
    const destination = join(cacheDirectory, item.key);
    if (await exists(destination)) continue;
    await mkdir(join(cacheDirectory, item.key.split('/')[0]), { recursive: true });
    await writeFile(destination, item.body);
  }

  const pointer = buildPointer({
    baseUrl: localBaseUrl,
    release: manifest.release,
    manifest: manifestEntry,
    bundle: manifest.bundle
      ? { sha256: manifest.bundle.sha256, bytes: manifest.bundle.bytes }
      : null,
    networkBundle: manifest.networkBundle
      ? { sha256: manifest.networkBundle.sha256, bytes: manifest.networkBundle.bytes }
      : null,
    artifacts: artifacts.map(({ file, sha256, bytes }) => ({ file, sha256, bytes })),
    media: media.map(({ body, ...item }) => item),
  });
  const pointerText = `${JSON.stringify(pointer, null, 2)}\n`;
  await writeFile(join(cacheDirectory, 'pointer.json'), pointerText);
  await copyFile(join(cacheDirectory, 'pointer.json'), join(cacheDirectory, 'pointer.local.json'));

  console.log(
    `Release local ${pointer.release}: ${artifacts.length} artefatos, ${media.length} mídias, base ${localBaseUrl}`,
  );
  for (const reason of skipped) console.log(`[aviso] ${reason}`);
}

await main();
