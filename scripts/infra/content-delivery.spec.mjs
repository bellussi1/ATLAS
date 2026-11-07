import assert from 'node:assert/strict';
import test from 'node:test';
import { gzipSync } from 'node:zlib';

import worker from './content-delivery.worker.mjs';

const artifact = '/c/' + 'a'.repeat(64) + '.json';
const media = '/m/' + 'b'.repeat(64) + '.jpg';

function envFor(object) {
  return {
    PUBLIC_CONTENT: {
      get: async () => object,
      head: async () => object,
    },
  };
}

function objectFor(type, body = '{"ok":true}') {
  return {
    body,
    httpEtag: '"etag"',
    writeHttpMetadata: (headers) => headers.set('Content-Type', type),
  };
}

function gzipObjectFor(type, body) {
  return {
    body: new Response(gzipSync(Buffer.from(body))).body,
    httpEtag: '"etag"',
    writeHttpMetadata: (headers) => {
      headers.set('Content-Type', type);
      headers.set('Content-Encoding', 'gzip');
    },
  };
}

test('only serves the pointer, content-addressed JSON and published media', async () => {
  for (const route of ['/', '/c/', '/raw/x.bin', artifact + '/extra', media + '/x'])
    assert.equal((await worker.fetch(new Request('https://test.invalid' + route), {})).status, 404);
  assert.equal(
    (await worker.fetch(new Request('https://test.invalid' + artifact, { method: 'POST' }), {}))
      .status,
    405,
  );
});

test('serves immutable artifacts with CORS and the pointer as revalidated', async () => {
  const env = envFor(objectFor('application/json'));
  const content = await worker.fetch(new Request('https://test.invalid' + artifact), env);
  assert.equal(await content.text(), '{"ok":true}');
  assert.equal(content.headers.get('etag'), '"etag"');
  assert.equal(content.headers.get('access-control-allow-origin'), '*');
  assert.match(content.headers.get('cache-control'), /immutable/);
  assert.equal(content.headers.get('content-type'), 'application/json');

  const pointer = await worker.fetch(new Request('https://test.invalid/pointer.json'), env);
  assert.match(pointer.headers.get('cache-control'), /must-revalidate/);
  assert.equal(pointer.headers.get('access-control-allow-origin'), '*');
});

test('decodes gzip artifacts before the client verifies their digest', async () => {
  const body = '{"ok":true,"release":"test"}';
  const content = await worker.fetch(
    new Request('https://test.invalid' + artifact),
    envFor(gzipObjectFor('application/json', body)),
  );
  assert.equal(await content.text(), body);
  assert.equal(content.headers.get('content-encoding'), null);
  assert.equal(content.headers.get('content-type'), 'application/json');
});

test('handles HEAD, missing keys and preflight without a body', async () => {
  const env = envFor(objectFor('image/jpeg'));
  const head = await worker.fetch(
    new Request('https://test.invalid' + media, { method: 'HEAD' }),
    env,
  );
  assert.equal(await head.text(), '');
  assert.equal(head.headers.get('content-type'), 'image/jpeg');
  assert.match(head.headers.get('cache-control'), /immutable/);

  env.PUBLIC_CONTENT.get = async () => null;
  env.PUBLIC_CONTENT.head = async () => null;
  assert.equal(
    (await worker.fetch(new Request('https://test.invalid' + artifact), env)).status,
    404,
  );
  const options = await worker.fetch(
    new Request('https://test.invalid' + artifact, { method: 'OPTIONS' }),
    env,
  );
  assert.equal(options.status, 204);
  assert.equal(options.headers.get('access-control-allow-methods'), 'GET, HEAD, OPTIONS');
});
