import { expect, test } from '@playwright/test';

test('search, read and follow a documented relationship', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('searchbox', { name: 'Procurar no acervo' }).fill('artigo 5');
  await page.getByRole('button', { name: 'Pesquisar' }).click();
  await page.locator('.results a').filter({ hasText: 'O caput do artigo 5º' }).click();
  await expect(page.locator('h1')).toContainText('artigo 5º');
  await page.locator('.related-records a').filter({ hasText: 'Igualdade perante a lei' }).click();
  await expect(page.locator('h1')).toContainText('Igualdade perante a lei');
});

test('timeline opens an event', async ({ page }) => {
  await page.goto('/tempo-e-espaco/');
  const event = page
    .locator('.timeline-list li')
    .filter({ has: page.locator('a[href="/verbete/promulgacao-constituicao-1988"]') });
  await event.getByRole('button', { name: 'Ver contexto' }).click();
  await expect(event.locator('.detail')).toContainText('Evento delimitado');
  await event.locator('.timeline-list__row a').click();
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
  await expect(
    page.locator('.timeline-list a[href="/verbete/promulgacao-constituicao-1988"]'),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(
    page.getByText('Role a tabela para o lado para ver todos os registros.'),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: /Tabela comparativa/ })).toHaveAttribute(
    'tabindex',
    '0',
  );
  await page.goto('/estudar/');
  await page.getByLabel('Examinar sua evidência e seu contexto').check();
  await page.getByRole('button', { name: 'Conferir resposta' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Correto' })).toBeVisible();
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
    true,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('page transition respects normal and reduced motion', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Element.prototype.animate;
    Element.prototype.animate = function (...args: Parameters<typeof Element.prototype.animate>) {
      if (this.id === 'conteudo') document.documentElement.dataset['atlasTransition'] = 'played';
      return original.apply(this, args);
    };
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.getByRole('link', { name: 'Explorar', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-atlas-transition', 'played');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('link', { name: 'Explorar', exact: true }).click();
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-atlas-transition', 'played');
});

test('mobile home directs exploration to dedicated atlas and relation pages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('app-evidence-network')).toHaveCount(0);
  await page.getByRole('link', { name: /Explorar ideologias e tradições/ }).click();
  await page.getByRole('link', { name: 'Ler o Marxismo' }).click();
  await expect(page.locator('h1')).toContainText('Marxismo');
  await page.goto('/relacoes/');
  await page.getByRole('button', { name: 'Pessoa Karl Marx', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.context h2')).toContainText('Karl Marx');
  await expect(
    page.locator('.relation-statement').filter({ hasText: 'analisa criticamente' }),
  ).toContainText('Adam Smith');
  await page
    .locator('.context li')
    .filter({ hasText: 'analisa criticamente' })
    .getByRole('button', { name: 'Explorar Adam Smith →', exact: true })
    .click();
  await expect(page.locator('.context h2')).toContainText('Adam Smith');
  await expect(page.locator('.context h2')).toBeFocused();
  await expect(
    page.locator('.relation-statement').filter({ hasText: 'é analisado criticamente por' }),
  ).toContainText('Karl Marx');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
