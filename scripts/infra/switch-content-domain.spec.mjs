import assert from 'node:assert/strict';
import test from 'node:test';
import { currentOrigin, swapOrigin } from './switch-content-domain.mjs';

test('troca todas as ocorrências da origem antiga', () => {
  const csp = "img-src https://a.r2.dev; connect-src 'self' https://a.r2.dev";
  assert.equal(
    swapOrigin(csp, 'https://a.r2.dev', 'https://cdn.x.org'),
    "img-src https://cdn.x.org; connect-src 'self' https://cdn.x.org",
  );
});

test('lê a origem atual da constante do app', () => {
  assert.equal(
    currentOrigin("export const DEFAULT_CONTENT_BASE_URL = 'https://a.r2.dev';"),
    'https://a.r2.dev',
  );
  assert.throws(() => currentOrigin('nada'));
});
