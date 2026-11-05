import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('the graph page fills the window without page scroll and explains its legend', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/rede');
  await expect(page.getByRole('heading', { name: 'Rede do acervo', level: 1 })).toBeVisible();
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
  await page.goto('/rede');
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
  await page.goto('/rede');
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
  await page.goto('/rede');
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

test('keyboard and mouse shortcuts: search, legend, zoom, shortcuts list and double click', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/rede');
  await expect(page.locator('[data-node]').first()).toBeVisible();
  await page.keyboard.press('/');
  await expect(page.getByLabel('Buscar por nome')).toBeFocused();
  await page.keyboard.press('Escape');
  await page.locator('body').click({ position: { x: 700, y: 400 } });
  const zoom = page.locator('.zoom__level');
  const before = await zoom.textContent();
  await page.keyboard.press('+');
  await expect(zoom).not.toHaveText(before ?? '');
  await page.keyboard.press('0');
  await expect(zoom).toHaveText(before ?? '');
  const toggle = page.getByRole('button', { name: 'Legenda e filtros' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('l');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('l');
  await page.keyboard.press('?');
  await expect(page.getByRole('region', { name: 'Atalhos' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: 'Atalhos' })).toHaveCount(0);
  await page.locator('[data-node]').first().focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('o');
  await expect(page).toHaveURL(/\/verbete\//);
});

test('floating panels keep a gap from the window edge', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/rede');
  await expect(page.locator('[data-node]').first()).toBeVisible();
  const box = await page.locator('#graph-controls').boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(8);
  expect(box!.y).toBeGreaterThanOrEqual(8);
  await page.locator('[data-node]').first().focus();
  await page.keyboard.press('Enter');
  const detail = await page
    .getByRole('complementary', { name: 'Detalhes do verbete' })
    .boundingBox();
  expect(1280 - (detail!.x + detail!.width)).toBeGreaterThanOrEqual(8);
});

test('on a phone the cards float above the map with a gap, and pinch zooms', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto('/rede');
  await expect(page.locator('[data-node]').first()).toBeVisible();
  await page.getByRole('button', { name: 'Legenda e filtros' }).click();
  const card = await page.locator('#graph-controls').boundingBox();
  expect(card!.x).toBeGreaterThanOrEqual(8);
  expect(card!.x + card!.width).toBeLessThanOrEqual(390 - 8);
  await page.getByRole('button', { name: 'Legenda e filtros' }).click();
  const before = await page.locator('.zoom__level').textContent();
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: string, points: { x: number; y: number }[]) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  await touch('touchStart', [
    { x: 150, y: 400 },
    { x: 240, y: 400 },
  ]);
  await touch('touchMove', [
    { x: 100, y: 400 },
    { x: 290, y: 400 },
  ]);
  await touch('touchEnd', []);
  await expect(page.locator('.zoom__level')).not.toHaveText(before ?? '');
});
