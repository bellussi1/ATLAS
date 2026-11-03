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
