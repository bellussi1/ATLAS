import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildVercelConfig, parseHeaders, parseRedirects } from './vercel-config.mjs';

test('converte _headers e _redirects reais para o formato do Vercel', async () => {
  const headers = await readFile(new URL('../../public/_headers', import.meta.url), 'utf8');
  const redirects = await readFile(new URL('../../public/_redirects', import.meta.url), 'utf8');
  const config = buildVercelConfig(headers, redirects);
  const global = config.headers[0].headers;
  assert.ok(global.some((h) => h.key === 'Content-Security-Policy'));
  assert.ok(global.some((h) => h.key === 'Strict-Transport-Security'));
  assert.ok(!global.some((h) => /robots/i.test(h.key)), 'o site não pode enviar X-Robots-Tag');
  assert.deepEqual(config.redirects[0], {
    source: '/marxismo',
    destination: '/leitura/marxismo',
    statusCode: 301,
  });
  assert.equal(config.cleanUrls, true);
  assert.deepEqual(config.routes, [
    { handle: 'filesystem' },
    { src: '/verbete/(.*)', dest: '/index.html' },
    { src: '/(.*)', status: 404, dest: '/404.html' },
  ]);
});

test('vercel.json da raiz acompanha o gerador nas regras determinísticas', async () => {
  const headers = await readFile(new URL('../../public/_headers', import.meta.url), 'utf8');
  const redirects = await readFile(new URL('../../public/_redirects', import.meta.url), 'utf8');
  const root = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'));
  const generated = buildVercelConfig(headers, redirects);
  for (const key of ['framework', 'outputDirectory', 'cleanUrls', 'trailingSlash', 'routes'])
    assert.deepEqual(root[key], generated[key], `${key} divergiu do gerador`);
  assert.deepEqual(root.redirects, generated.redirects);
  assert.equal(root.buildCommand, 'npm run build');
  assert.equal(root.installCommand, 'npm ci');
  const global = root.headers.find((entry) => entry.source === '/(.*)').headers;
  assert.ok(
    !global.some((entry) => entry.key === 'Content-Security-Policy'),
    'a CSP depende dos hashes do build e fica no arquivo gerado, não na raiz',
  );
});

test('valores com dois pontos e ancoras sobrevivem ao parse', () => {
  assert.deepEqual(parseHeaders('/*\n  A: https://x.org; y\n'), [
    { key: 'A', value: 'https://x.org; y' },
  ]);
  assert.deepEqual(parseRedirects('# nota\n/a /b#c 302\n/d /e\n'), [
    { source: '/a', destination: '/b#c', statusCode: 302 },
    { source: '/d', destination: '/e', statusCode: 301 },
  ]);
});
