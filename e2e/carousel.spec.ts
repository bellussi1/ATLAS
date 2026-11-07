import AxeBuilder from '@axe-core/playwright';

import { expect, test } from './content-fixture';

test('positions carousel answers arrows, progress bar, keyboard and drag', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/leitura/marxismo/');
  const region = page.getByRole('region', { name: 'Posições por registro' });
  await region.scrollIntoViewIfNeeded();
  await expect(region).toBeVisible();
  const carousel = page.locator('app-card-carousel', { has: region });
  const count = carousel.locator('.carousel-count');
  await expect(count).toHaveText(/1–\d+ de \d+/);

  await carousel.getByRole('button', { name: /^Próximo: Posições por registro$/ }).click();
  await expect(count).not.toHaveText(/^\s*1–/);

  await carousel.getByRole('button', { name: /^Anterior: Posições por registro$/ }).click();
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

test('relations read as sentences, filter by type chips and open each side', async ({ page }) => {
  await page.goto('/leitura/marxismo/');
  const relations = page.locator('.relations').first();
  const items = relations.locator('.relation-item');
  const total = await items.count();
  expect(total).toBeGreaterThan(1);
  await expect(items.first().locator('.relation-sentence')).toContainText(/\w+ \w+/);
  const chips = relations.locator('.relation-chip');
  await expect(chips.first()).toHaveAttribute('aria-pressed', 'true');
  await chips.nth(1).click();
  await expect(chips.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(chips.first()).toHaveAttribute('aria-pressed', 'false');
  await items.first().locator('.relation-party').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
});
