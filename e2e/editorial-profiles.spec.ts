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

test('expanded catalogues and records stay accessible and usable at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of [
    '/regimes',
    '/partidos',
    '/verbete/brasil',
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
  await page.goto('/paises');
  await page.screenshot({
    path: 'output/playwright/editorial-countries-desktop.png',
    fullPage: true,
  });
});
