import { test, expect } from '@playwright/test';

test('search, read and follow a documented relationship', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('searchbox', { name: 'Procurar no acervo' }).fill('artigo 5');
  await page.getByRole('button', { name: 'Pesquisar' }).click();
  await page.locator('.results a').filter({ hasText: 'O caput do artigo 5º' }).click();
  await expect(page.locator('h1')).toContainText('artigo 5º');
  await page.locator('.related-records a[href="/verbete/igualdade-perante-a-lei"]').click();
  await expect(page.locator('h1')).toContainText('Igualdade perante a lei');
});

test('timeline opens an event', async ({ page }) => {
  await page.goto('/tempo-e-espaco/');
  await page.locator('.timeline-list a[href="/verbete/promulgacao-constituicao-1988"]').click();
  await expect(page.locator('h1')).toContainText('Promulgação');
});

test('study supports keyboard answer, export and import after reload', async ({ page }) => {
  await page.goto('/estudar/');
  await page.getByLabel('Examinar sua evidência e seu contexto').focus();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Conferir resposta' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: 'Correto' })).toBeVisible();
  await page.getByRole('button', { name: 'Exportar progresso' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Copie os dados' })).toBeVisible();
  const exported = await page.getByLabel('Dados de progresso').inputValue();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'Exportar progresso' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Copie os dados' })).toBeVisible();
  await page.getByLabel('Dados de progresso').fill(exported);
  await page.getByRole('button', { name: 'Importar progresso' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Progresso importado' })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Atividade concluída; você pode tentar novamente.')).toBeVisible();
});

test('mobile timeline and study remain usable with reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tempo-e-espaco/');
  await expect(page.locator('.timeline-list a[href="/verbete/promulgacao-constituicao-1988"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/estudar/');
  await page.getByLabel('Examinar sua evidência e seu contexto').check();
  await page.getByRole('button', { name: 'Conferir resposta' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Correto' })).toBeVisible();
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
