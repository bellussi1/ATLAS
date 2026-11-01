import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const dir = 'docs/auditoria-enciclopedia';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch();
const report = {
  date: '2026-11-01',
  conditions:
    'Chromium headless local; sem throttling de CPU; fonte opcional/preload; não são dados de campo',
  samples: [],
};
for (const [device, width, height] of [
  ['desktop', 1440, 1000],
  ['mobile', 390, 844],
])
  for (const motion of ['no-preference', 'reduce']) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: motion,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      window.atlasMetrics = { lcp: 0, cls: 0, shifts: [], events: [] };
      let sum = 0,
        start = 0,
        last = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          window.atlasMetrics.shifts.push({
            value: e.value,
            recentInput: e.hadRecentInput,
            time: e.startTime,
          });
          if (e.hadRecentInput) continue;
          if (e.startTime - last > 1000 || e.startTime - start > 5000) {
            sum = 0;
            start = e.startTime;
          }
          sum += e.value;
          last = e.startTime;
          window.atlasMetrics.cls = Math.max(window.atlasMetrics.cls, sum);
        }
      }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) window.atlasMetrics.lcp = e.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries())
          if (e.interactionId) window.atlasMetrics.events.push(e.duration);
      }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
    });
    // Delay real local media on the reduced-motion pass to exercise reserved dimensions.
    if (motion === 'reduce')
      await page.route(/\.(ttf|jpg|png)(\?|$)/, async (route) => {
        await new Promise((r) => setTimeout(r, 350));
        await route.continue();
      });
    await page.goto('http://127.0.0.1:4305/marxismo/', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const initial = await page.evaluate(() => ({
      lcp: window.atlasMetrics.lcp,
      cls: window.atlasMetrics.cls,
    }));
    const term = page.locator('#conceitos .knowledge-term').first();
    await term.scrollIntoViewIfNeeded();
    const before = await term.boundingBox();
    const scrollBefore = await page.evaluate(() => scrollY);
    if (device === 'desktop') {
      await term.hover();
      if (motion === 'no-preference') await page.screenshot({ path: dir + '/termo-hover.png' });
    }
    await term.click();
    await page.getByRole('dialog').waitFor();
    if (motion === 'no-preference')
      await page.screenshot({ path: dir + '/contexto-' + device + '.png' });
    await page.keyboard.press('Escape');
    const after = await term.boundingBox();
    const scrollAfter = await page.evaluate(() => scrollY);
    await page.locator('.timeline-reading').scrollIntoViewIfNeeded();
    const timelineBefore = await page.locator('.timeline-reading').boundingBox();
    await page.locator('.timeline-event').filter({ hasText: 'Comuna de Paris' }).click();
    const timelineAfter = await page.locator('.timeline-reading').boundingBox();
    if (motion === 'no-preference')
      await page.screenshot({ path: dir + '/timeline-' + device + '-depois.png' });
    const node = page.locator('.genealogy-node').filter({ hasText: 'Rosa Luxemburgo' });
    await node.scrollIntoViewIfNeeded();
    const nodeBefore = await node.boundingBox();
    await node.hover();
    await node.click();
    const nodeAfter = await node.boundingBox();
    if (motion === 'no-preference')
      await page.screenshot({ path: dir + '/grafo-' + device + '-depois.png' });
    await page.locator('#criticas .argument-board').scrollIntoViewIfNeeded();
    const boardBefore = await page.locator('.argument-board').boundingBox();
    await page.getByRole('button', { name: 'Estado e revolução', exact: true }).click();
    const boardAfter = await page.locator('.argument-board').boundingBox();
    if (motion === 'no-preference')
      await page.screenshot({ path: dir + '/argumentos-' + device + '.png' });
    const metrics = await page.evaluate(() => window.atlasMetrics);
    report.samples.push({
      device,
      width,
      height,
      motion,
      delayedMediaMs: motion === 'reduce' ? 350 : 0,
      initial,
      cls: metrics.cls,
      sampledInpMs: Math.max(0, ...metrics.events),
      scrollDelta: scrollAfter - scrollBefore,
      triggerTopDelta: (after?.y ?? 0) - (before?.y ?? 0),
      timelineHeightDelta: (timelineAfter?.height ?? 0) - (timelineBefore?.height ?? 0),
      nodeTopDelta: (nodeAfter?.y ?? 0) - (nodeBefore?.y ?? 0),
      boardHeightDelta: (boardAfter?.height ?? 0) - (boardBefore?.height ?? 0),
      overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      errors,
      shifts: metrics.shifts,
    });
    await context.close();
  }
for (const [device, width, height] of [
  ['desktop', 1440, 1000],
  ['mobile', 390, 844],
]) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:4305/liberalismo/', { waitUntil: 'networkidle' });
  await page.locator('.entity-card').filter({ hasText: 'John Locke' }).click();
  if (await page.getByRole('dialog').count()) {
    await page.screenshot({ path: dir + '/liberalismo-' + device + '.png' });
    await page.keyboard.press('Escape');
  } else await page.screenshot({ path: dir + '/liberalismo-' + device + '.png' });
  console.log(
    'Liberalismo',
    device,
    'overflow',
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  );
  await page.close();
}
await browser.close();
await writeFile(dir + '/metrics.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.samples.map(({ shifts, ...sample }) => sample)));
