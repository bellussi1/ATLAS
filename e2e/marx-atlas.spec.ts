import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('legacy routes lead to a continuous eight-chapter page and preserve thesis selection', async ({
  page,
}) => {
  await page.goto('/atlas/marxismo/?argumento=marx&vinculo=critica');
  await expect(page).toHaveURL(/ideologias\/marxismo.*argumento=marx/);
  await expect(page.getByRole('heading', { name: 'Marxismo', exact: true })).toBeVisible();
  await expect(page.locator('.ideology-chapter')).toHaveCount(8);
  await expect(page.locator('.view-switch')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /Karl Marx.*Tempo de trabalho socialmente necessário/ }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Crítica documentada')).toBeChecked();
  await page.goto('/atlas/marxismo/valor-e-trabalho/?argumento=marx');
  await expect(page).toHaveURL(/ideologias\/marxismo.*#conceitos$/);
});

test('chapter anchors update orientation and offer a return', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/ideologias/marxismo/');
  await page
    .getByRole('navigation', { name: 'Capítulos', exact: true })
    .getByRole('link', { name: /Vozes que/ })
    .click();
  await expect(page).toHaveURL(/#pensadores$/);
  await expect(page.locator('#pensadores')).toBeFocused();
  await expect(page.locator('.chapter-index [aria-current=location]')).toContainText('Vozes');
  await page.getByRole('button', { name: 'Ponto anterior', exact: false }).click();
  await expect(page).toHaveURL(/#introducao$/);
});

test('opening an author preserves the viewport and can be restored from a shared URL', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/ideologias/marxismo/#pensadores');
  const author = page.locator('#pensadores').getByRole('button', { name: /Friedrich Engels/ });
  await author.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  await author.click();
  await expect(author).toHaveAttribute('aria-expanded', 'true');
  await page.waitForTimeout(200);
  expect(Math.abs((await page.evaluate(() => scrollY)) - before)).toBeLessThan(150);
  const url = page.url();
  await page.reload();
  await expect(author).toHaveAttribute('aria-expanded', 'true');
  await expect(page).toHaveURL(url);
});

test('timeline filters and sourced critique graph remain in context', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/ideologias/marxismo/');
  await page.getByLabel('Recorte temporal').selectOption('antes-1850');
  await expect(page.locator('.timeline-list')).toContainText('1848');
  await expect(page.locator('.timeline-list')).not.toContainText('1917');
  await page.locator('#correntes').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Lenin → Karl Kautsky' }).click();
  await expect(page.getByRole('region', { name: 'Relação selecionada' })).toContainText(
    'capítulo VI',
  );
  await page.getByText('Consultar tabela de relações e fontes', { exact: true }).click();
  await expect(page.getByRole('table')).toContainText('estabelecida');
});

test('mobile touch, keyboard, manual reduced motion and source search work', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto('/ideologias/marxismo/');
  await page
    .locator('#pensadores')
    .getByRole('button', { name: /Florestan Fernandes/ })
    .tap();
  await expect(page.locator('#pensadores')).toContainText('Sociólogo');
  await page.getByRole('button', { name: 'Reduzir movimento' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveClass(/atlas-reduced-motion/);
  await page.locator('#fontes').getByLabel('Filtrar referências').fill('inexistente');
  await expect(page.locator('#fontes')).toContainText('Nenhuma referência encontrada');
  await page.locator('#fontes').getByLabel('Filtrar referências').clear();
  await expect(page.locator('#fontes .bibliography li')).toHaveCount(6);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await context.close();
});

test('hub opens both real traditions without publishing draft configurations', async ({ page }) => {
  await page.goto('/ideologias/');
  await page.getByRole('button', { name: /Família de tradições Liberalismo/ }).click();
  await page.getByRole('link', { name: 'Abrir o Atlas do Liberalismo' }).click();
  await expect(page).toHaveURL(/atlas\/liberalismos/);
  await page.goto('/ideologias/');
  await page.getByRole('link', { name: 'Ler o Marxismo' }).click();
  await expect(page.locator('.ideology-chapter')).toHaveCount(8);
});

test('V4 reading has no serious or critical automatic accessibility violations', async ({
  page,
}) => {
  await page.goto('/ideologias/marxismo/');
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([]);
});

test('explores a thesis, two records and returns to the same map context', async ({ page }) => {
  await page.goto('/atlas/marxismo/valor-e-trabalho/');
  await page.getByLabel('Crítica documentada').check();
  await page
    .getByRole('button', { name: /Karl Marx.*Tempo de trabalho socialmente necessário/ })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Marx: tempo socialmente necessário' }),
  ).toBeVisible();
  await expect(page.getByLabel('Crítica documentada')).toBeChecked();
  await expect(page.getByRole('button', { name: 'Prévia: Karl Marx' })).toBeVisible();
  const preview = page.getByRole('button', {
    name: 'Prévia: Tempo de trabalho socialmente necessário',
  });
  await preview.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(preview).toBeFocused();
  await preview.click();
  await page.getByRole('link', { name: /Abrir registro completo/ }).click();
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
  await expect(page).toHaveURL(/ideologias\/marxismo/);
  await expect(page.locator('.ideology-chapter')).toHaveCount(8);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => item.impact === 'critical')).toEqual([]);
});
