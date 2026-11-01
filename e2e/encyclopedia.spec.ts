import { expect, test } from '@playwright/test';

test('keywords open sourced context without moving the reading', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/marxismo/');
  const term = page.locator('#conceitos .knowledge-term').first();
  await expect(term).toBeVisible();
  await term.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  await term.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('link').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(term).toBeFocused();
  expect(Math.abs((await page.evaluate(() => scrollY)) - before)).toBeLessThan(2);
});

test('following a connection starts the new context and restores the previous focus', async ({
  page,
}) => {
  await page.goto('/marxismo/');
  await page.locator('#conceitos .knowledge-term').first().click();
  const dialog = page.getByRole('dialog');
  const connection = dialog.locator('.context-connections button').first();
  await connection.click();
  await expect(dialog.locator('h2')).toBeFocused();
  expect(await dialog.locator('.context-body').evaluate((e) => e.scrollTop)).toBe(0);
  await dialog.getByRole('button', { name: 'Contexto anterior', exact: false }).click();
  await expect(connection).toBeFocused();
  await page.keyboard.press('Escape');
});

test('argument cards and current cards expose evidence on touch', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto('/marxismo/');
  await page.locator('#correntes .exploration-card').first().tap();
  await expect(page.getByRole('dialog')).toContainText('Bernstein');
  await page.getByRole('button', { name: 'Fechar contexto' }).tap();
  await page.locator('#criticas .argument-card').first().tap();
  await expect(
    page.getByRole('dialog').getByRole('region', { name: 'Fontes do contexto' }),
  ).toContainText('Bernstein');
  await page.getByRole('button', { name: 'Fechar contexto' }).tap();
  await page.getByRole('button', { name: 'Estado e revolução', exact: true }).tap();
  await expect(page.locator('#criticas')).toContainText('Réplica ainda não incorporada');
  await context.close();
});

test('timeline selection and graph exploration preserve geometry', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/marxismo/');
  const panel = page.locator('.timeline-reading');
  await panel.scrollIntoViewIfNeeded();
  const before = await panel.boundingBox();
  await page.locator('.timeline-event').filter({ hasText: 'Comuna de Paris' }).click();
  await expect(panel).toContainText('Comuna de Paris');
  expect((await panel.boundingBox())?.height).toBe(before?.height);
  await page.locator('.genealogy-node').filter({ hasText: 'Rosa Luxemburgo' }).click();
  await expect(page.locator('.relation-reading')).toContainText('Bernstein');
});
