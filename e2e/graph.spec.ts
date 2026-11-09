import AxeBuilder from '@axe-core/playwright';

import { expect, test } from './content-fixture';

test('the graph page fills the window without page scroll and explains its legend', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/grafos');
  await expect(page.getByRole('heading', { name: 'Grafo do acervo', level: 1 })).toBeVisible();
  await expect(page.locator('[data-node]').first()).toBeVisible();
  await expect(page.locator('.zoom__level')).toHaveText('100%');
  const metrics = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.innerHeight);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
  const legend = page.getByRole('complementary', { name: 'Legenda e filtros' });
  for (const name of [
    'Ideologias',
    'Pessoas',
    'Obras',
    'Países',
    'Formações políticas',
    'Influência',
    'Criação',
    'Conexão',
  ])
    await expect(legend.getByRole('button', { name: new RegExp(name) })).toBeVisible();
});

test('names a small, spread set of references at the global view and more up close', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/grafos');
  await expect(page.locator('.labels text.label').first()).toBeVisible();
  const measure = () =>
    page.evaluate(() => {
      const labels = [...document.querySelectorAll('.labels text.label:not(.label--edge)')];
      const boxes = labels.map((text) => {
        const rect = text.getBoundingClientRect();
        return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
      });
      let overlaps = 0;
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i];
          const b = boxes[j];
          if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top)
            overlaps += 1;
        }
      const cells = new Set(
        boxes.map(
          (box) =>
            `${Math.floor(((box.left + box.right) / 2 / innerWidth) * 4)}:${Math.floor(
              ((box.top + box.bottom) / 2 / innerHeight) * 3,
            )}`,
        ),
      );
      return { count: labels.length, overlaps, cells: cells.size };
    });
  const fit = await measure();
  expect(fit.count).toBeGreaterThan(0);
  expect(fit.count).toBeLessThanOrEqual(12);
  expect(fit.overlaps).toBe(0);
  expect(fit.cells).toBeGreaterThanOrEqual(3);
  for (let step = 0; step < 3; step++)
    await page.getByRole('button', { name: 'Aproximar', exact: true }).click();
  await expect(page.locator('.labels text.label').first()).toBeVisible();
  const zoomed = await measure();
  expect(zoomed.count).toBeGreaterThan(0);
  expect(zoomed.count).toBeLessThanOrEqual(24);
  expect(zoomed.overlaps).toBe(0);
});

test('filters, searches and opens a node with a link to its entry', async ({ page }) => {
  await page.goto('/grafos');
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
  await page.goto('/grafos');
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
  await page.goto('/grafos');
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
  await page.goto('/grafos');
  await expect(page.locator('[data-node]').first()).toBeVisible();
  await page.keyboard.press('/');
  await expect(page.getByLabel('Buscar por nome')).toBeFocused();
  await page.keyboard.press('Escape');
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
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
  await page.goto('/grafos');
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
  await page.goto('/grafos');
  await expect(page.locator('[data-node]').first()).toBeVisible();
  await page.getByRole('button', { name: 'Legenda e filtros' }).click();
  const controls = page.locator('#graph-controls');
  await expect(controls).toBeVisible();
  const card = await controls.boundingBox();
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

const linkedNode =
  '[data-node]:not([aria-label$=", 0 ligações"]):not([aria-label$=", 1 ligação"]):not([aria-label$=", 2 ligações"]):not([aria-label$=", 3 ligações"])';

test('hovering a node shows only its neighbours and explains what it relates to', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/grafos');
  await expect(page.locator(linkedNode).first()).toBeVisible();
  const total = await page.locator('[data-node]').count();
  const spot = await page.locator(linkedNode).evaluateAll((nodes) => {
    for (const el of nodes) {
      const rect = el.getBoundingClientRect();
      const x = rect.x + rect.width / 2;
      const y = rect.y + rect.height / 2;
      if (x > 400 && x < 850 && y > 250 && y < 580) return { x, y };
    }
    return null;
  });
  expect(spot).not.toBeNull();
  await page.mouse.move(spot!.x, spot!.y);
  await expect(page.locator('.nodes.is-dimmed')).toHaveCount(1);
  expect(await page.locator('.nodes--lit .node').count()).toBeGreaterThan(0);
  expect(await page.locator('.nodes--lit .node').count()).toBeLessThan(total);
});

test('a selected node lists each link with its reading, nature and reason', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/grafos');
  await page.locator(linkedNode).first().focus();
  await page.keyboard.press('Enter');
  const detail = page.getByRole('complementary', { name: 'Detalhes do verbete' });
  const item = detail.locator('.links li').first();
  await expect(item.locator('.links__row')).toBeVisible();
  await expect(item.locator('.links__verb')).not.toBeEmpty();
  await expect(item.locator('.nature')).not.toBeEmpty();
  await expect(item.locator('.links__why')).not.toBeEmpty();
  await expect(item.locator('.links__go')).toBeVisible();
  await expect(detail.getByText(/conex(ão|ões) no acervo/)).toBeVisible();
  if (await detail.locator('.detail__more').count())
    await expect(detail.locator('.detail__more summary')).toContainText('Ler resumo completo');
});

test('nodes stay still and no region colour or name covers the map', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/grafos');
  await expect(page.locator('[data-node]').first()).toBeVisible();
  await expect(page.locator('[class*="drift"]')).toHaveCount(0);
  await expect(page.locator('.region-label')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.locator('[data-node]').first()).toBeVisible();
});

test('the full-screen graph has no overview minimap', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/grafos');
  await expect(page.locator('[data-node]').first()).toBeVisible();
  await expect(page.locator('.minimap')).toHaveCount(0);
  await expect(page.getByRole('group', { name: /Visão geral do mapa/ })).toHaveCount(0);
});

test('zoomed out the links are plain lines; up close they carry their wording', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/grafos');
  await expect(page.locator(linkedNode).first()).toBeVisible();
  // Pick a linked node in the free middle, hover it, select it, and zoom around it; up close
  // its links carry their wording.
  const spot = await page.locator(linkedNode).evaluateAll((nodes) => {
    for (const el of nodes) {
      const rect = el.getBoundingClientRect();
      const x = rect.x + rect.width / 2;
      const y = rect.y + rect.height / 2;
      if (x > 400 && x < 850 && y > 250 && y < 580) return { x, y };
    }
    return null;
  });
  expect(spot).not.toBeNull();
  await page.mouse.move(spot!.x, spot!.y);
  await expect(page.locator('.label--edge')).toHaveCount(0);
  await page.mouse.click(spot!.x, spot!.y);
  await expect(page.locator('.node.is-selected')).toHaveCount(1);
  await page.mouse.move(spot!.x, spot!.y);
  await page.mouse.wheel(0, -500);
  await expect(page.locator('.zoom__level')).not.toHaveText('100%');
  await expect(page.locator('.label--edge').first()).toBeVisible();
});

test('the neighbourhood keeps one or two hops and restores the whole cut', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/grafos?no=person-karl-marx&saltos=1');
  await expect(page.locator('[data-node="person-karl-marx"]')).toBeVisible();
  const neighborhood = page.locator('#graph-neighborhood-count');
  const count = async () =>
    Number((await neighborhood.textContent())?.match(/(\d+) verbetes/)?.[1] ?? 0);
  await expect(page.getByRole('radio', { name: '1 salto' })).toBeChecked();
  const one = await count();
  expect(one).toBeGreaterThan(1);
  await page.getByRole('radio', { name: '2 saltos' }).check();
  await expect(page).toHaveURL(/saltos=2/);
  await expect.poll(count).toBeGreaterThan(one);
  const two = await count();
  await page.getByRole('radio', { name: 'Tudo' }).check();
  await expect(page).not.toHaveURL(/saltos=/);
  await expect.poll(count).toBeGreaterThan(two);
});

test('mouse: the wheel zooms, dragging pans and a double click on the background zooms in', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/grafos');
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
  const background = await page.locator('svg.canvas').evaluate((canvas) => {
    const rect = canvas.getBoundingClientRect();
    for (let y = rect.top + 40; y < rect.bottom - 40; y += 24) {
      for (let x = rect.left + 40; x < rect.right - 40; x += 24) {
        if (document.elementFromPoint(x, y) === canvas) return { x, y };
      }
    }
    throw new Error('No visible canvas background');
  });
  await page.mouse.dblclick(background.x, background.y);
  await expect(zoom).not.toHaveText(level ?? '');
});

test('keyboard: search results walk with the arrows and Home reframes the map', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/grafos');
  await expect(page.locator('[data-node]').first()).toBeVisible();
  const zoom = page.locator('.zoom__level');
  const start = await zoom.textContent();
  await page.keyboard.press('/');
  await page.keyboard.type('Li');
  await expect(page.locator('.search__results button').first()).toBeVisible();
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
  await page.goto('/grafos');
  await page.getByRole('link', { name: 'Ver como lista' }).click();
  await expect(page).toHaveURL(/\/acervo/);
});

test.describe('touch', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 780 } });

  test('a tap selects a node and opens its summary', async ({ page }) => {
    await page.goto('/grafos');
    await expect(page.locator(linkedNode).first()).toBeVisible();
    const spot = await page.locator(linkedNode).evaluateAll((nodes) => {
      for (const el of nodes) {
        const rect = el.getBoundingClientRect();
        const x = rect.x + rect.width / 2;
        const y = rect.y + rect.height / 2;
        if (x > 40 && x < 350 && y > 160 && y < 480) return { x, y };
      }
      return null;
    });
    expect(spot).not.toBeNull();
    await page.touchscreen.tap(spot!.x, spot!.y);
    await expect(
      page.getByRole('complementary', { name: 'Detalhes do verbete' }).getByRole('heading', {
        level: 2,
      }),
    ).toBeVisible();
  });
});

test('a click just beside a node icon still selects it, and names are not clickable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/grafos');
  await expect(page.locator('[data-node]').first()).toBeVisible();
  await expect(page.locator('[data-label]')).toHaveCount(0);
  // A linked node in the free middle of the stage, away from the floating panels.
  const spot = await page.locator(linkedNode).evaluateAll((nodes) => {
    for (const el of nodes) {
      const r = el.getBoundingClientRect();
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      if (cx > 450 && cx < 800 && cy > 200 && cy < 600)
        return { x: r.right + 8, y: cy, id: el.getAttribute('data-node') };
    }
    return null;
  });
  expect(spot).not.toBeNull();
  await page.mouse.click(spot!.x, spot!.y);
  await expect(page.getByRole('complementary', { name: 'Detalhes do verbete' })).toBeVisible();
});

test('node selection keeps browser history for back and forward', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/grafos');
  await expect(page.locator('[data-node="person-karl-marx"]')).toBeVisible();
  await page.locator('[data-node="person-karl-marx"]').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/no=person-karl-marx/);
  await page.locator('[data-node="person-friedrich-engels"]').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/no=person-friedrich-engels/);
  const detail = page.getByRole('complementary', { name: 'Detalhes do verbete' });
  await page.goBack();
  await expect(page).toHaveURL(/no=person-karl-marx/);
  await expect(detail.getByRole('heading', { level: 2 })).toContainText('Karl Marx');
  await page.goForward();
  await expect(page).toHaveURL(/no=person-friedrich-engels/);
  await expect(detail.getByRole('heading', { level: 2 })).toContainText('Friedrich Engels');
});

test('the period filter restores from the URL and narrows the map', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/grafos');
  await expect(page.locator('[data-node]').first()).toBeVisible();
  const before = await page.locator('[data-node]').count();
  await page.goto('/grafos?anoDe=1900&anoAte=1950');
  await expect(page.locator('[data-node]').first()).toBeVisible();
  await expect(page.getByLabel('De', { exact: true })).toHaveValue('1900');
  await expect(page.getByLabel('Até', { exact: true })).toHaveValue('1950');
  await expect(page.getByText(/\d+\s+de\s+\d+\s+verbetes têm data/)).toBeVisible();
  const after = await page.locator('[data-node]').count();
  expect(after).toBeGreaterThan(0);
  expect(after).toBeLessThan(before);
  await page.getByLabel('De', { exact: true }).fill('1800');
  await expect(page).toHaveURL(/anoDe=1800/);
  await expect(page).toHaveURL(/anoAte=1950/);
});

test('the path mode picks two nodes and clears the route', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/grafos');
  const controls = page.getByRole('complementary', { name: 'Legenda e filtros' });
  await controls.getByRole('button', { name: 'Traçar caminho' }).click();
  await expect(controls.getByRole('button', { name: 'Cancelar caminho' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator('[data-node="person-karl-marx"]').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/de=person-karl-marx/);
  await page.locator('[data-node="person-friedrich-engels"]').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/para=person-friedrich-engels/);
  const summary = page.locator('#graph-path-summary');
  await expect(summary).toContainText('Karl Marx');
  await expect(summary).toContainText('Friedrich Engels');
  await expect(summary).toContainText(/passo/);
  await controls.getByRole('button', { name: 'Limpar caminho' }).click();
  await expect(page).not.toHaveURL(/de=|para=/);
  await expect(page.locator('#graph-path-summary')).toHaveCount(0);
});

test('the scope filter hides out-of-scope records without deleting them', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/grafos');
  await expect(page.locator('[data-node]').first()).toBeVisible();
  const status = page.locator('#graph-status');
  const before = await status.textContent();
  expect(before).toMatch(/de \d+ registros/);
  const controls = page.getByRole('complementary', { name: 'Legenda e filtros' });
  const fora = controls.getByRole('checkbox', { name: /^Fora/ });
  await expect(fora).toBeChecked();
  await fora.uncheck();
  await expect(status).not.toHaveText(before!);
  await expect(fora).not.toBeChecked();
  await fora.check();
  await expect(status).toHaveText(before!);
});
