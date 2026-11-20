#!/usr/bin/env node
/**
 * Captura as telas usadas nos carrosséis novos a partir da produção.
 *
 *   node docs/social/linkedin/capture-assets.mjs
 *
 * Não altera o site. Só grava JPEGs em `assets/` (pasta local ignorada pelo Git).
 */
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(here, 'assets');
const BASE = 'https://atlas-bellussi.pages.dev';

const SHOTS = [
  { file: 'mapa-1930.jpg', url: `${BASE}/mapa/?ano=1930`, wait: 3500 },
  { file: 'mapa-recorte.jpg', url: `${BASE}/mapa/?anoDe=1914&anoAte=1945`, wait: 3500 },
  { file: 'grafo-lacunas.jpg', url: `${BASE}/grafos/`, wait: 3500 },
  { file: 'leituras-atual.jpg', url: `${BASE}/leituras/`, wait: 1500 },
];

async function launchBrowser() {
  for (const opts of [
    { channel: 'chrome', headless: true },
    { channel: 'msedge', headless: true },
    { headless: true },
  ]) {
    try {
      return await chromium.launch(opts);
    } catch {}
  }
  throw new Error('Nenhum navegador Chrome, Edge ou Chromium disponível para Playwright.');
}

await mkdir(assetsDir, { recursive: true });
const browser = await launchBrowser();
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1600 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  for (const shot of SHOTS) {
    console.log(`[capture] ${shot.url}`);
    await page.goto(shot.url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(shot.wait);
    await page.screenshot({
      path: join(assetsDir, shot.file),
      type: 'jpeg',
      quality: 88,
      fullPage: false,
    });
    console.log(`  -> assets/${shot.file}`);
  }
} finally {
  await browser.close();
}
