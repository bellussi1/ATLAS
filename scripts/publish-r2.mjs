#!/usr/bin/env node
// Publishes the compiled content and licensed media to the public R2 bucket, then pins the
// release in content/content-pointer.json. Run `npm run content:build` first. New licensed
// files are read from generated/media-source/ (never from the repository); a file already pinned
// in the current pointer is not re-read and is checked against the bucket instead.
import './content/register-source-modules.mjs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { formatJson } from './content/source-graph.mjs';
import { compactIndex, mirrorFile } from './infra/media-mirror.mjs';
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
  putImmutable as putObject,
  r2,
  sha256Hex,
  verifyBytes,
} from './content/r2-content.mjs';

const { contentManifestSchema } =
  await import('../src/app/core/content/models/content-artifacts.ts');
const { DEFAULT_CONTENT_BASE_URL } =
  await import('../src/app/core/content/models/content-pointer.ts');
const dryRun = process.argv.includes('--dry-run');
const compiled = join(projectRoot, 'generated/content');
const mediaSource = join(projectRoot, 'generated/media-source');
const putImmutable = (config, object) => putObject(config, object, { dryRun });

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
  const manifestEntry = { sha256: sha256Hex(manifestBody), bytes: manifestBody.byteLength };
  return { manifest, manifestBody, manifestEntry, artifacts };
}

function licenseRecord(license) {
  return {
    assetPath: license.assetPath,
    creator: license.creator,
    license: license.license,
    licenseUrl: license.licenseUrl,
    ...(license.sourceUrl ? { sourceUrl: license.sourceUrl } : {}),
    status: license.status,
    reproduction: license.reproduction,
  };
}

/**
 * Only media with a known, reproducible licence is published; the rest are reported. A file
 * without `body` is already pinned in the current pointer and is only verified on the bucket.
 */
async function loadMedia(manifest, pinned) {
  const licenses = new Map();
  for (const collection of manifest.collections) {
    const atlas = JSON.parse(await readFile(join(compiled, collection.file), 'utf8'));
    for (const license of atlas.assetLicenses)
      if (license.assetPath.startsWith('/') && !licenses.has(license.assetPath))
        licenses.set(license.assetPath, license);
  }
  const media = [];
  const skipped = [];
  for (const [assetPath, license] of licenses) {
    if (license.status !== 'known' || license.reproduction !== 'allowed' || !license.license) {
      skipped.push(`${assetPath}: licença não reproduzível`);
      continue;
    }
    const extension = assetPath.split('.').pop().toLowerCase();
    try {
      const body = await readFile(join(mediaSource, assetPath));
      const sha256 = sha256Hex(body);
      media.push({
        path: assetPath,
        key: mediaKey(sha256, extension),
        sha256,
        bytes: body.byteLength,
        contentType: mediaContentType(extension),
        license: licenseRecord(license),
        body,
      });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const entry = pinned.media.find((item) => item.path === assetPath);
      if (!entry) {
        skipped.push(`${assetPath}: arquivo ausente em generated/media-source/`);
        continue;
      }
      media.push({ ...entry, license: licenseRecord(license) });
    }
  }
  return { media, skipped };
}

/** A pinned file that is not re-uploaded must still be on the bucket with the pinned size. */
async function checkPinnedMedia(config, item) {
  const head = await r2(config, 'HEAD', item.key);
  if (head.status !== 200 || Number(head.headers.get('content-length')) !== item.bytes)
    throw new Error(`Mídia fixada ausente ou divergente no R2: ${item.path}`);
  console.log(`mídia já publicada: ${item.key}`);
}

/**
 * The mirrored Commons images are already on the bucket (npm run infra:mirror-media). Their compact
 * index is published as one more immutable artifact and pinned in the pointer; a mirrored object
 * missing from the bucket stops the release before the pointer changes.
 */
async function loadMirror(config) {
  const entries = await readFile(join(projectRoot, mirrorFile), 'utf8')
    .then((text) => JSON.parse(text).entries)
    .catch((error) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
  if (entries.length === 0) return null;
  const body = Buffer.from(compactIndex(entries));
  const sha256 = sha256Hex(body);
  if (config) {
    for (let offset = 0; offset < entries.length; offset += 8) {
      await Promise.all(
        entries.slice(offset, offset + 8).map(async (entry) => {
          const head = await r2(config, 'HEAD', entry.key);
          if (head.status !== 200 || Number(head.headers.get('content-length')) !== entry.bytes)
            throw new Error(`Imagem espelhada ausente ou divergente no R2: ${entry.key}`);
        }),
      );
    }
  }
  console.log(`espelho de imagens: ${entries.length} objetos verificados`);
  return { body, sha256, bytes: body.byteLength, file: `media-mirror.${sha256}.json` };
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
  const baseUrl = DEFAULT_CONTENT_BASE_URL;
  if (!baseUrl) throw new Error('URL pública ausente: defina DEFAULT_CONTENT_BASE_URL.');

  const { manifest, manifestBody, manifestEntry, artifacts } = await loadArtifacts();
  const { media, skipped } = await loadMedia(manifest, existing ?? { media: [] });
  const mirror = await loadMirror(config);
  if (mirror) {
    await putImmutable(config, {
      key: artifactKey(mirror.sha256),
      body: mirror.body,
      contentType: 'application/json',
      compress: true,
    });
    artifacts.push({
      file: mirror.file,
      sha256: mirror.sha256,
      bytes: mirror.bytes,
      body: mirror.body,
    });
  }

  await putImmutable(config, {
    key: artifactKey(manifestEntry.sha256),
    body: manifestBody,
    contentType: 'application/json',
    compress: true,
  });
  for (const artifact of artifacts)
    await putImmutable(config, {
      key: artifactKey(artifact.sha256),
      body: artifact.body,
      contentType: 'application/json',
      compress: true,
    });
  for (const item of media) {
    if (item.body) {
      await putImmutable(config, { key: item.key, body: item.body, contentType: item.contentType });
    } else if (dryRun) {
      console.log(`[dry-run] mídia fixada reutilizada: ${item.key}`);
    } else {
      await checkPinnedMedia(config, item);
    }
  }

  const pointer = buildPointer({
    baseUrl,
    release: manifest.release,
    manifest: manifestEntry,
    bundle: manifest.bundle
      ? { sha256: manifest.bundle.sha256, bytes: manifest.bundle.bytes }
      : null,
    networkBundle: manifest.networkBundle
      ? { sha256: manifest.networkBundle.sha256, bytes: manifest.networkBundle.bytes }
      : null,
    mirror: mirror ? { sha256: mirror.sha256, bytes: mirror.bytes } : null,
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
    console.log(`ponteiro atualizado: content/content-pointer.json (${pointer.release})`);
  }
  for (const reason of skipped) console.log(`mídia não publicada: ${reason}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
