#!/usr/bin/env node
// Performance report for the built site: initial bundle, largest chunk, release size and, with
// Playwright, LCP/CLS per route. Needs `npm run build` first.
//   npm run perf                       static sizes + runtime for the four main routes
//   npm run perf -- --static           sizes only
//   npm run perf -- --out report.json  also writes the JSON report
import { spawn } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync } from 'node:zlib';

const root = fileURLToPath(new URL('../../', import.meta.url));
const browserDir = join(root, 'dist/atlas/browser');
const args = process.argv.slice(2);
const staticOnly = args.includes('--static');
const outIndex = args.indexOf('--out');
const routes = ['/', '/leitura/marxismo', '/mapa', '/grafos'];
const runs = 3;

const kib = (bytes) => Math.round((bytes / 1024) * 10) / 10;
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

async function sizes(path) {
  const body = await readFile(path);
  return {
    raw: body.byteLength,
    gzip: gzipSync(body).byteLength,
    brotli: brotliCompressSync(body).byteLength,
  };
}

/** Files named by the home page's scripts, stylesheets and modulepreloads are the initial load. */
export function initialFiles(html) {
  const names = new Set();
  for (const match of html.matchAll(/(?:src|href)="\/?((?:[\w-]+)\.(?:js|css))"/g))
    names.add(match[1]);
  return [...names];
}

async function staticReport() {
  const html = await readFile(join(browserDir, 'index.html'), 'utf8');
  const initial = initialFiles(html);
  const total = { raw: 0, gzip: 0, brotli: 0 };
  const initialJs = { raw: 0, gzip: 0, brotli: 0 };
  for (const name of initial) {
    const size = await sizes(join(browserDir, name));
    for (const key of Object.keys(total)) {
      total[key] += size[key];
      if (name.endsWith('.js')) initialJs[key] += size[key];
    }
  }
  const files = (await readdir(browserDir)).filter((name) => name.endsWith('.js'));
  const chunks = [];
  for (const name of files) chunks.push({ name, ...(await sizes(join(browserDir, name))) });
  chunks.sort((a, b) => b.raw - a.raw);
  const pointer = JSON.parse(await readFile(join(root, 'content/content-pointer.json'), 'utf8'));
  const releaseBytes =
    pointer.manifest.bytes + pointer.artifacts.reduce((sum, artifact) => sum + artifact.bytes, 0);
  return {
    initialFiles: initial.length,
    initialKiB: { raw: kib(total.raw), gzip: kib(total.gzip), brotli: kib(total.brotli) },
    initialJsKiB: {
      raw: kib(initialJs.raw),
      gzip: kib(initialJs.gzip),
      brotli: kib(initialJs.brotli),
    },
    jsChunks: chunks.length,
    largestChunks: chunks.slice(0, 5).map((chunk) => ({
      name: chunk.name,
      rawKiB: kib(chunk.raw),
      brotliKiB: kib(chunk.brotli),
    })),
    releaseMiB: Math.round((releaseBytes / 1024 / 1024) * 10) / 10,
    bundleMiB: Math.round((pointer.bundle.bytes / 1024 / 1024) * 10) / 10,
    networkBundleMiB: Math.round((pointer.networkBundle.bytes / 1024 / 1024) * 10) / 10,
    mirror: Boolean(pointer.mirror),
  };
}

async function runtimeReport() {
  const { chromium } = await import('@playwright/test');
  const port = 4399;
  const server = spawn(process.execPath, ['scripts/preview.mjs'], {
    cwd: root,
    env: { ...process.env, ATLAS_PREVIEW_PORT: String(port) },
    stdio: 'ignore',
  });
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (
      await fetch(base).then(
        (r) => r.ok,
        () => false,
      )
    )
      break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const browser = await chromium.launch();
  const report = {};
  try {
    for (const route of routes) {
      const lcp = [];
      const cls = [];
      const transfer = [];
      for (let run = 0; run < runs; run++) {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await context.newPage();
        await page.addInitScript(() => {
          window.__vitals = { lcp: 0, cls: 0 };
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) window.__vitals.lcp = entry.startTime;
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries())
              if (!entry.hadRecentInput) window.__vitals.cls += entry.value;
          }).observe({ type: 'layout-shift', buffered: true });
        });
        await page.goto(`${base}${route}`, { waitUntil: 'load' });
        await page.waitForLoadState('networkidle').catch(() => undefined);
        await page.waitForTimeout(1500);
        const vitals = await page.evaluate(() => ({
          ...window.__vitals,
          bytes: performance
            .getEntriesByType('resource')
            .reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
        }));
        lcp.push(vitals.lcp);
        cls.push(vitals.cls);
        transfer.push(vitals.bytes);
        await context.close();
      }
      report[route] = {
        lcpMs: Math.round(median(lcp)),
        cls: Math.round(median(cls) * 1000) / 1000,
        transferKiB: kib(median(transfer)),
      };
    }
  } finally {
    await browser.close();
    server.kill();
  }
  return report;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  const report = { static: await staticReport() };
  if (!staticOnly) report.runtime = await runtimeReport();
  const text = `${JSON.stringify(report, null, 2)}\n`;
  console.log(text);
  if (outIndex >= 0) await writeFile(args[outIndex + 1], text);
}
