import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('explores entities, graph, timeline, licensed media and returns to prior context', async ({
  page,
}) => {
  await page.goto('/atlas/liberalismos/');
  await expect(page.getByRole('heading', { name: 'Uma ideia. Muitas conexões.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Liberalismo', exact: true })).toBeVisible();
  await page.screenshot({
    path: 'output/playwright/atlas-liberalismo-desktop.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Abrir contexto: John Locke' }).click();
  await expect(page.getByRole('heading', { name: 'John Locke', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '← Voltar ao contexto anterior' }).click();
  await expect(page.getByRole('heading', { name: 'Liberalismo', exact: true })).toBeVisible();
  await page.locator('.relation-list button').filter({ hasText: 'Adam Smith' }).click();
  await expect(page.getByRole('heading', { name: 'Adam Smith', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '← Voltar ao contexto anterior' }).click();
  await expect(page.getByRole('heading', { name: 'Liberalismo', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tempo', exact: true }).click();
  await page.locator('.entity-card').filter({ hasText: 'Revolução Gloriosa' }).click();
  await expect(
    page.getByRole('heading', { name: 'Revolução Gloriosa', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Imagens e documentos' }).click();
  await expect(page.getByRole('heading', { name: 'Imagens com licença registrada' })).toBeVisible();
  const figure = page.locator('.gallery figure').first();
  await figure.scrollIntoViewIfNeeded();
  await expect(figure.locator('img')).toHaveAttribute('alt', /Imagem associada a/);
  await expect
    .poll(() =>
      figure
        .locator('img')
        .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);
  const expand = figure.getByRole('button', { name: /Ampliar imagem/ });
  await expand.click();
  await expect(figure.getByRole('button', { name: /Reduzir imagem/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(figure.getByRole('link', { name: /CC BY|CC0/ })).toBeVisible();
  await expect(figure.getByRole('link', { name: 'Página do arquivo no Commons' })).toHaveAttribute(
    'href',
    /commons\.wikimedia\.org/,
  );
  await page.getByRole('button', { name: 'Rede', exact: true }).click();
  await expect(page.locator('.text-network summary')).toBeVisible();
  const violations = (await new AxeBuilder({ page }).analyze()).violations;
  expect(
    violations.filter((item) => item.impact === 'critical' || item.impact === 'serious'),
  ).toEqual([]);
});

test('mobile keeps entity navigation available without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/atlas/liberalismos/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'output/playwright/atlas-liberalismo-mobile.png', fullPage: true });
  const locke = page.locator('.entity-card').filter({ hasText: 'John Locke' });
  await locke.focus();
  await expect(locke.locator('.card-preview')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'John Locke', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '← Voltar ao contexto anterior' }).click();
  await expect(page.getByRole('heading', { name: 'Liberalismo', exact: true })).toBeVisible();
  const violations = (await new AxeBuilder({ page }).analyze()).violations;
  expect(
    violations.filter((item) => item.impact === 'critical' || item.impact === 'serious'),
  ).toEqual([]);
});
