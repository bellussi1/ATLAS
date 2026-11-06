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
    source: '/ideologias/marxismo',
    destination: '/marxismo',
    statusCode: 301,
  });
  assert.equal(config.cleanUrls, true);
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
