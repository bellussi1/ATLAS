import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('expanded catalogues expose grounded country/regime profiles and the other entity kinds', async ({
  page,
}) => {
  for (const [path, title] of [
    ['/paises', 'Países'],
    ['/regimes', 'Regimes'],
    ['/partidos', 'Partidos'],
    ['/instituicoes', 'Instituições'],
    ['/acontecimentos', 'Acontecimentos'],
    ['/conceitos', 'Conceitos'],
    ['/lugares', 'Lugares'],
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    expect(await page.locator('.results article').count()).toBeGreaterThan(0);
  }
  await page.goto('/verbete/brasil');
  await expect(page.getByRole('region', { name: 'Perfil específico do registro' })).toContainText(
    'República Federativa do Brasil',
  );
  await page.goto('/verbete/portugal-recorte-constitucional-1976');
  const profile = page.getByRole('region', { name: 'Perfil específico do registro' });
  await expect(profile).toContainText('Não retroprojetar');
  await expect(profile).toContainText('artigo 2.º');
  await profile.getByRole('link', { name: 'Portugal', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Portugal');
});

test('reviewed English text preserves identity, original evidence, review method and navigation history', async ({
  page,
}) => {
  await page.goto('/verbete/brasil');
  await page.goto('/verbete/brasil?idioma=en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Brazil');
  await expect(page.getByRole('heading', { level: 1 })).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle('Brazil — ATLAS');
  await expect(page.locator('.record')).toContainText('assistida por IA');
  await expect(page.locator('.record')).toContainText('Sem revisão humana registrada');
  await expect(page.locator('app-claim-references')).toContainText('Revisão editorial pendente');
  await expect(page.getByRole('button', { name: 'Copiar link', exact: true })).toBeVisible();
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', '/verbete/brasil');
  await expect(page.getByRole('region', { name: 'Perfil específico do registro' })).toHaveAttribute(
    'lang',
    'pt-BR',
  );
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Brazil');
  await expect(page).toHaveURL(/idioma=en/);
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Brasil');
  await page.goForward();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Brazil');
});

test('English search finds translated narrative and keeps locale when returning to results', async ({
  page,
}) => {
  await page.goto('/paises?idioma=en&q=Federative');
  const results = page.getByRole('region', { name: 'Resultados da busca' });
  await results.getByRole('link', { name: 'Brazil', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Brazil');
  await page.getByRole('link', { name: 'Voltar aos resultados' }).click();
  await expect(page).toHaveURL(/idioma=en/);
  await expect(page.getByLabel('Procurar no acervo', { exact: true })).toHaveValue('Federative');
});

test('missing or unsupported translations fall back explicitly and source drafts are not public assets', async ({
  page,
  request,
}) => {
  await page.goto('/verbete/karl-marx?idioma=en');
  await expect(page.locator('.language-notice')).toContainText('Tradução revisada indisponível');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Karl Marx');
  await expect(page.getByRole('heading', { level: 1 })).toHaveAttribute('lang', 'und');
  await page.goto('/verbete/brasil?idioma=es');
  await expect(page).toHaveURL(/idioma=es/);
  await expect(page.locator('.language-notice')).toBeVisible();
  expect((await request.get('/content/translations/catalogue.json')).status()).toBe(404);
});

test('expanded catalogues and translated records stay accessible and usable at 320px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of [
    '/regimes?idioma=en',
    '/partidos',
    '/verbete/brasil?idioma=en',
    '/verbete/portugal-recorte-constitucional-1976',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const audit = await new AxeBuilder({ page }).analyze();
    expect(
      audit.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    ).toEqual([]);
  }
  await page.screenshot({ path: 'output/playwright/editorial-regime-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/paises?idioma=en');
  await page.screenshot({
    path: 'output/playwright/editorial-countries-en-desktop.png',
    fullPage: true,
  });
});
