import { randomUUID } from 'node:crypto';
import { access, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import {
  readSourceGraphBytes,
  sourceDirectory,
  writeSourceGraph,
} from '../../content/source-graph.mjs';

import { knowledgeGraphSchema } from '../../../src/app/core/content/models/content-schema.ts';
import {
  canonicalJson,
  captureClient,
  configSchema,
  digest,
  loadArchive,
  saveArchive,
} from './archive.mjs';
import { getResource } from './client.mjs';
import { reconcileRequests } from './reconcile.mjs';
import { transformGraph } from './transform.mjs';

const projectRoot = fileURLToPath(new URL('../../../', import.meta.url));

async function readOptional(path) {
  try {
    return await readFile(path);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function mediaPath(root, assetPath) {
  if (!assetPath.startsWith('/assets/')) throw Error(`Caminho de mídia inválido: ${assetPath}`);
  const path = resolve(root, `.${assetPath}`);
  const inside = relative(resolve(root), path);
  if (!inside || isAbsolute(inside) || inside === '..' || inside.startsWith(`..${sep}`))
    throw Error(`Mídia fora do diretório autorizado: ${assetPath}`);
  return path;
}

function contentHash(bytes) {
  try {
    return digest(canonicalJson(JSON.parse(bytes.toString('utf8'))));
  } catch {
    return null;
  }
}

async function publish(
  outputPath,
  bytes,
  allowedHashes,
  allowedContentHashes,
  media,
  mediaRoot,
  canonical,
) {
  const readCurrent = canonical
    ? async () => {
        try {
          return await readSourceGraphBytes(canonical);
        } catch (error) {
          if (error.code === 'ENOENT') return null;
          throw error;
        }
      }
    : () => readOptional(outputPath);
  const current = await readCurrent();
  if (
    current &&
    !allowedHashes.includes(digest(current)) &&
    !allowedContentHashes.includes(contentHash(current))
  )
    throw Error(
      'O destino foi alterado desde a captura; preserve a curadoria e faça uma nova captura.',
    );
  const outputHash = current && digest(current);
  const pending = `${outputPath}.pending-${randomUUID()}`;
  const createdMedia = [];
  await mkdir(dirname(outputPath), { recursive: true });
  try {
    await writeFile(pending, bytes, { flag: 'wx' });
    for (const item of media) {
      const path = mediaPath(mediaRoot, item.assetPath);
      const existing = await readOptional(path);
      if (existing) {
        if (digest(existing) !== digest(item.bytes)) throw Error(`Colisão de mídia: ${path}`);
        continue;
      }
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, item.bytes, { flag: 'wx' });
      createdMedia.push(path);
    }
    const latest = await readCurrent();
    if ((latest && digest(latest)) !== outputHash)
      throw Error('O destino mudou durante a ingestão; publicação cancelada.');
    if (canonical)
      await writeSourceGraph(JSON.parse(bytes.toString('utf8')), { directory: canonical });
    else await rename(pending, outputPath);
  } catch (error) {
    for (const path of createdMedia) await unlink(path);
    throw error;
  } finally {
    await unlink(pending).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}

export async function runIngestion({
  collectionKey,
  config: suppliedConfig,
  mode,
  archiveDir,
  baselinePath,
  sourceRoot = sourceDirectory,
  outputPath = join(sourceRoot, 'manifest.json'),
  mediaMode = 'preserve',
  mediaRoot = join(projectRoot, 'public'),
  fetchResource = getResource,
  onProgress,
}) {
  if (!['capture', 'offline'].includes(mode))
    throw Error('Escolha captura explícita ou modo offline.');
  if (!['preserve', 'refresh', 'remote'].includes(mediaMode))
    throw Error('Política de mídia inválida.');
  const archiveRoot = resolve(archiveDir);
  const outputRelative = relative(archiveRoot, resolve(outputPath));
  if (
    !isAbsolute(outputRelative) &&
    outputRelative !== '..' &&
    !outputRelative.startsWith(`..${sep}`)
  )
    throw Error('O destino não pode modificar os arquivos da captura.');
  let config;
  let archive;
  let client;
  let baseline;
  let capturedAt;
  if (mode === 'offline') {
    archive = await loadArchive(archiveDir);
    const manifest = archive.manifest;
    config = configSchema.parse(suppliedConfig ?? manifest.config);
    if (
      manifest.collectionKey !== collectionKey ||
      manifest.configHash !== digest(canonicalJson(config))
    )
      throw Error('Configuração/coleção incompatível com a captura offline.');
    baseline = archive.baseline;
    capturedAt = manifest.capturedAt;
    mediaMode = manifest.mediaMode;
    client = archive;
  } else {
    config = configSchema.parse(suppliedConfig);
    try {
      await access(archiveDir);
      throw Error(`Captura já existe: ${archiveDir}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    baseline = baselinePath ? await readFile(baselinePath) : await readSourceGraphBytes(sourceRoot);
    capturedAt = new Date().toISOString().slice(0, 10);
    client = captureClient(fetchResource);
  }
  const graph = knowledgeGraphSchema.parse(JSON.parse(baseline.toString('utf8')));
  reconcileRequests(graph, config.entities);
  const result = await transformGraph({
    graph,
    config,
    atlasKey: collectionKey,
    retrievedAt: capturedAt,
    mediaMode,
    onProgress,
    getJson: async (url) => {
      const value = JSON.parse((await client.read(url, 'json')).toString('utf8'));
      if (!value || typeof value !== 'object' || value.error)
        throw Error(`Resposta Wikimedia inválida: ${url}`);
      return value;
    },
    getImage: (url) => client.read(url, 'image'),
  });
  knowledgeGraphSchema.parse(result.graph);
  reconcileRequests(result.graph, []);
  const formatting = await prettier.resolveConfig(join(sourceRoot, 'manifest.json'));
  const bytes = Buffer.from(
    await prettier.format(JSON.stringify(result.graph), {
      ...formatting,
      parser: 'json',
      endOfLine: 'lf',
    }),
  );
  const snapshotHash = digest(bytes);
  if (archive && snapshotHash !== archive.manifest.snapshotHash)
    throw Error('Hash do resultado diverge da captura: transformação incompatível.');
  if (mode === 'capture') {
    await saveArchive(
      archiveDir,
      {
        schemaVersion: 1,
        pipelineVersion: 1,
        collectionKey,
        config,
        configHash: digest(canonicalJson(config)),
        capturedAt,
        mediaMode,
        baselineHash: digest(baseline),
        snapshotHash,
        requests: [...client.responses.values()]
          .sort((a, b) => a.url.localeCompare(b.url, 'en'))
          .map(({ bytes: _bytes, ...request }) => request),
      },
      baseline,
      client.responses,
    );
  }
  await publish(
    resolve(outputPath),
    bytes,
    [digest(baseline), snapshotHash],
    [contentHash(baseline), contentHash(bytes)],
    result.mediaWrites,
    mediaRoot,
    resolve(outputPath) === resolve(sourceRoot, 'manifest.json') ? sourceRoot : null,
  );
  return {
    snapshotHash,
    mapping: result.mapping,
    counts: result.counts,
    ambiguousAliases: result.ambiguousAliases,
  };
}
