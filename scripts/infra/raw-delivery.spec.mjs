import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './raw-delivery.worker.mjs';

const path = '/raw/' + 'a'.repeat(64) + '.bin';
test('recusa outros caminhos e métodos antes de ler o bucket', async () => {
  const env = {};
  for (const route of ['/', '/pointer.json', '/raw/', '/raw/../drafts', path + '/extra'])
    assert.equal(
      (await worker.fetch(new Request('https://test.invalid' + route), env)).status,
      404,
    );
  assert.equal(
    (await worker.fetch(new Request('https://test.invalid' + path, { method: 'POST' }), env))
      .status,
    405,
  );
});
test('entrega os bytes e metadados públicos, com HEAD e 404', async () => {
  const object = {
    body: 'captura original',
    httpEtag: '"etag"',
    writeHttpMetadata: (headers) => headers.set('Content-Type', 'application/json'),
  };
  const env = {
    PUBLIC_CAPTURES: {
      get: async (key) => {
        assert.equal(key, path.slice(1));
        return object;
      },
      head: async () => object,
    },
  };
  const response = await worker.fetch(new Request('https://test.invalid' + path), env);
  assert.equal(await response.text(), object.body);
  assert.equal(response.headers.get('etag'), object.httpEtag);
  assert.match(response.headers.get('cache-control'), /immutable/);
  assert.equal(
    await (
      await worker.fetch(new Request('https://test.invalid' + path, { method: 'HEAD' }), env)
    ).text(),
    '',
  );
  env.PUBLIC_CAPTURES.get = async () => null;
  assert.equal((await worker.fetch(new Request('https://test.invalid' + path), env)).status, 404);
});
