import { expect, test } from './content-fixture';

test('renders static world map with zero external map tile requests and no overflow at 1440px or 320px', async ({
  page,
}) => {
  const externalMapRequests: string[] = [];
  const consoleErrors: string[] = [];

  page.on('request', (req) => {
    const url = req.url();
    if (/tile\.|openstreetmap|mapbox|arcgis|leaflet|carto|wikimedia\.org.*tile/i.test(url)) {
      externalMapRequests.push(url);
    }
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/mapa');

  await expect(page.getByRole('heading', { name: /Mapa-múndi/i, level: 1 })).toBeVisible();
  await expect(page.locator('svg.map-svg')).toBeVisible();
  expect(await page.locator('path.map-country').count()).toBeGreaterThanOrEqual(170);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('footer.map-attribution')).toContainText('Natural Earth');
  await expect(page.locator('footer.map-attribution')).toContainText('Wikidata');

  await page.setViewportSize({ width: 320, height: 640 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(externalMapRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('shows 7 legend relation families with dash patterns, hover highlight, and era filter with undated disclosure', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/mapa');

  const legend = page.locator('#map-legend');
  const legendItems = legend.locator('.legend-item');
  await expect(legendItems).toHaveCount(7);
  expect(await legend.locator('line[stroke-dasharray]').count()).toBeGreaterThanOrEqual(5);

  const firstRow = legend.locator('.legend-row').first();
  await firstRow.hover();
  await expect(firstRow).toHaveClass(/is-hovered/);

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
});

test('surprise button selects a territory and places non-overlapping labels inside the map plate', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/mapa');

  await page.getByRole('button', { name: /Surpreenda-me/i }).click();
  const desk = page.locator('#map-study-desk');
  await expect(desk.getByRole('link', { name: /Abrir verbete/i })).toBeVisible();

  const layoutCheck = await page.evaluate(() => {
    const svg = document.querySelector('svg.map-svg')?.getBoundingClientRect();
    const legend = document.getElementById('map-legend')?.getBoundingClientRect();
    const deskBox = document.getElementById('map-study-desk')?.getBoundingClientRect();
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
    let outOfSvg = 0;

    for (let i = 0; i < labels.length; i++) {
      const l = labels[i];
      if (
        svg &&
        (l.left < svg.left - 1 ||
          l.right > svg.right + 1 ||
          l.top < svg.top - 1 ||
          l.bottom > svg.bottom + 1)
      ) {
        outOfSvg += 1;
      }
      if ((legend && overlaps(l, legend)) || (deskBox && overlaps(l, deskBox))) {
        panelCollisions += 1;
      }
      for (let j = i + 1; j < labels.length; j++) {
        if (overlaps(l, labels[j])) labelCollisions += 1;
      }
    }
    return { labelCount: labels.length, labelCollisions, panelCollisions, outOfSvg };
  });

  expect(layoutCheck.labelCount).toBeGreaterThan(0);
  expect(layoutCheck.labelCollisions).toBe(0);
  expect(layoutCheck.panelCollisions).toBe(0);
  expect(layoutCheck.outOfSvg).toBe(0);
});

test('supports deep link ?pais=brasil, ecosystem cross-link from /verbete/brasil, and keyboard accessible list', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/verbete/brasil');
  const verNoMapa = page.getByRole('link', { name: 'Ver no mapa' });
  await expect(verNoMapa).toBeVisible();
  await verNoMapa.click();

  await expect(page).toHaveURL(/\/mapa\?pais=brasil/);
  const desk = page.locator('#map-study-desk');
  await expect(desk).toContainText('Brasil');
  await expect(desk).toContainText('Regimes políticos');

  const detailsSummary = page.locator('#lista-acessivel summary');
  await detailsSummary.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#lista-acessivel details')).toHaveAttribute('open', '');
  const focusBtn = page.locator('#lista-acessivel .table-action-btn').first();
  await focusBtn.focus();
  await page.keyboard.press('Enter');
  await expect(desk.getByRole('link', { name: /Abrir verbete/i })).toBeVisible();
});
