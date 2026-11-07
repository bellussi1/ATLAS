import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { gunzipSync } from 'node:zlib';

import {
  assertPublicBucket,
  buildPointer,
  loadR2Config,
  mediaContentType,
  parseEnvFile,
  parsePointer,
  sha256Hex,
  signRequest,
  verifyBytes,
  putImmutable,
} from './r2-content.mjs';
import { syncContentCache } from './fetch-content.mjs';

const body = Buffer.from('{"collection":"atlas"}\n');
const expected = { sha256: sha256Hex(body), bytes: body.byteLength };

test('verifyBytes accepts the recorded size and digest', () => {
  assert.equal(verifyBytes(body, expected, 'search.json'), body);
});

test('verifyBytes rejects a digest mismatch and a size mismatch with the integrity error', () => {
  const tampered = Buffer.from('{"collection":"other"}\n');
  assert.throws(() => verifyBytes(tampered, expected, 'search.json'), /Falha de integridade/);
  assert.throws(
    () => verifyBytes(body, { ...expected, bytes: expected.bytes + 1 }, 'search.json'),
    /Falha de integridade: search\.json/,
  );
});

test('parsePointer rejects a malformed digest and an insecure base URL', () => {
  const pointer = buildPointer({
    baseUrl: 'https://pub.example.test',
    release: expected.sha256,
    manifest: expected,
    artifacts: [{ file: `search.${expected.sha256}.json`, ...expected }],
    media: [],
  });
  assert.deepEqual(parsePointer(JSON.stringify(pointer)), pointer);
  assert.throws(() =>
    parsePointer(JSON.stringify({ ...pointer, manifest: { ...expected, sha256: 'ABC' } })),
  );
  assert.throws(() =>
    parsePointer(JSON.stringify({ ...pointer, baseUrl: 'http://pub.example.test' })),
  );
});

test('parseEnvFile ignores comments, strips BOM and quotes, and accepts export', () => {
  const values = parseEnvFile(
    '﻿# comment\nexport R2_BUCKET="atlas-public"\nR2_PUBLIC_URL=https://pub.example.test/\n\n',
  );
  assert.deepEqual(values, {
    R2_BUCKET: 'atlas-public',
    R2_PUBLIC_URL: 'https://pub.example.test/',
  });
});

test('loadR2Config prefers the environment, requires every field and refuses the drafts bucket', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'atlas-r2-env-'));
  const file = join(directory, 'r2.env');
  const complete = {
    R2_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
    R2_BUCKET: 'atlas-public',
    R2_PUBLIC_URL: 'https://pub.example.test/',
    R2_ACCESS_KEY_ID: 'file-key',
    R2_SECRET_ACCESS_KEY: 'file-secret',
  };
  await writeFile(
    file,
    Object.entries(complete)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n'),
  );
  const config = await loadR2Config({ env: { R2_ACCESS_KEY_ID: 'env-key' }, file });
  assert.equal(config.accessKeyId, 'env-key');
  assert.equal(config.publicUrl, 'https://pub.example.test');
  await assert.rejects(loadR2Config({ env: {}, file: join(directory, 'missing.env') }), /ausente/);
  await assert.rejects(
    loadR2Config({ env: { ...complete, R2_BUCKET: 'atlas-drafts' }, file: join(directory, 'x') }),
    /não autorizado/,
  );
  assert.throws(() => assertPublicBucket('atlas-drafts'), /não autorizado/);
});

test('signRequest produces a SigV4 credential scope for R2 with the payload digest signed', () => {
  const config = { accessKeyId: 'key', secretAccessKey: 'secret' };
  const signed = signRequest({
    method: 'PUT',
    url: new URL('https://account.r2.cloudflarestorage.com/atlas-public/c/x.json'),
    headers: { 'Content-Type': 'application/json' },
    body,
    config,
    now: new Date('2026-11-03T12:00:00Z'),
  });
  assert.equal(signed['x-amz-date'], '20261103T120000Z');
  assert.equal(signed['x-amz-content-sha256'], expected.sha256);
  assert.match(
    signed.authorization,
    /^AWS4-HMAC-SHA256 Credential=key\/20261103\/auto\/s3\/aws4_request, SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date, Signature=[a-f0-9]{64}$/,
  );
});

test('media types are restricted to the published image formats', () => {
  assert.equal(mediaContentType('JPG'), 'image/jpeg');
  assert.throws(() => mediaContentType('exe'), /não suportada/);
});

test('syncContentCache writes only digest-matching objects and rejects tampered downloads', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'atlas-content-cache-'));
  const pointerText = JSON.stringify(
    buildPointer({
      baseUrl: 'https://pub.example.test',
      release: expected.sha256,
      manifest: expected,
      artifacts: [{ file: `search.${expected.sha256}.json`, ...expected }],
      media: [],
    }),
  );
  const served = new Map([[`c/${expected.sha256}.json`, body]]);
  const fetchImpl = async (url) => {
    const key = url.replace('https://pub.example.test/', '');
    return served.has(key)
      ? new Response(served.get(key), { status: 200 })
      : new Response('missing', { status: 404 });
  };
  const result = await syncContentCache({ pointerText, directory, fetchImpl });
  // The manifest and the single artifact share a digest here, so the second entry is already cached.
  assert.deepEqual(result, { release: expected.sha256, downloaded: 1, total: 2 });
  assert.deepEqual(await readFile(join(directory, 'c', `${expected.sha256}.json`)), body);

  served.set(`c/${expected.sha256}.json`, Buffer.from('tampered'));
  const tamperedDirectory = await mkdtemp(join(tmpdir(), 'atlas-content-tampered-'));
  await assert.rejects(
    syncContentCache({ pointerText, directory: tamperedDirectory, fetchImpl }),
    /Falha de integridade/,
  );
  await assert.rejects(readFile(join(tamperedDirectory, 'c', `${expected.sha256}.json`)));
});

test('syncContentCache retries a transient 429 before failing', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'atlas-content-retry-'));
  const pointerText = JSON.stringify(
    buildPointer({
      baseUrl: 'https://pub.example.test',
      release: expected.sha256,
      manifest: expected,
      artifacts: [{ file: `search.${expected.sha256}.json`, ...expected }],
      media: [],
    }),
  );
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) return new Response('busy', { status: 429, headers: { 'retry-after': '0' } });
    return new Response(body, { status: 200 });
  };
  const result = await syncContentCache({ pointerText, directory, fetchImpl, retryBaseMs: 1 });
  assert.deepEqual(result, { release: expected.sha256, downloaded: 1, total: 2 });
  assert.equal(calls, 2);
  assert.deepEqual(await readFile(join(directory, 'c', `${expected.sha256}.json`)), body);
});

test('putImmutable gzips a compressed object and replaces an uncompressed copy once', async (t) => {
  const config = {
    endpoint: 'https://r2.test',
    bucket: 'atlas-public',
    accessKeyId: 'id',
    secretAccessKey: 'secret',
  };
  const body = Buffer.from('{"a":1}');
  const stored = { encoding: null, length: String(body.byteLength) };
  const puts = [];
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    if (init.method === 'PUT') {
      puts.push(init);
      stored.encoding = init.headers['content-encoding'];
      return new Response(null, { status: 200 });
    }
    return new Response(null, {
      status: 200,
      headers: {
        'content-length': stored.length,
        ...(stored.encoding ? { 'content-encoding': stored.encoding } : {}),
      },
    });
  });
  t.mock.method(console, 'log', () => undefined);
  const object = { key: 'c/x.json', body, contentType: 'application/json', compress: true };
  await putImmutable(config, object);
  await putImmutable(config, object);
  assert.equal(puts.length, 1);
  assert.equal(puts[0].headers['content-encoding'], 'gzip');
  assert.equal(gunzipSync(puts[0].body).toString(), '{"a":1}');
});
