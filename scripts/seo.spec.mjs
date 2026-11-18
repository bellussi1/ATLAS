import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { applySeo } from './seo.mjs';

test('applySeo emits Open Graph/Twitter cards, excludes /index.csr and unlisted previews, and marks previews noindex', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'atlas-seo-test-'));
  try {
    const html = (extra = '') =>
      `<!doctype html><html lang="pt-BR"><head><title>ATLAS</title>${extra}</head><body></body></html>`;
    const writePage = async (rel, content = html()) => {
      const target = join(dir, rel);
      await mkdir(join(target, '..'), { recursive: true });
      await writeFile(target, content);
    };

    await writePage('index.html', html('<meta name="robots" content="index, follow">'));
    await writePage('index.csr.html');
    await writePage('404.html');
    await writePage('marxismo/index.html');
    await writePage('nazismo/index.html');
    await writePage('stalinismo/index.html');
    await writePage('trabalhismo/index.html');
    await writePage('mapa-mundi/index.html');
    await writePage('leitura/marxismo/index.html');
    await writePage(
      'leitura/stalinismo/index.html',
      html('<meta name="robots" content="index, follow">'),
    );
    await writePage('verbete/karl-marx/index.html');
    await writePage('mapa/index.html');
    await writeFile(join(dir, 'robots.txt'), 'User-agent: *\nAllow: /\n');
    await writeFile(join(dir, 'llms.txt'), '- [Mapa](/mapa/)\n');

    const result = await applySeo({ rootDir: dir });
    assert.deepEqual(result.pages, [
      'https://atlas-bellussi.pages.dev/',
      'https://atlas-bellussi.pages.dev/leitura/marxismo/',
      'https://atlas-bellussi.pages.dev/mapa/',
      'https://atlas-bellussi.pages.dev/verbete/karl-marx/',
    ]);

    const sitemap = await readFile(join(dir, 'sitemap.xml'), 'utf8');
    assert.ok(!sitemap.includes('index.csr'));
    assert.ok(!sitemap.includes('/404'));
    assert.ok(!sitemap.includes('/leitura/stalinismo'));
    assert.ok(!sitemap.includes('pages.dev/marxismo/'));
    assert.ok(!sitemap.includes('pages.dev/nazismo/'));
    assert.ok(!sitemap.includes('pages.dev/stalinismo/'));
    assert.ok(!sitemap.includes('pages.dev/trabalhismo/'));
    assert.ok(!sitemap.includes('pages.dev/mapa-mundi/'));
    assert.ok(sitemap.includes('https://atlas-bellussi.pages.dev/mapa/'));

    const preview = await readFile(join(dir, 'leitura/stalinismo/index.html'), 'utf8');
    assert.match(preview, /<meta name="robots" content="noindex, follow">/);
    assert.ok(!preview.includes('rel="canonical"'));
    assert.match(preview, /<meta property="og:type" content="article">/);

    const marxEntry = await readFile(join(dir, 'verbete/karl-marx/index.html'), 'utf8');
    assert.match(marxEntry, /<meta property="og:type" content="article">/);
    assert.match(marxEntry, /<meta name="twitter:card" content="summary_large_image">/);
    assert.match(
      marxEntry,
      /<meta property="og:image" content="https:\/\/[^"]+\.(jpg|png|webp)(\?[^"]*)?"/,
    );
    assert.ok(!marxEntry.includes('atlas-mark.svg'));

    const marxReading = await readFile(join(dir, 'leitura/marxismo/index.html'), 'utf8');
    assert.match(marxReading, /<meta property="og:type" content="article">/);
    assert.match(
      marxReading,
      /<meta name="twitter:image" content="https:\/\/[^"]+\.(jpg|png|webp)(\?[^"]*)?"/,
    );

    const home = await readFile(join(dir, 'index.html'), 'utf8');
    assert.match(home, /<meta property="og:type" content="website">/);
    assert.match(
      home,
      /<meta property="og:image" content="https:\/\/atlas-bellussi\.pages\.dev\/brand\/atlas-logo\.png">/,
    );
    assert.match(home, /<meta name="twitter:card" content="summary_large_image">/);

    const map = await readFile(join(dir, 'mapa/index.html'), 'utf8');
    assert.match(map, /<meta property="og:type" content="website">/);
    assert.match(map, /<link rel="canonical" href="https:\/\/atlas-bellussi\.pages\.dev\/mapa\/">/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('public _redirects pairs every rule with and without trailing slash including previews (#76)', async () => {
  const raw = await readFile(new URL('../public/_redirects', import.meta.url), 'utf8');
  const rules = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(/\s+/));
  const bySource = new Map(rules.map(([from, to, status]) => [from, `${to} ${status}`]));
  for (const [from, to, status] of rules) {
    if (from.endsWith('/')) {
      const bare = from.slice(0, -1);
      assert.equal(bySource.get(bare), `${to} ${status}`, `Falta regra sem barra para ${from}`);
    } else {
      assert.equal(
        bySource.get(`${from}/`),
        `${to} ${status}`,
        `Falta regra com barra para ${from}`,
      );
    }
  }
  for (const required of [
    '/marxismo/',
    '/pessoas/',
    '/nazismo/',
    '/stalinismo/',
    '/trabalhismo/',
    '/mapa-mundi/',
  ]) {
    assert.ok(bySource.has(required), `Regra obrigatória ausente: ${required}`);
  }
});
