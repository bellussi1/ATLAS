// Captura de uma execução da coleta Wikipedia: manifest versionado (URL, tipo, SHA-256, licença,
// revisão) e corpos brutos em `blobs/`, ignorados pelo Git. Só o manifest é versionado; as respostas
// JSON seguem para raw/<sha>.bin pelo mesmo caminho das capturas Wikimedia (`ingest:publish-raw`).
// O HTML dos artigos é texto CC BY-SA e fica local: não é publicado nem reidratado do R2.
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import { atomicFile } from '../../content/r2-content.mjs';
import { digest, rawCacheDirectory } from '../wikimedia/archive.mjs';

export const wikiRawRoot = fileURLToPath(new URL('./raw/', import.meta.url));

const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const captureSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal('wikipedia-capture'),
  tradition: z.string().regex(/^[a-z][a-z-]*$/),
  capturedAt: z.iso.datetime(),
  requests: z.array(
    z.object({
      url: z.url({ protocol: /^https$/ }),
      kind: z.enum(['json', 'html']),
      contentType: z.string(),
      etag: z.string().nullable(),
      sha256: hash,
      license: z.string(),
    }),
  ),
});

/** Writes blobs first and the manifest last, so a manifest never points at a missing body. */
export async function saveCapture(
  tradition,
  responses,
  { root = wikiRawRoot, capturedAt = new Date() } = {},
) {
  const directory = join(root, tradition, capturedAt.toISOString().replace(/[:.]/g, '-'));
  const requests = [...responses.values()].sort((a, b) => a.url.localeCompare(b.url, 'en'));
  for (const request of requests)
    await atomicFile(join(directory, 'blobs', `${request.sha256}.bin`), request.bytes);
  const manifest = captureSchema.parse({
    schemaVersion: 1,
    kind: 'wikipedia-capture',
    tradition,
    capturedAt: capturedAt.toISOString(),
    requests: requests.map(({ bytes: _bytes, ...request }) => request),
  });
  await atomicFile(join(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return directory;
}

/** Local blob of the capture, then the R2 cache that `ingest:fetch-raw` fills; `null` when neither has it. */
async function readBodyIfPresent(root, request) {
  for (const directory of [join(root, 'blobs'), rawCacheDirectory]) {
    try {
      return await readFile(join(directory, `${request.sha256}.bin`));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return null;
}

const missingBody = (request) =>
  Error(
    `Corpo ausente: ${request.url}. ${request.kind === 'html' ? 'HTML de artigos é local: recapture a página.' : 'Rode `npm run ingest:fetch-raw`.'}`,
  );

/** Reads a capture and checks every body against its digest; `Map` from URL to the response. */
export async function loadCapture(directory) {
  const root = resolve(directory);
  const manifest = captureSchema.parse(
    JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8')),
  );
  const responses = new Map();
  for (const request of manifest.requests) {
    const bytes = await readBodyIfPresent(root, request);
    if (!bytes) throw missingBody(request);
    if (digest(bytes) !== request.sha256) throw Error(`Falha de integridade/hash: ${request.url}`);
    responses.set(request.url, { ...request, bytes });
  }
  return { manifest, responses };
}

/**
 * Offline check of every saved capture: the manifest schema, and each body present with its digest.
 * JSON bodies must be present (locally or in the R2 cache); HTML is checked only where it is local.
 */
export async function verifyCaptures(root = wikiRawRoot) {
  const checked = [];
  for (const tradition of await readdir(root, { withFileTypes: true }).catch(() => [])) {
    if (!tradition.isDirectory()) continue;
    for (const capture of await readdir(join(root, tradition.name), { withFileTypes: true })) {
      if (!capture.isDirectory()) continue;
      const directory = join(root, tradition.name, capture.name);
      const manifest = captureSchema.parse(
        JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8')),
      );
      let localHtml = 0;
      for (const request of manifest.requests) {
        const bytes = await readBodyIfPresent(directory, request);
        if (!bytes) {
          if (request.kind === 'json') throw missingBody(request);
          continue;
        }
        if (digest(bytes) !== request.sha256)
          throw Error(`Falha de integridade/hash: ${request.url}`);
        if (request.kind === 'html') localHtml += 1;
      }
      checked.push({ directory, requests: manifest.requests.length, localHtml });
    }
  }
  return checked;
}
