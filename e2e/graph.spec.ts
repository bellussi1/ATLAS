import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('the graph page fills the window without page scroll and explains its legend', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/grafo');
  await expect(page.getByRole('heading', { name: 'Grafo do acervo', level: 1 })).toBeVisible();
  await expect(page.locator('[data-node]').first()).toBeVisible();
  const metrics = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.innerHeight);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
  const legend = page.getByRole('complementary', { name: 'Legenda e filtros' });
  for (const name of ['Ideologias', 'Pessoas', 'Obras', 'Influenciou', 'Escreveu', 'Associado a'])
    await expect(legend.getByRole('button', { name: new RegExp(name) })).toBeVisible();
});

test('filters, searches and opens a node with a link to its entry', async ({ page }) => {
  await page.goto('/grafo');
  const legend = page.getByRole('complementary', { name: 'Legenda e filtros' });
  await expect(page.locator('[data-node]').first()).toBeVisible();
  const people = legend.getByRole('button', { name: /Pessoas/ });
  const before = await page.locator('[data-node]').count();
  await people.click();
  await expect(people).toHaveAttribute('aria-pressed', 'false');
  expect(await page.locator('[data-node]').count()).toBeLessThan(before);
  await legend.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page.locator('[data-node]')).toHaveCount(before);

  await page.getByLabel('Buscar por nome').fill('Liberalismo');
  await page.getByLabel('Buscar por nome').press('Enter');
  const detail = page.getByRole('complementary', { name: 'Detalhes do verbete' });
  await expect(detail.getByRole('heading', { level: 2 })).toContainText('Liberalismo');
  await detail.getByRole('link', { name: /Abrir o verbete/ }).click();
  await expect(page).toHaveURL(/\/verbete\//);
});

test('works from the keyboard and has no detectable accessibility violations', async ({ page }) => {
  await page.goto('/grafo');
  await expect(page.locator('[data-node]').first()).toBeVisible();
  await page.locator('[data-node]').first().focus();
  await page.keyboard.press('Enter');
  const detail = page.getByRole('complementary', { name: 'Detalhes do verbete' });
  await expect(detail.getByRole('link', { name: /Abrir o verbete/ })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('on a phone the legend opens as a drawer and the page still does not scroll', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto('/grafo');
  await expect(page.locator('[data-node]').first()).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight,
  );
  expect(overflow).toBe(false);
  const toggle = page.getByRole('button', { name: 'Legenda e filtros' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: /Ideologias/ })).toBeVisible();
});
