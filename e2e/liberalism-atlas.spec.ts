import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('explores entities, graph, timeline and returns to prior context', async ({ page }) => {
  await page.goto('/liberalismo/');
  await expect(
    page.getByRole('heading', { name: 'Liberalismo', exact: true, level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Capítulos' })).toBeVisible();
  await expect(page.getByLabel(/Percurso/)).toBeVisible();
  await page.screenshot({
    path: 'output/playwright/atlas-liberalismo-continuous-desktop.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: /^Pessoa John Locke/ }).click();
  await expect(page.getByRole('heading', { name: 'John Locke', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '← Voltar ao contexto anterior' }).click();
  await expect(
    page.getByRole('heading', { name: 'Liberalismo', exact: true, level: 2 }),
  ).toBeVisible();
  await page.locator('.relation-list button').filter({ hasText: 'Adam Smith' }).click();
  await expect(page.getByRole('heading', { name: 'Adam Smith', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '← Voltar ao contexto anterior' }).click();
  await expect(
    page.getByRole('heading', { name: 'Liberalismo', exact: true, level: 2 }),
  ).toBeVisible();
  await page.locator('#atlas-section-tempo').scrollIntoViewIfNeeded();
  await page.locator('.timeline-node').filter({ hasText: 'Revolução Gloriosa' }).click();
  await expect(
    page.getByRole('heading', { name: 'Revolução Gloriosa', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Próximo →' }).click();
  await expect(page.getByRole('button', { name: '← Anterior' })).toHaveAttribute(
    'aria-disabled',
    'false',
  );
  await page.locator('#atlas-section-rede').scrollIntoViewIfNeeded();
  await expect(page.locator('.text-network summary')).toBeVisible();
  const violations = (await new AxeBuilder({ page }).analyze()).violations;
  expect(
    violations.filter((item) => item.impact === 'critical' || item.impact === 'serious'),
  ).toEqual([]);
});

test('mobile keeps entity navigation available without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/liberalismo/');
  await expect(page.locator('.text-network')).toHaveJSProperty('open', true);
  await expect(page.locator('.text-network li[data-relation-id]').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: 'output/playwright/atlas-liberalismo-continuous-mobile.png',
    fullPage: true,
  });
  const locke = page.locator('.entity-card').filter({ hasText: 'John Locke' });
  await locke.focus();
  await expect(locke.locator('.card-preview')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'John Locke', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '← Voltar ao contexto anterior' }).click();
  await expect(
    page.getByRole('heading', { name: 'Liberalismo', exact: true, level: 2 }),
  ).toBeVisible();
  const violations = (await new AxeBuilder({ page }).analyze()).violations;
  expect(
    violations.filter((item) => item.impact === 'critical' || item.impact === 'serious'),
  ).toEqual([]);
});

test('mobile reopens the selected entity without duplicating history', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/liberalismo/');
  const locke = page.locator('.entity-card').filter({ hasText: 'John Locke' });
  for (let attempt = 0; attempt < 2; attempt++) {
    await locke.click();
    await expect(page.getByRole('heading', { name: 'John Locke', exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: '← Voltar ao contexto anterior' }).click();
  await expect(
    page.getByRole('heading', { name: 'Liberalismo', exact: true, level: 2 }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '← Voltar ao contexto anterior' })).toHaveCount(0);
});
