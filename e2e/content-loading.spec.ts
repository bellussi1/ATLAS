import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('home loads no graph; SPA navigation uses hashed assets once across both readings', async ({
  page,
}) => {
  const resources: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/content/')) resources.push(new URL(request.url()).pathname);
  });
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  expect(resources).toEqual([]);
  await page
    .locator('.site-header')
    .getByRole('link', { name: /Marxismo/ })
    .click();
  await expect(page.locator('h1')).toHaveText('Marxismo.');
  const compiled = resources.filter((path) => /^\/content\/[^/]+\.json$/.test(path));
  const manifest = await (await page.request.get('/content/manifest.json')).json();
  expect(compiled).toHaveLength(manifest.collections.length + 4);
  expect(new Set(compiled).size).toBe(compiled.length);
  expect(compiled.filter((path) => path.includes('/atlas-'))).toHaveLength(
    manifest.collections.length,
  );
  expect(compiled.some((path) => /\/adjacency\.[a-f0-9]{64}\.json$/.test(path))).toBe(true);
  expect(resources).not.toContain('/content/atlas.json');
  await page
    .locator('.site-header')
    .getByRole('link', { name: /Liberalismo/ })
    .click();
  await expect(page.locator('h1')).toHaveText('Liberalismo.');
  expect(resources.filter((path) => /^\/content\/[^/]+\.json$/.test(path))).toEqual(compiled);
});

test('SSR transfers all compiled data needed for hydration without duplicate HTTP', async ({
  page,
}) => {
  const resources: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/content/')) resources.push(request.url());
  });
  await page.goto('/liberalismo/');
  await expect(page.getByLabel('Buscar neste atlas', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'John Locke: abrir contexto de Pensador', exact: true })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toContainText('John Locke');
  expect(resources).toEqual([]);
});

test('a failed content asset preserves the current page and offers a working retry', async ({
  page,
}) => {
  await page.goto('/');
  await page.route('**/content/manifest.json', (route) => route.abort());
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
  await page.unroute('**/content/manifest.json');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.locator('h1')).toHaveText('Liberalismo.');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('#conteudo')).toBeFocused();
});
