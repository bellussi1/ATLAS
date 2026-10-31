import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('atlas index opens people, returns to the index and leads to a dedicated debate', async ({
  page,
}) => {
  await page.goto('/atlas/marxismo/');
  await expect(page.getByRole('heading', { name: 'Pessoas e suas obras' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Selecionar tese' })).toHaveCount(0);
  for (const portrait of await page.locator('.portrait img').all()) {
    expect(
      await portrait.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
    ).toBe(true);
  }
  const preview = page.getByRole('button', { name: 'Prévia de Karl Marx' });
  await preview.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(preview).toBeFocused();
  await page.getByRole('link', { name: 'Conhecer Karl Marx', exact: true }).click();
  await expect(page.locator('h1')).toContainText('Karl Marx');
  await page.getByRole('link', { name: 'Voltar ao atlas', exact: true }).click();
  await page.getByRole('link', { name: /Abrir o debate sobre valor e trabalho/ }).click();
  await expect(page).toHaveURL(/\/atlas\/marxismo\/valor-e-trabalho/);
  await expect(page.getByRole('group', { name: 'Selecionar tese' })).toBeVisible();
});

test('atlas mobile keeps portraits, keyboard navigation and accessible layout', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/atlas/marxismo/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const violations = (await new AxeBuilder({ page }).analyze()).violations;
  expect(
    violations.filter((item) => item.impact === 'critical' || item.impact === 'serious'),
  ).toEqual([]);
  await page.getByRole('link', { name: 'Conhecer Adam Smith', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('h1')).toContainText('Adam Smith');
  await page.getByRole('link', { name: 'Voltar ao atlas', exact: true }).click();
  await page.getByRole('link', { name: 'Examinar sua formulação de valor' }).last().click();
  await expect(page.getByRole('heading', { name: 'Smith: medida na troca' })).toBeVisible();
});

test('previously shared argument URLs keep their selection', async ({ page }) => {
  await page.goto('/atlas/marxismo/?argumento=marx&vinculo=critica');
  await expect(
    page.getByRole('heading', { name: 'Marx: tempo socialmente necessário' }),
  ).toBeVisible();
  await expect(page.getByLabel('Crítica documentada')).toBeChecked();
});

test('explores a thesis, two records and returns to the same map context', async ({ page }) => {
  await page.goto('/atlas/marxismo/valor-e-trabalho/');
  await page.getByLabel('Crítica documentada').check();
  await page.getByRole('button', { name: /Tempo de trabalho socialmente necessário/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Marx: tempo socialmente necessário' }),
  ).toBeVisible();
  await expect(page.getByLabel('Crítica documentada')).toBeChecked();
  await expect(page.getByRole('button', { name: 'Prévia de Karl Marx' })).toBeVisible();
  const preview = page.getByRole('button', {
    name: 'Prévia de Tempo de trabalho socialmente necessário',
  });
  await preview.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(preview).toBeFocused();
  await page.getByRole('link', { name: 'Ler o conceito' }).click();
  await expect(page.locator('h1')).toContainText('Tempo de trabalho');
  await page.locator('.related-records a').filter({ hasText: 'O capital: volume I' }).click();
  await expect(page.locator('h1')).toContainText('O capital');
  await page.getByRole('link', { name: 'Voltar ao mapa de argumentos' }).click();
  await expect(
    page.getByRole('heading', { name: 'Marx: tempo socialmente necessário' }),
  ).toBeVisible();
  await expect(page.getByLabel('Crítica documentada')).toBeChecked();
});

test('mobile filter and demonstrative exercise are operable with keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/atlas/marxismo/valor-e-trabalho/');
  await page.getByLabel('Comparação', { exact: true }).check();
  await expect(page.getByText('Comparação editorial:', { exact: false })).toBeVisible();
  await expect(page.getByText('Crítica: Marx examina definições', { exact: false })).toHaveCount(0);
  await page.getByLabel('Qualquer tempo individual gasto').focus();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Conferir resposta' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.study [role="status"]')).toContainText('Tente novamente');
  await page.getByLabel('O tempo socialmente necessário').check();
  await page.getByRole('button', { name: 'Conferir resposta' }).click();
  await expect(page.locator('.study [role="status"]')).toContainText('Correto');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Conferir fonte' }).click();
  await page.getByRole('link', { name: 'Voltar ao mapa de argumentos' }).click();
  await expect(page.getByLabel('Comparação', { exact: true })).toBeChecked();
});

test('a record reached from search leads into its corresponding argument', async ({ page }) => {
  await page.goto('/conhecimento/?q=Adam%20Smith');
  await page.locator('.results a[href^="/verbete/adam-smith"]').click();
  await page.getByRole('link', { name: 'Explorar esta discussão no mapa de argumentos' }).click();
  await expect(page.getByRole('heading', { name: 'Smith: medida na troca' })).toBeVisible();
});

test('argument map has no automatically detected critical accessibility violations', async ({
  page,
}) => {
  await page.goto('/atlas/marxismo/valor-e-trabalho/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => item.impact === 'critical')).toEqual([]);
});
