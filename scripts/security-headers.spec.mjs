import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const headers = await readFile(new URL('../public/_headers', import.meta.url), 'utf8');
const header = (name) =>
  headers
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.toLowerCase().startsWith(`${name.toLowerCase()}:`))
    ?.slice(name.length + 1)
    .trim();

test('cabeçalhos de segurança obrigatórios estão presentes', () => {
  assert.match(header('Strict-Transport-Security') ?? '', /max-age=\d{7,}/);
  assert.equal(header('X-Content-Type-Options'), 'nosniff');
  assert.equal(header('X-Frame-Options'), 'DENY');
  assert.ok(header('Referrer-Policy'));
  assert.ok(header('Permissions-Policy'));
});

test('CSP mantém as diretivas restritivas', () => {
  const csp = header('Content-Security-Policy') ?? '';
  for (const directive of [
    "default-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ])
    assert.ok(csp.includes(directive), `CSP sem ${directive}`);
  assert.match(csp, /script-src 'self'(;| )/);
  assert.ok(!/script-src[^;]*'unsafe-inline'/.test(csp), "script-src não pode ter 'unsafe-inline'");
  assert.ok(!/script-src[^;]*'unsafe-eval'/.test(csp), "script-src não pode ter 'unsafe-eval'");
});

test('a página 404 estática existe e não é indexável', async () => {
  const html = await readFile(new URL('../public/404.html', import.meta.url), 'utf8');
  assert.match(html, /<meta name="robots" content="noindex"/);
  assert.match(html, /Página não encontrada/);
});

test('o site é indexável por buscadores e por rastreadores de modelos', async () => {
  assert.ok(!/noindex/i.test(headers), 'X-Robots-Tag noindex não pode voltar ao _headers');
  const robots = await readFile(new URL('../public/robots.txt', import.meta.url), 'utf8');
  assert.ok(!/^Disallow:\s*\/\s*$/m.test(robots), 'robots.txt não pode bloquear o site inteiro');
  const index = await readFile(new URL('../src/index.html', import.meta.url), 'utf8');
  assert.ok(!/content="[^"]*noindex/i.test(index), 'index.html não pode ter noindex');
  assert.ok(!/rel="canonical"/.test(index), 'canonical é gerado por página em scripts/seo.mjs');
});
