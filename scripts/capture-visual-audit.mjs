import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

await mkdir('docs/auditoria-visual', { recursive: true });
const browser = await chromium.launch();
const suffix = process.argv.includes('--after') ? '-depois' : '';
const pages = process.argv.includes('--atlas-refactor')
  ? [
      ['atlas-indice-refactor', '/atlas/marxismo/'],
      ['atlas-debate-refactor', '/atlas/marxismo/valor-e-trabalho/'],
      ['relacoes-refactor', '/relacoes/'],
      ['home-refactor', '/'],
    ]
  : [
      ['home', '/'],
      ['estudo', '/estudar/'],
      ['tempo', '/tempo-e-espaco/'],
      ['verbete', '/verbete/igualdade-perante-a-lei/'],
      ['marx', '/atlas/marxismo/'],
    ];
for (const [name, path] of pages.filter(
  ([name]) => !process.argv.includes('--marx-only') || name === 'marx',
)) {
  for (const [size, width, height] of [
    ['desktop', 1440, 900],
    ['mobile', 390, 844],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    await page.goto(`http://127.0.0.1:4305${path}`, { waitUntil: 'networkidle' });
    // Load lazy footer assets before taking a full-page capture.
    await page.locator('footer').last().scrollIntoViewIfNeeded();
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `docs/auditoria-visual/${name}-${size}${suffix}.png`,
      fullPage: true,
    });
    await page.close();
  }
}
await browser.close();
