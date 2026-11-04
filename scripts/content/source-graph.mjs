import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import { z } from 'zod';

import { knowledgeGraphSchema } from '../../src/app/core/content/models/content-schema.ts';
import { reconcileRequests } from '../ingestion/wikimedia/reconcile.mjs';

export const sourceDirectory = fileURLToPath(new URL('../../content/knowledge/', import.meta.url));
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export function validateSourceGraph(input) {
  const graph = knowledgeGraphSchema.parse(input);
  reconcileRequests(graph, []);
  return graph;
}
const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  version: z.string(),
  updatedAt: z.iso.date(),
  collections: z
    .array(
      z.object({
        id: z.string(),
        file: z.string().regex(/^collections\/[a-z0-9-]+\.[a-f0-9]{64}\.json$/),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
      }),
    )
    .min(1),
});

export async function formatJson(value) {
  const options = await prettier.resolveConfig(
    fileURLToPath(new URL('../../package.json', import.meta.url)),
  );
  return prettier.format(JSON.stringify(value), { ...options, parser: 'json', endOfLine: 'lf' });
}

export async function readSourceGraph(directory = sourceDirectory) {
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8')),
  );
  const atlases = await Promise.all(
    manifest.collections.map(async (item) => {
      const bytes = await readFile(join(directory, item.file));
      if (sha256(bytes) !== item.sha256) throw Error(`Hash inválido na coleção ${item.id}`);
      const atlas = JSON.parse(bytes);
      if (atlas.id !== item.id) throw Error(`Identidade de coleção incompatível: ${item.id}`);
      return atlas;
    }),
  );
  return validateSourceGraph({
    id: manifest.id,
    version: manifest.version,
    updatedAt: manifest.updatedAt,
    atlases,
  });
}

export async function readSourceGraphBytes(directory = sourceDirectory) {
  return Buffer.from(await formatJson(await readSourceGraph(directory)));
}

export async function writeSourceGraph(input, { directory = sourceDirectory } = {}) {
  const graph = validateSourceGraph(input);
  const resources = await Promise.all(
    graph.atlases.map(async (atlas) => {
      const bytes = await formatJson(atlas);
      const hash = sha256(bytes);
      return { id: atlas.id, file: `collections/${atlas.id}.${hash}.json`, sha256: hash, bytes };
    }),
  );
  const manifest = manifestSchema.parse({
    schemaVersion: 1,
    id: graph.id,
    version: graph.version,
    updatedAt: graph.updatedAt,
    collections: resources.map(({ bytes: _bytes, ...entry }) => entry),
  });
  await mkdir(join(directory, 'collections'), { recursive: true });
  for (const resource of resources) {
    const path = join(directory, resource.file);
    try {
      await writeFile(path, resource.bytes, { flag: 'wx' });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (sha256(await readFile(path)) !== resource.sha256) throw Error(`Colisão de hash: ${path}`);
    }
  }
  const pending = join(directory, `manifest.pending-${randomUUID()}.json`);
  try {
    await writeFile(pending, await formatJson(manifest), { flag: 'wx' });
    await rename(pending, join(directory, 'manifest.json'));
  } finally {
    await unlink(pending).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
  return manifest;
}
