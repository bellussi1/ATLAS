import { readFile } from 'node:fs/promises';

import AxeBuilder from '@axe-core/playwright';

import { DEFAULT_CONTENT_BASE_URL } from '../src/app/core/content/models/content-pointer';
import { expect, test } from './content-fixture';

const base = DEFAULT_CONTENT_BASE_URL;

async function loadManifest() {
  const pointer = JSON.parse(await readFile('generated/content-cache/pointer.json', 'utf8'));
  return JSON.parse(
    await readFile(`generated/content-cache/c/${pointer.manifest.sha256}.json`, 'utf8'),
  );
}

test('home loads no graph; SPA navigation uses hashed assets once across both readings', async ({
  page,
}) => {
  const resources: string[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith(base)) resources.push(new URL(request.url()).pathname);
  });
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  expect(resources).toEqual([]);
  await page.locator('.site-header').getByRole('button', { name: 'Leituras' }).click();
  await page
    .locator('.site-header')
    .getByRole('link', { name: /Marxismo/ })
    .click();
  await expect(page.locator('h1')).toHaveText('Marxismo');
  const compiled = resources.filter((path) => /^\/c\/[a-f0-9]{64}\.json$/.test(path));
  const manifest = await loadManifest();
  expect(compiled).toHaveLength(manifest.collections.length + manifest.ideologies.length + 4);
  expect(new Set(compiled).size).toBe(compiled.length);
  expect(compiled).toContain(`/c/${manifest.adjacency.sha256}.json`);
  await page.locator('.site-header').getByRole('button', { name: 'Leituras' }).click();
  await page
    .locator('.site-header')
    .getByRole('link', { name: /Liberalismo/ })
    .click();
  await expect(page.locator('h1')).toHaveText('Liberalismo');
  expect(resources.filter((path) => /^\/c\/[a-f0-9]{64}\.json$/.test(path))).toEqual(compiled);
});

test('the graph loads collections and layouts without the search and adjacency indexes', async ({
  page,
}) => {
  const resources: string[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith(base)) resources.push(new URL(request.url()).pathname);
  });
  await page.goto('/grafos');
  await expect(page.locator('svg.canvas')).toBeVisible();
  const manifest = await loadManifest();
  const compiled = resources.filter((path) => /^\/c\/[a-f0-9]{64}\.json$/.test(path));
  expect(compiled).toContain(`/c/${manifest.layouts.sha256}.json`);
  expect(compiled).not.toContain(`/c/${manifest.search.sha256}.json`);
  expect(compiled).not.toContain(`/c/${manifest.adjacency.sha256}.json`);
  expect(
    compiled.every(
      (path) =>
        path === `/c/${manifest.layouts.sha256}.json` ||
        manifest.collections.some((entry) => path === `/c/${entry.sha256}.json`),
    ),
  ).toBe(true);
  // Small collections hydrate from the server TransferState; the large ones come from R2.
  expect(
    compiled.some((path) =>
      manifest.collections.some((entry) => path === `/c/${entry.sha256}.json`),
    ),
  ).toBe(true);
});

test('SSR hydrates through the pinned release without duplicate HTTP', async ({ page }) => {
  const resources: string[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith(base)) resources.push(request.url());
  });
  await page.goto('/leitura/liberalismo/');
  await expect(page.getByRole('navigation', { name: 'Capítulos' })).toBeVisible();
  await page
    .getByRole('button', { name: /^John Locke: abrir contexto de / })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toContainText('John Locke');
  expect(new Set(resources).size).toBe(resources.length);
  expect(resources.some((url) => url.endsWith('/pointer.json'))).toBe(false);
});

test('a failed content asset preserves the current page and offers a working retry', async ({
  page,
}) => {
  await page.goto('/');
  await page.route(`${base}/pointer.json`, (route) => route.abort());
  await page.locator('.site-header').getByRole('button', { name: 'Leituras' }).click();
  await page
    .locator('.site-header')
    .getByRole('link', { name: /Liberalismo/ })
    .click();
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar a leitura');
  await expect(page.locator('h1')).toContainText('Tudo');
  const audit = await new AxeBuilder({ page }).include('.atlas-notice').analyze();
  expect(
    audit.violations.filter((violation) =>
      ['critical', 'serious'].includes(violation.impact ?? ''),
    ),
  ).toEqual([]);
  await page.unroute(`${base}/pointer.json`);
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.locator('h1')).toHaveText('Liberalismo');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('#conteudo')).toBeFocused();
});
