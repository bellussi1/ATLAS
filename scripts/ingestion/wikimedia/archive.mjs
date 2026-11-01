import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { z } from 'zod';

export const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const configSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  mediaDirectory: z.string().regex(/^[a-z][a-z0-9-]*$/),
  entities: z
    .array(z.tuple([z.string(), z.string(), z.string(), z.string(), z.string().regex(/^Q\d+$/)]))
    .min(1),
});
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  pipelineVersion: z.literal(1),
  collectionKey: z.string().regex(/^[a-z][a-z0-9-]*$/),
  capturedAt: z.iso.date(),
  mediaMode: z.enum(['preserve', 'refresh']),
  config: configSchema,
  configHash: hash,
  baselineHash: hash,
  snapshotHash: hash,
  requests: z.array(
    z.object({
      url: z.url({ protocol: /^https$/ }),
      kind: z.enum(['json', 'image']),
      contentType: z.string(),
      sha256: hash,
      license: z.string(),
    }),
  ),
});

export function canonicalJson(value) {
  return JSON.stringify(value, (_, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b, 'en')))
      : item,
  );
}

export function captureClient(fetchResource) {
  const responses = new Map();
  return {
    responses,
    read: async (url, kind) => {
      const key = String(url);
      const previous = responses.get(key);
      if (previous && previous.kind !== kind) throw Error(`Tipo de resposta conflitante: ${key}`);
      if (!previous) {
        const response = await fetchResource(key, kind);
        const bytes = Buffer.from(response.bytes);
        if (kind === 'image' && !response.contentType.startsWith('image/'))
          throw Error(`Tipo de mídia inválido: ${key}`);
        responses.set(key, {
          url: key,
          kind,
          ...response,
          bytes,
          sha256: digest(bytes),
          license:
            kind === 'image'
              ? 'Consultar assetLicenses do snapshot e metadados Commons capturados'
              : key.includes('wikidata.org')
                ? 'CC0 1.0'
                : 'Metadados Wikimedia; origem e atribuição preservadas',
        });
      }
      return responses.get(key).bytes;
    },
  };
}

export async function loadArchive(directory) {
  const root = resolve(directory);
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8')),
  );
  if (digest(canonicalJson(manifest.config)) !== manifest.configHash)
    throw Error('Hash da configuração diverge.');
  const baseline = await readFile(join(root, 'baseline.json'));
  if (digest(baseline) !== manifest.baselineHash) throw Error('Hash do grafo de entrada diverge.');
  const responses = new Map();
  for (const request of manifest.requests) {
    if (responses.has(request.url)) throw Error(`URL duplicada no manifest: ${request.url}`);
    const bytes = await readFile(join(root, 'blobs', `${request.sha256}.bin`));
    if (digest(bytes) !== request.sha256) throw Error(`Falha de integridade/hash: ${request.url}`);
    responses.set(request.url, { ...request, bytes });
  }
  return {
    manifest,
    baseline,
    read: async (url, kind) => {
      const response = responses.get(String(url));
      if (!response || response.kind !== kind)
        throw Error(`Resposta ausente na captura offline: ${url}`);
      return response.bytes;
    },
  };
}

export async function saveArchive(directory, manifest, baseline, responses) {
  const root = resolve(directory);
  const staging = `${root}.pending-${randomUUID()}`;
  await mkdir(dirname(root), { recursive: true });
  await mkdir(staging);
  try {
    await mkdir(join(staging, 'blobs'));
    await writeFile(join(staging, 'baseline.json'), baseline);
    for (const response of responses.values()) {
      await writeFile(join(staging, 'blobs', `${response.sha256}.bin`), response.bytes);
    }
    const metadata = manifestSchema.parse(manifest);
    await writeFile(join(staging, 'manifest.json'), `${JSON.stringify(metadata, null, 2)}\n`);
    await rename(staging, root);
  } finally {
    // Only remove our freshly generated sibling staging directory, never a supplied path.
    if (
      dirname(staging) === dirname(root) &&
      basename(staging).startsWith(`${basename(root)}.pending-`)
    )
      await rm(staging, { recursive: true, force: true });
  }
}
