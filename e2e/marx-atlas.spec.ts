import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('Marxism is one continuous page with an inline argument map', async ({ page }) => {
  await page.goto('/atlas/marxismo/');
  await expect(page.getByRole('heading', { name: 'Marxismo e economia política.' })).toBeVisible();
  await expect(page.locator('.view-switch')).toHaveCount(0);
  await expect(page.locator('.graph-canvas')).toHaveCount(0);
  await expect(page.locator('.text-network')).toHaveAttribute('open', '');
  await expect(
    page.getByRole('heading', { name: 'Pessoas e acontecimentos no tempo' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Imagens com licença registrada' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Selecionar tese' })).toBeVisible();
  await expect(page.locator('a[href^="/verbete/"]')).toHaveCount(0);
  const currentUrl = page.url();
  await page
    .getByRole('button', { name: /Adam Smith.*Trabalho que uma mercadoria pode comandar/ })
    .click();
  await expect(page.locator('#argument-context')).toContainText('Smith: medida na troca');
  await expect(page).toHaveURL(currentUrl);
});

test('continuous Marxism page supports keyboard interaction and an accessible layout on mobile', async ({
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
  const smithThesis = page.getByRole('button', {
    name: /Adam Smith.*Trabalho que uma mercadoria pode comandar/,
  });
  await smithThesis.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#argument-context')).toContainText('Smith: medida na troca');
  await expect(page).toHaveURL(/\/atlas\/marxismo\/?$/);
});

test('expanded atlas selects an author, returns to its root and opens a historical event', async ({
  page,
}) => {
  await page.goto('/atlas/marxismo/');
  await expect(
    page.getByRole('heading', { name: 'Autores, correntes e ideias em relação.' }),
  ).toBeVisible();
  await expect(page.locator('.view-switch')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Pessoas e acontecimentos no tempo' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Imagens com licença registrada' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Selecionar tese' })).toBeVisible();
  await expect(page.locator('a[href^="/verbete/"]')).toHaveCount(0);
  await expect(page.locator('.scope')).toContainText('27 entidades');
  await page.getByRole('button', { name: /^Pessoa Friedrich Engels/ }).click();
  await expect(page.getByRole('heading', { name: 'Friedrich Engels' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Consultar Wikidata Q34787/ })).toBeVisible();
  await page.getByRole('button', { name: '← Voltar ao contexto anterior' }).click();
  await expect(page.locator('.context-panel h2')).toHaveText('Marxismo');

  await page.locator('.timeline-list button').filter({ hasText: 'Comuna de Paris' }).click();
  await expect(page.getByRole('heading', { name: 'Comuna de Paris' })).toBeVisible();
  await expect(page.getByText('Dados importados', { exact: false })).toBeVisible();
  const currentUrl = page.url();
  await page
    .getByRole('button', { name: /Karl Marx.*Tempo de trabalho socialmente necessário/ })
    .click();
  await expect(page.locator('#argument-context')).toContainText(
    'Marx: tempo socialmente necessário',
  );
  await expect(page).toHaveURL(currentUrl);
  await page.screenshot({ path: 'output/playwright/atlas-marxismo-desktop.png', fullPage: true });
});

test('touch users select a Latin American record from the compact mobile index', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto('/atlas/marxismo/');
  await page.getByRole('button', { name: /^Pessoa Florestan Fernandes/ }).tap();
  await expect(page.getByRole('heading', { name: 'Florestan Fernandes' })).toBeVisible();
  await expect(page.locator('.entity-list .card-preview').filter({ visible: true })).toHaveCount(0);
  await page.screenshot({ path: 'output/playwright/atlas-marxismo-mobile.png', fullPage: true });
  await context.close();
});

test('previously shared argument URLs keep their selection', async ({ page }) => {
  await page.goto('/atlas/marxismo/?argumento=marx&vinculo=critica');
  await expect(page.getByRole('heading', { name: 'Marxismo e economia política.' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Karl Marx.*Tempo de trabalho socialmente necessário/ }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Crítica documentada')).toBeChecked();
  await expect(page.locator('.view-switch')).toHaveCount(0);
});

test('explores a thesis, two records and returns to the same map context', async ({ page }) => {
  await page.goto('/atlas/marxismo/valor-e-trabalho/');
  await page.getByLabel('Crítica documentada').check();
  await page.getByRole('button', { name: /Tempo de trabalho socialmente necessário/ }).click();
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
