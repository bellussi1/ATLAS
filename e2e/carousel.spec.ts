import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('atlas carousel answers arrows, progress bar, keyboard and drag', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/marxismo/');
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

test('relations read as sentences, filter by type chips and open each side', async ({ page }) => {
  await page.goto('/marxismo/');
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

test('mobile carousels swipe without horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/marxismo/');
  const axis = page.locator('#atlas-section-tempo').getByRole('group', { name: /^Eixo do tempo/ });
  await axis.scrollIntoViewIfNeeded();
  await expect(axis).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // The axis scrolls inside its own frame, with a position bar and 44px buttons.
  const atlas = page.locator('#atlas-section-tempo app-timeline-axis');
  await expect(atlas.getByRole('button', { name: 'Rolar o eixo para a frente' })).toBeVisible();
  const small = await atlas
    .getByRole('button')
    .evaluateAll(
      (buttons) =>
        buttons.filter((b) => b.getBoundingClientRect().height < 43 && !b.matches('.axis-row'))
          .length,
    );
  expect(small).toBe(0);
});

test('timeline century chips cut the axis and the list together', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/marxismo/');
  const axis = page.locator('#atlas-section-tempo app-timeline-axis');
  await axis.scrollIntoViewIfNeeded();
  const all = await axis.locator('.axis-marker').count();
  await axis.getByRole('button', { name: /^Século XX/ }).click();
  const cut = await axis.locator('.axis-marker').count();
  expect(cut).toBeGreaterThan(0);
  expect(cut).toBeLessThan(all);
  await expect(axis.locator('.axis-row')).toHaveCount(Math.min(cut, 8));
  await axis.getByRole('button', { name: 'Aumentar a ampliação' }).click();
  await expect(axis.locator('.axis-zoom-level')).toContainText('2/');
});

test('timeline marker opens the reading panel and Escape returns focus to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/marxismo/');
  const axis = page.locator('#atlas-section-tempo app-timeline-axis');
  await axis.scrollIntoViewIfNeeded();
  const marker = axis.locator('.axis-marker').filter({ hasText: 'Karl Marx' });
  await marker.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(axis.locator('.axis-list li.current')).toContainText('Karl Marx');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(marker).toBeFocused();
});

test('timeline arrows walk the records and keep one tab stop', async ({ page }) => {
  await page.goto('/marxismo/');
  const axis = page.locator('#atlas-section-tempo app-timeline-axis');
  await axis.scrollIntoViewIfNeeded();
  await axis.locator('.axis-marker[tabindex="0"]').focus();
  const before = await axis.locator('.axis-selected strong').textContent();
  await page.keyboard.press('ArrowRight');
  await expect(axis.locator('.axis-selected strong')).not.toHaveText(before!);
  await page.keyboard.press('End');
  const total = await axis.locator('.axis-marker').count();
  await expect(axis.locator('.axis-selected strong')).toContainText(`${total} de ${total}`);
  await expect(axis.locator('.axis-marker[tabindex="0"]')).toHaveCount(1);
});
