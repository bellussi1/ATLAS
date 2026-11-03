import { expect, test } from '@playwright/test';

test('the old desk address redirects to the single page', async ({ page }) => {
  await page.goto('/marxismo/mesa/');
  await expect(page).toHaveURL(/\/marxismo\/?$/);
  await expect(page.locator('#explorar')).toHaveCount(0);
});

test('relations open stacked sheets that Esc and the back button lift one at a time', async ({
  page,
}) => {
  await page.goto('/marxismo/');
  await page.locator('button.record-card', { hasText: 'Karl Marx' }).first().click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.locator('h2')).toHaveText('Karl Marx');
  await expect(sheet.locator('.sheet-footer')).toContainText('Fonte');
  await sheet.locator('[data-connection]').nth(1).click();
  await expect(page.locator('.sheet-ghost')).toHaveCount(1);
  await expect(sheet.locator('h2')).not.toHaveText('Karl Marx');
  const second = await sheet.locator('h2').textContent();
  await sheet.locator('[data-connection]').nth(1).click();
  await expect(page.locator('.sheet-ghost')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(sheet.locator('h2')).toHaveText(second!);
  await page.goBack();
  await expect(sheet.locator('h2')).toHaveText('Karl Marx');
  await expect(page.locator('.sheet-ghost')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(page).toHaveURL(/\/marxismo\/?$/);
});

test('graph terms explain themselves on focus and open their sheet on activation', async ({
  page,
}) => {
  await page.goto('/liberalismo/');
  const term = page.locator('.knowledge-term', { hasText: 'John Locke' }).first();
  await term.focus();
  const tip = page.locator(`#${await term.getAttribute('aria-describedby')}`);
  await expect(tip).toBeVisible();
  await expect(tip).toHaveAttribute('role', 'tooltip');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog').locator('h2')).toHaveText('John Locke');
  await expect(page.getByRole('dialog')).toContainText(
    (await tip.textContent())!
      .replace(/^Pessoa/, '')
      .split('…')[0]
      .slice(0, 30),
  );
});

test('on wide screens the sheet docks beside the page, which stays usable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/marxismo/');
  const trigger = page.locator('button.record-card', { hasText: 'Karl Marx' }).first();
  await trigger.click();
  const panel = page.getByRole('dialog');
  await expect(panel).toHaveAttribute('aria-modal', 'false');
  await expect(panel.locator('h2').first()).toHaveText('Karl Marx');
  const box = (await panel.boundingBox())!;
  expect(box.x + box.width).toBeGreaterThan(1400);
  expect(box.width).toBeLessThan(560);
  // No horizontal scroll, and the page behind still takes clicks.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  await page.locator('button.record-card', { hasText: 'Friedrich Engels' }).first().click();
  await expect(panel).toHaveCount(1);
  await expect(panel.locator('#knowledge-context-title')).toHaveText('Friedrich Engels');
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(trigger).not.toHaveAttribute('aria-expanded', 'true');
});

test('previous and next walk the reading order and a sheet can be pinned to compare', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/marxismo/');
  await page.locator('button.record-card', { hasText: 'Karl Marx' }).first().click();
  const panel = page.getByRole('dialog');
  const title = panel.locator('#knowledge-context-title');
  const where = panel.locator('.context-position');
  await expect(where).toHaveText(/^\d+ de \d+$/);
  const first = (await title.textContent())!;
  await panel.getByRole('button', { name: /Próximo/ }).click();
  await expect(title).not.toHaveText(first);
  await panel.getByRole('button', { name: /Anterior/ }).click();
  await expect(title).toHaveText(first);
  await panel.getByRole('button', { name: 'Fixar para comparar' }).click();
  const pinned = panel.getByRole('complementary', { name: `Ficha fixada: ${first}` });
  await expect(pinned).toBeVisible();
  await panel.getByRole('button', { name: /Próximo/ }).click();
  await expect(title).not.toHaveText(first);
  await expect(pinned).toBeVisible();
  await pinned.getByRole('button', { name: /Soltar/ }).click();
  await expect(pinned).toHaveCount(0);
});

test('on phones the sheet is a bottom sheet with a trapped focus, big targets and no overflow', async ({
  page,
}) => {
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/marxismo/');
    const trigger = page.locator('button.record-card', { hasText: 'Karl Marx' }).first();
    await trigger.click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toHaveAttribute('aria-modal', 'true');
    await expect(sheet.locator('#knowledge-context-title')).toHaveText('Karl Marx');
    await expect(async () => {
      const box = (await sheet.boundingBox())!;
      expect(box.x).toBe(0);
      expect(box.width).toBe(width);
      expect(box.y + box.height).toBe(800);
      expect(box.y).toBeGreaterThan(20);
    }).toPass();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    for (const name of ['Fechar contexto', 'Anterior', 'Próximo']) {
      const target = (await sheet.getByRole('button', { name: new RegExp(name) }).boundingBox())!;
      expect(target.height).toBeGreaterThanOrEqual(44);
    }
    for (let i = 0; i < 40; i++) await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(
      true,
    );
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
});
