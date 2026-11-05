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

const linkedNode = '[data-node]:not([aria-label$=", 0 ligações"])';

test('hovering a node shows only its neighbours and explains what it relates to', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/rede');
  await expect(page.locator(linkedNode).first()).toBeVisible();
  const total = await page.locator('[data-node]').count();
  await page.locator(linkedNode).first().dispatchEvent('pointerenter');
  await expect(page.locator('.node.is-dimmed')).not.toHaveCount(0);
  expect(await page.locator('.node.is-dimmed').count()).toBeLessThan(total);
});

test('a selected node lists each link with its reading, nature and reason', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/rede');
  await page.locator(linkedNode).first().focus();
  await page.keyboard.press('Enter');
  const detail = page.getByRole('complementary', { name: 'Detalhes do verbete' });
  const item = detail.locator('.links li').first();
  await expect(item.locator('.links__verb')).not.toBeEmpty();
  await expect(item.locator('.nature')).not.toBeEmpty();
  await expect(item.locator('.links__why')).not.toBeEmpty();
  await expect(detail.getByText(/conex(ão|ões) no acervo/)).toBeVisible();
});

test('traces a path between two entries from the detail panel', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/rede');
  await page.locator(linkedNode).first().focus();
  await page.keyboard.press('Enter');
  const detail = page.getByRole('complementary', { name: 'Detalhes do verbete' });
  await detail.getByRole('button', { name: 'Começar caminho a partir daqui' }).click();
  await detail.locator('.links li button').first().click();
  await expect(detail.getByRole('list', { name: /Trajeto de/ })).toBeVisible();
  await detail.getByRole('button', { name: 'Limpar caminho' }).click();
  await expect(detail.getByRole('list', { name: /Trajeto de/ })).toHaveCount(0);
});

test('keeps nodes still when the reader prefers reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/rede');
  await expect(page.locator('[data-node]').first()).toBeVisible();
  const animation = await page
    .locator('.node__drift')
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toBe('none');
});

test('the overview map stays inside the window', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/rede');
  await expect(page.locator('[data-node]').first()).toBeVisible();
  const map = await page.getByRole('group', { name: /Visão geral do mapa/ }).boundingBox();
  expect(map!.x + map!.width).toBeLessThanOrEqual(1280);
  expect(map!.y + map!.height).toBeLessThanOrEqual(800);
});

test('zoomed out the links are plain lines; up close they carry their wording', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/rede');
  await expect(page.locator(linkedNode).first()).toBeVisible();
  await page.locator(linkedNode).first().dispatchEvent('pointerenter');
  await expect(page.locator('.label--edge')).toHaveCount(0);
  await page.locator(linkedNode).first().dispatchEvent('pointerleave');
  await page.locator(linkedNode).first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.label--edge').first()).toBeVisible();
});

test('mouse: the wheel zooms, dragging pans and a double click on the background zooms in', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/rede');
  await expect(page.locator('[data-node]').first()).toBeVisible();
  const zoom = page.locator('.zoom__level');
  const start = await zoom.textContent();
  await page.mouse.move(640, 420);
  await page.mouse.wheel(0, -400);
  await expect(zoom).not.toHaveText(start ?? '');
  const world = page.locator('g.world');
  const before = await world.getAttribute('transform');
  await page.mouse.move(640, 700);
  await page.mouse.down();
  await page.mouse.move(700, 660, { steps: 6 });
  await page.mouse.up();
  await expect(world).not.toHaveAttribute('transform', before ?? '');
  const level = await zoom.textContent();
  await page.mouse.dblclick(900, 720);
  await expect(zoom).not.toHaveText(level ?? '');
});

test('keyboard: search results walk with the arrows and Home reframes the map', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/rede');
  await expect(page.locator('[data-node]').first()).toBeVisible();
  const zoom = page.locator('.zoom__level');
  const start = await zoom.textContent();
  await page.keyboard.press('/');
  await page.keyboard.type('Li');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.search__results button').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Buscar por nome')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('complementary', { name: 'Detalhes do verbete' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('Home');
  await expect(zoom).toHaveText(start ?? '');
});

test('the list alternative is one link away', async ({ page }) => {
  await page.goto('/rede');
  await page.getByRole('link', { name: 'Ver como lista' }).click();
  await expect(page).toHaveURL(/\/conhecimento/);
});

test.describe('touch', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 780 } });

  test('a tap selects a node and opens its summary', async ({ page }) => {
    await page.goto('/rede');
    await expect(page.locator(linkedNode).first()).toBeVisible();
    await page.locator(linkedNode).first().dispatchEvent('click');
    await expect(
      page.getByRole('complementary', { name: 'Detalhes do verbete' }).getByRole('heading', {
        level: 2,
      }),
    ).toBeVisible();
  });
});
