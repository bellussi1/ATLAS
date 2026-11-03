import AxeBuilder from '@axe-core/playwright';
import { type APIRequestContext, expect, test } from '@playwright/test';

import { DEFAULT_CONTENT_BASE_URL } from '../src/app/core/content/models/content-pointer';

const base = DEFAULT_CONTENT_BASE_URL;

async function loadManifest(request: APIRequestContext) {
  const pointer = await (await request.get(`${base}/pointer.json`)).json();
  return (await (await request.get(`${base}/c/${pointer.manifest.sha256}.json`)).json()) as {
    collections: unknown[];
    adjacency: { sha256: string };
  };
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
  await page
    .locator('.site-header')
    .getByRole('link', { name: /Marxismo/ })
    .click();
  await expect(page.locator('h1')).toHaveText('Marxismo');
  const compiled = resources.filter((path) => /^\/c\/[a-f0-9]{64}\.json$/.test(path));
  const manifest = await loadManifest(page.request);
  expect(compiled).toHaveLength(manifest.collections.length + 4);
  expect(new Set(compiled).size).toBe(compiled.length);
  expect(compiled).toContain(`/c/${manifest.adjacency.sha256}.json`);
  await page
    .locator('.site-header')
    .getByRole('link', { name: /Liberalismo/ })
    .click();
  await expect(page.locator('h1')).toHaveText('Liberalismo');
  expect(resources.filter((path) => /^\/c\/[a-f0-9]{64}\.json$/.test(path))).toEqual(compiled);
});

test('SSR transfers all compiled data needed for hydration without duplicate HTTP', async ({
  page,
}) => {
  const resources: string[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith(base)) resources.push(request.url());
  });
  await page.goto('/liberalismo/');
  await expect(page.getByRole('navigation', { name: 'Capítulos' })).toBeVisible();
  await page
    .getByRole('button', { name: /^John Locke: abrir contexto de / })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toContainText('John Locke');
  expect(resources).toEqual([]);
});

test('a failed content asset preserves the current page and offers a working retry', async ({
  page,
}) => {
  await page.goto('/');
  await page.route(`${base}/pointer.json`, (route) => route.abort());
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
