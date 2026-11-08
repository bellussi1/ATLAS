import AxeBuilder from '@axe-core/playwright';

import { expect, openReadingFixture, test } from './content-fixture';

test('explores entities, graph, timeline and returns to prior context', async ({ page }) => {
  await openReadingFixture(page, 'liberalismo');
  await expect(
    page.getByRole('heading', { name: 'Liberalismo', exact: true, level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Capítulos' })).toBeVisible();
  await expect(page.getByLabel(/Você leu/)).toBeVisible();
  await page.screenshot({
    path: 'output/playwright/atlas-liberalismo-continuous-desktop.png',
    fullPage: true,
  });
  const network = page.locator('#conexoes app-knowledge-network');
  await network.locator('#graph-search').fill('John Locke');
  await network.locator('#graph-search').press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(page.getByRole('dialog', { name: 'John Locke' })).toBeVisible();
  await expect(dialog.locator('#knowledge-context-title')).toHaveText('John Locke');

  const group = dialog.locator('.relation-group').filter({ hasText: 'Adam Smith' }).first();
  if (!(await group.evaluate((details: HTMLDetailsElement) => details.open)))
    await group.locator('summary').click();
  await group.locator('.relation-party').filter({ hasText: 'Adam Smith' }).click();
  await expect(dialog.locator('#knowledge-context-title')).toHaveText('Adam Smith');
  await dialog.getByRole('button', { name: 'Voltar' }).click();
  await expect(dialog.locator('#knowledge-context-title')).toHaveText('John Locke');

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(network.locator('.node.is-selected')).toHaveCount(1);
  await network.getByRole('button', { name: 'Ver ficha' }).click();
  await expect(page.getByRole('dialog', { name: 'John Locke' })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.locator('#epocas').scrollIntoViewIfNeeded();
  const era = page.locator('#epocas .era-chart');
  await expect(era.locator('.marker-note').first()).toContainText('Por que importa');
  await era
    .locator('.marker-list .era-marker')
    .filter({ hasText: 'Revolução Gloriosa' })
    .locator('button')
    .click();
  const contextDialog = page.getByRole('dialog', { name: 'Revolução Gloriosa' });
  await expect(contextDialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(contextDialog).toHaveCount(0);
  await expect(era.locator('.marker-list')).toContainText('Revolução Gloriosa');
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
  await page.goto('/leitura/liberalismo/');
  await expect(page.locator('.text-network')).toHaveJSProperty('open', true);
  await expect(page.locator('.text-network li[data-relation-id]').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: 'output/playwright/atlas-liberalismo-continuous-mobile.png',
    fullPage: true,
  });
  const network = page.locator('#conexoes app-knowledge-network');
  await network.scrollIntoViewIfNeeded();
  await network.locator('#graph-search').fill('John Locke');
  await network.locator('#graph-search').press('Enter');
  const dialog = page.getByRole('dialog', { name: 'John Locke' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#knowledge-context-title')).toHaveText('John Locke');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  const violations = (await new AxeBuilder({ page }).analyze()).violations;
  expect(
    violations.filter((item) => item.impact === 'critical' || item.impact === 'serious'),
  ).toEqual([]);
});

test('mobile reopens the selected entity in one shared sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/leitura/liberalismo/');
  const network = page.locator('#conexoes app-knowledge-network');
  await network.scrollIntoViewIfNeeded();
  await network.locator('#graph-search').fill('John Locke');
  await network.locator('#graph-search').press('Enter');
  const dialog = page.getByRole('dialog', { name: 'John Locke' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await network.getByRole('button', { name: 'Ver ficha' }).click();
  await expect(page.getByRole('dialog', { name: 'John Locke' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
