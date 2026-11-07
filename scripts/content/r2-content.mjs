import './register-source-modules.mjs';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
export const pointerPath = join(projectRoot, 'content/content-pointer.json');
export const cacheDirectory = join(projectRoot, 'generated/content-cache');
export const publicBucket = 'atlas-public';
export const draftsBucket = 'atlas-drafts';
const forbiddenBuckets = new Set(['atlas-drafts']);

const { artifactKey, contentPointerSchema } =
  await import('../../src/app/core/content/models/content-pointer.ts');
export { artifactKey };

export const sha256Hex = (value) => createHash('sha256').update(value).digest('hex');
export const mediaKey = (sha256, extension) => `m/${sha256}.${extension}`;

const mediaTypes = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};
export function mediaContentType(extension) {
  const type = mediaTypes[extension.toLowerCase()];
  if (!type) throw new Error(`Extensão de mídia não suportada para publicação: ${extension}`);
  return type;
}

/** Throws when bytes do not match the recorded size and digest. */
export function verifyBytes(bytes, expected, label) {
  const digest = sha256Hex(bytes);
  if (bytes.byteLength !== expected.bytes || digest !== expected.sha256)
    throw new Error(`Falha de integridade: ${label}`);
  return bytes;
}

/** Parses KEY=VALUE lines; the file is only read for its keys and never echoed. */
export function parseEnvFile(text) {
  const values = {};
  for (const raw of text.replace(/^﻿/, '').split(/\r?\n/)) {
    const line = raw.trim().replace(/^export\s+/, '');
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    values[line.slice(0, separator).trim()] = line
      .slice(separator + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, '$2');
  }
  return values;
}

export const defaultEnvFile = () =>
  process.env.ATLAS_R2_ENV_FILE ?? join(homedir(), '.atlas', 'r2.env');

/** Environment variables win over the local file; both stay outside the repository. */
async function readR2Config({ env = process.env, file = defaultEnvFile(), keys = {} } = {}) {
  let fileValues = {};
  try {
    fileValues = parseEnvFile(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const read = (...names) => names.map((name) => env[name] ?? fileValues[name]).find(Boolean);
  const config = {
    endpoint: read('R2_ENDPOINT'),
    bucket: read('R2_BUCKET'),
    publicUrl: read('R2_PUBLIC_URL'),
    accessKeyId: read(...(keys.accessKeyId ?? ['R2_ACCESS_KEY_ID'])),
    secretAccessKey: read(...(keys.secretAccessKey ?? ['R2_SECRET_ACCESS_KEY'])),
  };
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length) throw new Error(`Configuração R2 ausente: ${missing.join(', ')}`);
  return { ...config, publicUrl: config.publicUrl.replace(/\/+$/, '') };
}

export async function loadR2Config(options) {
  const config = await readR2Config(options);
  assertPublicBucket(config.bucket);
  return config;
}

/**
 * Always the private drafts bucket, never the public one. R2_DRAFTS_ACCESS_KEY_ID and
 * R2_DRAFTS_SECRET_ACCESS_KEY (a token scoped to atlas-drafts) take precedence when present.
 */
export async function loadR2DraftsConfig({ env = process.env, file = defaultEnvFile() } = {}) {
  const config = await readR2Config({
    env,
    file,
    keys: {
      accessKeyId: ['R2_DRAFTS_ACCESS_KEY_ID', 'R2_ACCESS_KEY_ID'],
      secretAccessKey: ['R2_DRAFTS_SECRET_ACCESS_KEY', 'R2_SECRET_ACCESS_KEY'],
    },
  });
  return { ...config, bucket: draftsBucket };
}

export function assertPublicBucket(bucket) {
  if (forbiddenBuckets.has(bucket) || bucket !== publicBucket)
    throw new Error(`Bucket não autorizado para publicação: ${bucket}`);
}

/** AWS Signature Version 4 for the R2 S3 API (region `auto`). */
export function signRequest({ method, url, headers = {}, body = Buffer.alloc(0), config, now }) {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);
  const all = Object.fromEntries(
    Object.entries({
      ...headers,
      host: url.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    }).map(([name, value]) => [name.toLowerCase(), String(value).trim()]),
  );
  const names = Object.keys(all).sort();
  const canonicalHeaders = names.map((name) => `${name}:${all[name]}\n`).join('');
  const signedHeaders = names.join(';');
  const canonicalQuery = [...url.searchParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .join('&');
  const canonicalRequest = [
    method,
    url.pathname,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonicalRequest)].join('\n');
  const hmac = (key, value) => createHmac('sha256', key).update(value).digest();
  const signingKey = ['auto', 's3', 'aws4_request'].reduce(
    (key, part) => hmac(key, part),
    hmac(`AWS4${config.secretAccessKey}`, dateStamp),
  );
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  return {
    ...all,
    authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

/**
 * Signed S3-compatible request to the R2 bucket; `config` never leaves this process. Identity
 * encoding keeps HEAD's Content-Length equal to the stored size (R2 gzips JSON otherwise).
 */
export async function r2(
  config,
  method,
  key,
  { body, contentType, contentEncoding, cacheControl, query, contentMd5 } = {},
) {
  const url = new URL(`/${config.bucket}/${key}`, config.endpoint);
  if (query) url.search = query.startsWith('?') ? query : `?${query}`;
  const headers = Object.fromEntries(
    Object.entries({
      'content-type': contentType,
      'content-encoding': contentEncoding,
      'content-md5': contentMd5,
      'cache-control': cacheControl,
      'accept-encoding': 'identity',
    }).filter(([, value]) => value !== undefined),
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

/** Lists a bucket prefix through the S3 API, following continuation tokens. */
export async function listR2Objects(config, prefix = '') {
  const objects = [];
  let token;
  do {
    const query = new URLSearchParams({
      'list-type': '2',
      prefix,
      'max-keys': '1000',
    });
    if (token) query.set('continuation-token', token);
    const response = await r2(config, 'GET', '', { query: query.toString() });
    if (!response.ok) throw new Error(`Falha ao listar ${prefix}: HTTP ${response.status}`);
    const text = await response.text();
    for (const match of text.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const key = match[1].match(/<Key>([\s\S]*?)<\/Key>/)?.[1];
      const size = Number(match[1].match(/<Size>(\d+)<\/Size>/)?.[1] ?? 0);
      const lastModified = match[1].match(/<LastModified>([\s\S]*?)<\/LastModified>/)?.[1];
      if (key) objects.push({ key, size, lastModified: lastModified ?? null });
    }
    token = /<IsTruncated>true<\/IsTruncated>/.test(text)
      ? text.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1]
      : undefined;
  } while (token);
  return objects;
}

/** Deletes up to 1,000 keys per S3 batch, with the Content-MD5 the API requires. */
export async function deleteR2Objects(config, keys) {
  let deleted = 0;
  for (let offset = 0; offset < keys.length; offset += 1000) {
    const batch = keys.slice(offset, offset + 1000);
    const body = Buffer.from(
      `<Delete><Quiet>true</Quiet>${batch
        .map((key) => `<Object><Key>${key}</Key></Object>`)
        .join('')}</Delete>`,
    );
    const contentMd5 = createHash('md5').update(body).digest('base64');
    const response = await r2(config, 'POST', '', {
      query: 'delete',
      body,
      contentType: 'application/xml',
      contentMd5,
    });
    if (!response.ok) throw new Error(`Falha ao apagar capturas: HTTP ${response.status}`);
    deleted += batch.length;
  }
  return deleted;
}

/**
 * Content-addressed objects are immutable: an existing key with the same content is reused.
 * With `compress`, the object is stored gzipped; the key and the pinned digest describe the
 * decompressed bytes, which is what fetch returns. An uncompressed copy is replaced in place.
 */
export async function putImmutable(
  config,
  { key, body, contentType, compress = false },
  { dryRun = false, quiet = false } = {},
) {
  if (dryRun) {
    if (!quiet) console.log(`[dry-run] ${key} (${body.byteLength} bytes)`);
    return;
  }
  const head = await r2(config, 'HEAD', key);
  if (head.status !== 200 && head.status !== 404)
    throw new Error(`Falha ao consultar ${key}: HTTP ${head.status}`);
  if (head.status === 200) {
    const stored = head.headers.get('content-encoding');
    if (compress && stored === 'gzip') {
      if (!quiet) console.log(`já publicado: ${key}`);
      return;
    }
    if (Number(head.headers.get('content-length')) !== body.byteLength)
      throw new Error(`Objeto imutável com tamanho divergente: ${key}`);
    if (!compress) {
      if (!quiet) console.log(`já publicado: ${key}`);
      return;
    }
  }
  const put = await r2(config, 'PUT', key, {
    body: compress ? gzipSync(body, { level: 9 }) : body,
    contentType,
    ...(compress ? { contentEncoding: 'gzip' } : {}),
    cacheControl: 'public, max-age=31536000, immutable',
  });
  if (!put.ok) throw new Error(`Falha ao publicar ${key}: HTTP ${put.status}`);
  if (!quiet) console.log(`publicado: ${key}`);
}

/** Writes through a temporary file so an interrupted run never leaves a partial cache entry. */
export async function atomicFile(path, body) {
  await mkdir(dirname(path), { recursive: true });
  const pending = `${path}.pending-${randomUUID()}`;
  try {
    await writeFile(pending, body, { flag: 'wx' });
    await rename(pending, path);
  } finally {
    await unlink(pending).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}

export function parsePointer(text) {
  return contentPointerSchema.parse(JSON.parse(text));
}

export function buildPointer({ baseUrl, release, manifest, artifacts, media }) {
  return contentPointerSchema.parse({
    schemaVersion: 1,
    baseUrl,
    release,
    manifest,
    artifacts,
    media,
  });
}
