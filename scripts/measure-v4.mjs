import { chromium } from '@playwright/test';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
await mkdir('docs/auditoria-v4', { recursive: true });
const browser = await chromium.launch();
const report = {
  date: '2026-11-01',
  environment:
    'Chromium headless; localhost sem throttling; snapshots de uma execução; não são dados de campo',
  samples: [],
};
for (const [label, width, height] of [
  ['desktop', 1440, 1000],
  ['mobile', 390, 844],
]) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.v4metrics = { lcp: 0, cls: 0, interactions: [] };
    let sessionValue = 0,
      sessionStart = 0,
      lastShift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.v4metrics.lcp = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        if (!entry.hadRecentInput) {
          if (entry.startTime - lastShift > 1000 || entry.startTime - sessionStart > 5000) {
            sessionValue = 0;
            sessionStart = entry.startTime;
          }
          sessionValue += entry.value;
          lastShift = entry.startTime;
          window.v4metrics.cls = Math.max(window.v4metrics.cls, sessionValue);
        }
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        if (entry.interactionId)
          window.v4metrics.interactions.push({
            name: entry.name,
            duration: entry.duration,
            id: entry.interactionId,
          });
    }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
  });
  await page.goto('http://127.0.0.1:4305/marxismo/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const scripts = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter((e) => new URL(e.name).pathname.endsWith('.js'))
      .map((e) => new URL(e.name).pathname),
  );
  let bytes = 0,
    gzip = 0;
  for (const path of new Set(scripts)) {
    const buffer = await readFile('dist/atlas/browser' + path);
    bytes += buffer.length;
    gzip += gzipSync(buffer).length;
  }
  await page.screenshot({ path: 'docs/auditoria-v4/abertura-' + label + '.png' });
  await page
    .getByRole('navigation', { name: 'Capítulos', exact: true })
    .getByRole('link', { name: /Vozes que/ })
    .click();
  await page
    .locator('#pensadores')
    .getByRole('button', { name: /Friedrich Engels/ })
    .click();
  await page.locator('#correntes').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Lenin → Karl Kautsky' }).click();
  await page.getByText('Consultar tabela de relações e fontes', { exact: true }).click();
  await page.screenshot({ path: 'docs/auditoria-v4/correntes-' + label + '.png' });
  await page
    .getByRole('navigation', { name: 'Capítulos', exact: true })
    .getByRole('link', { name: /Uma tradição em disputa/ })
    .click();
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: 'docs/auditoria-v4/marxismo-' + label + '.png', fullPage: true });
  const metrics = await page.evaluate(() => window.v4metrics);
  report.samples.push({
    label,
    width,
    height,
    ...metrics,
    sampledInpMs: Math.max(0, ...metrics.interactions.map((i) => i.duration)),
    initialJsRawBytes: bytes,
    initialJsGzipBytes: gzip,
    initialScriptCount: new Set(scripts).size,
    errors,
  });
  await page.goto('http://127.0.0.1:4305/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'docs/auditoria-v4/hub-' + label + '.png', fullPage: true });
  await page.setViewportSize({ width: 568, height: 320 });
  await page.waitForTimeout(200);
  console.log(
    label,
    'landscape overflow',
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  );
  await page.close();
}
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://127.0.0.1:4305/marxismo/', { waitUntil: 'networkidle' });
await page.addStyleTag({ content: 'html { font-size:200% !important; }' });
await page.waitForTimeout(200);
console.log(
  '200% overflow',
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
);
await page.screenshot({ path: 'docs/auditoria-v4/marxismo-texto-200.png', fullPage: true });
await browser.close();
await writeFile('docs/auditoria-v4/metrics.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
