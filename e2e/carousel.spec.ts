import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('atlas carousel answers arrows, progress bar, keyboard and drag', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/marxismo/mesa/');
  const region = page.getByRole('region', { name: 'Fichas deste atlas' });
  await region.scrollIntoViewIfNeeded();
  await expect(region).toBeVisible();
  const carousel = page.locator('app-card-carousel', { has: region });
  const count = carousel.locator('.carousel-count');
  await expect(count).toHaveText(/1–\d+ de \d+/);

  await carousel.getByRole('button', { name: /^Próximo: Fichas deste atlas$/ }).click();
  await expect(count).not.toHaveText(/^\s*1–/);

  await carousel.getByRole('button', { name: /^Anterior: Fichas deste atlas$/ }).click();
  await expect(count).toHaveText(/1–\d+ de \d+/);

  const bar = carousel.locator('.carousel-bar');
  const box = await bar.boundingBox();
  if (!box) throw new Error('progress bar not rendered');
  await page.mouse.click(box.x + box.width * 0.9, box.y + box.height / 2);
  await expect.poll(() => region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);

  await region.focus();
  await region.evaluate((el) => el.scrollTo({ left: 0 }));
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);

  await region.evaluate((el) => el.scrollTo({ left: 0 }));
  const cards = region.locator('.carousel-item');
  const first = await cards.nth(0).boundingBox();
  if (!first) throw new Error('first card not rendered');
  const gapX = first.x + first.width + 8;
  const gapY = first.y + first.height / 2;
  await page.mouse.move(gapX, gapY);
  await page.mouse.down();
  await page.mouse.move(gapX - 240, gapY, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(120);

  const violations = (await new AxeBuilder({ page }).analyze()).violations;
  expect(
    violations.filter((item) => item.impact === 'critical' || item.impact === 'serious'),
  ).toEqual([]);
});

test('relation cards open their evidence and select the line in the graph', async ({ page }) => {
  await page.goto('/marxismo/mesa/');
  await page.locator('#desk-panel-rede .relation-table > summary').first().click();
  const card = page.locator('#desk-panel-rede .relation-card').first();
  const select = card.locator('.relation-card-select');
  await select.click();
  await expect(select).toHaveAttribute('aria-pressed', 'true');
  await card.locator('.relation-card-evidence > summary').click();
  await expect(card.locator('.relation-card-evidence')).toHaveAttribute('open', '');
});

test('mobile carousels swipe without horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/marxismo/mesa/');
  const region = page.getByRole('region', { name: 'Registros em ordem cronológica' });
  await region.scrollIntoViewIfNeeded();
  await expect(region).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('timeline period chips bring their first record into view', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/marxismo/mesa/');
  const track = page.locator('.timeline-carousel .carousel-track');
  await track.scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: /^Século XX/ }).click();
  const selected = track.locator('.timeline-node[aria-pressed="true"]');
  await expect(selected).toHaveCount(1);
  await expect
    .poll(() =>
      selected.evaluate((node) => {
        const box = node.getBoundingClientRect();
        const frame = node.closest('.carousel-track')?.getBoundingClientRect();
        return !!frame && box.left >= frame.left - 2 && box.right <= frame.right + 2;
      }),
    )
    .toBe(true);
});

test('timeline record opens its full context and Escape returns to the reading', async ({
  page,
}) => {
  await page.goto('/marxismo/mesa/');
  const reading = page.locator('.strip-reading');
  await reading.scrollIntoViewIfNeeded();
  await reading.getByRole('button', { name: 'Abrir ficha completa +' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(reading.getByRole('button', { name: 'Abrir ficha completa +' })).toBeFocused();
});
