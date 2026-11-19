import { expect, test } from './content-fixture';

test('renders fullscreen 3D globe without shell header/footer, zero external tiles, and no overflow from 1440px down to 320px', async ({
  page,
}) => {
  const externalMapRequests: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  await page.route(
    (url) =>
      url.hostname === 'cloudflareinsights.com' ||
      url.hostname.endsWith('.cloudflareinsights.com') ||
      url.hostname === 'gc.zgo.at' ||
      url.hostname.endsWith('.gc.zgo.at'),
    (route) => route.fulfill({ status: 204, body: '' }),
  );
  page.on('request', (req) => {
    const url = req.url();
    if (/tile\.|openstreetmap|mapbox|arcgis|leaflet|carto|wikimedia\.org.*tile/i.test(url)) {
      externalMapRequests.push(url);
    }
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/mapa');

  await expect(page.locator('app-site-header')).toHaveCount(0);
  await expect(page.locator('app-site-footer')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Mapa-múndi/i, level: 1 })).toBeVisible();

  const canvas = page.locator('canvas.globe-canvas');
  await expect(canvas).toBeVisible();

  const renderCheck = await page.evaluate(() => {
    const el = document.querySelector<HTMLCanvasElement>('canvas.globe-canvas');
    if (!el || el.width === 0 || el.height === 0) return { ok: false, nonZeroPixels: 0 };
    const ctx = el.getContext('2d');
    if (!ctx) return { ok: false, nonZeroPixels: 0 };
    const cx = Math.floor(el.width / 2);
    const cy = Math.floor(el.height / 2);
    const sample = ctx.getImageData(Math.max(0, cx - 80), Math.max(0, cy - 80), 160, 160).data;
    let nonZero = 0;
    for (let i = 3; i < sample.length; i += 4) {
      if (sample[i] > 0) nonZero += 1;
    }
    return {
      ok: true,
      nonZeroPixels: nonZero,
      scrollOk: document.documentElement.scrollWidth <= innerWidth,
      fitsViewport: Math.abs(document.documentElement.scrollHeight - innerHeight) <= 2,
    };
  });

  expect(renderCheck.ok).toBe(true);
  expect(renderCheck.nonZeroPixels).toBeGreaterThan(1000);
  expect(renderCheck.scrollOk).toBe(true);
  expect(renderCheck.fitsViewport).toBe(true);
  await expect(page.locator('footer.map-attribution')).toContainText('Natural Earth');
  await expect(page.locator('footer.map-attribution')).toContainText('Wikidata');

  // Rotate the 3D globe via pointer drag and verify canvas pixels respond.
  const beforeDataUrl = await canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL());
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.52, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(80);
  const afterDataUrl = await canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL());
  expect(afterDataUrl).not.toBe(beforeDataUrl);

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 740 });
    await expect(page.getByRole('heading', { name: /Mapa-múndi/i, level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }

  expect(externalMapRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('shows 7 legend relation families with dash patterns, hover highlight, interactive hotpoints, scrubber, and undated disclosure', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/mapa');

  const legend = page.locator('#map-legend');
  const legendItems = legend.locator('.legend--families .legend-item');
  await expect(legendItems).toHaveCount(7);
  expect(await legend.locator('line[stroke-dasharray]').count()).toBeGreaterThanOrEqual(5);

  const firstRow = legend.locator('.legend-row').first();
  await firstRow.hover();
  await expect(firstRow).toHaveClass(/is-hovered/);

  // Click a historical hotpoint on the bottom timeline dock.
  const hotpoints = page.locator('.timeline-hotpoint');
  expect(await hotpoints.count()).toBeGreaterThanOrEqual(4);
  await hotpoints.first().click();
  await expect(hotpoints.first()).toHaveClass(/is-active/);
  await expect(page.locator('#map-study-desk .desk-actions a[href^="/verbete/"]')).toBeVisible();
  await expect(page.locator('.timeline-readout')).not.toContainText('Todo o acervo');

  // Scrub end range input and check era preset 1914-1945 disclosure.
  await page.getByRole('button', { name: '1914–1945' }).click();
  await expect(page.locator('.map-border-notice')).toContainText(
    'contornos contemporâneos de referência',
  );
  await expect(page.locator('.timeline-undated__count')).toContainText(
    'sem datação estrita estão ocultos',
  );

  const includeUndatedCheckbox = page.getByRole('checkbox', {
    name: /Incluir registros sem datação estrita/i,
  });
  await includeUndatedCheckbox.check();
  await expect(includeUndatedCheckbox).toBeChecked();
  await expect(page.locator('.timeline-undated__count')).toHaveCount(0);

  const fromRange = page.locator('#timeline-from');
  await fromRange.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.timeline-readout')).not.toContainText('Todo o acervo');
});

test('surprise button selects a territory and places non-overlapping labels away from floating cards', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/mapa');

  await page.getByRole('button', { name: /Surpreenda-me/i }).click();
  const desk = page.locator('#map-study-desk');
  await expect(desk.getByRole('link', { name: /Abrir verbete/i })).toBeVisible();

  const layoutCheck = await page.evaluate(() => {
    const stage = document.querySelector('.stage')?.getBoundingClientRect();
    const bar = document.querySelector('header.bar')?.getBoundingClientRect();
    const legend = document.getElementById('map-legend')?.getBoundingClientRect();
    const deskBox = document.getElementById('map-study-desk')?.getBoundingClientRect();
    const timeline = document.querySelector('.timeline-dock')?.getBoundingClientRect();
    const panels = [bar, legend, deskBox, timeline].filter((r): r is DOMRect =>
      Boolean(r && r.width > 0 && r.height > 0),
    );

    const labels = [...document.querySelectorAll('svg.map-svg .map-label rect')].map((r) => {
      const box = r.getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
    });

    const overlaps = (
      a: { left: number; top: number; right: number; bottom: number },
      b: { left: number; top: number; right: number; bottom: number },
    ) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

    let labelCollisions = 0;
    let panelCollisions = 0;
    let outOfStage = 0;

    for (let i = 0; i < labels.length; i++) {
      const l = labels[i];
      if (
        stage &&
        (l.left < stage.left - 1 ||
          l.right > stage.right + 1 ||
          l.top < stage.top - 1 ||
          l.bottom > stage.bottom + 1)
      ) {
        outOfStage += 1;
      }
      if (panels.some((panel) => overlaps(l, panel))) {
        panelCollisions += 1;
      }
      for (let j = i + 1; j < labels.length; j++) {
        if (overlaps(l, labels[j])) labelCollisions += 1;
      }
    }
    return { labelCount: labels.length, labelCollisions, panelCollisions, outOfStage };
  });

  expect(layoutCheck.labelCount).toBeGreaterThan(0);
  expect(layoutCheck.labelCollisions).toBe(0);
  expect(layoutCheck.panelCollisions).toBe(0);
  expect(layoutCheck.outOfStage).toBe(0);
});

test('supports deep link ?pais=brasil, cross-link from /verbete/brasil, and keyboard accessible Tabela drawer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/verbete/brasil');
  const verNoMapa = page.getByRole('link', { name: 'Ver no mapa' });
  await expect(verNoMapa).toBeVisible();
  await verNoMapa.click();

  await expect(page).toHaveURL(/\/mapa\?pais=brasil/);
  const desk = page.locator('#map-study-desk');
  await expect(desk).toContainText('Brasil');
  await expect(desk).toContainText('Regimes políticos');

  const tabelaBtn = page.getByRole('button', { name: 'Ver como lista', exact: true });
  await tabelaBtn.focus();
  await page.keyboard.press('Enter');
  const modal = page.locator('#lista-acessivel');
  await expect(modal).toBeVisible();

  const focusBtn = modal.locator('.table-action-btn').first();
  await focusBtn.focus();
  await page.keyboard.press('Enter');
  await expect(modal).toHaveCount(0);
  await expect(desk.getByRole('link', { name: /Abrir verbete/i })).toBeVisible();
});
