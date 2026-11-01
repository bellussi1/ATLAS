import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('retired entry, sources, search and institutional routes still return home', async ({
  page,
}) => {
  for (const path of [
    '/verbete/karl-marx',
    '/fontes',
    '/conhecimento',
    '/sobre',
    '/estudar',
    '/rota-inexistente',
  ]) {
    await page.goto('/');
    await page.evaluate((destination) => {
      history.pushState(null, '', destination);
      dispatchEvent(new PopStateEvent('popstate'));
    }, path);
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
    await expect(page.getByLabel('Procurar no acervo', { exact: true })).toBeVisible();
  }
});

test('home search and sheet open only retained pages', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Procurar no acervo', { exact: true }).fill('liberalismo');
  await page.getByRole('button', { name: 'Pesquisar', exact: true }).click();
  await page
    .getByRole('region', { name: 'Resultados da busca' })
    .getByRole('link', { name: 'Liberalismo', exact: true })
    .click();
  await expect(page).toHaveURL(/\/liberalismo$/);
  await page.goto('/');
  await page.getByRole('button', { name: /atlas\s*Liberalismo/ }).click();
  await page.getByRole('link', { name: 'Ler o texto completo' }).click();
  await expect(page).toHaveURL(/\/liberalismo$/);
});

test('all visible internal links lead to home, Marxism or Liberalism', async ({ page }) => {
  for (const path of ['/', '/marxismo/', '/liberalismo/']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    const hrefs = await page.locator('a[href]').evaluateAll((links) =>
      links
        .map((a) => new URL(a.getAttribute('href')!, location.href))
        .filter((u) => u.origin === location.origin)
        .map((u) => u.pathname.replace(/\/$/, '') || '/'),
    );
    expect(hrefs.filter((p) => !['/', '/marxismo', '/liberalismo'].includes(p))).toEqual([]);
  }
});

test('Marxism chapters, comparison and sources remain on the same page', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/marxismo/');
  await expect(page.locator('.ideology-chapter')).toHaveCount(8);
  await page
    .getByRole('navigation', { name: 'Capítulos', exact: true })
    .getByRole('link', { name: /Vozes que/ })
    .click();
  await expect(page).toHaveURL(/#pensadores$/);
  const author = page.locator('#pensadores').getByRole('button', { name: /Friedrich Engels/ });
  await author.click();
  await expect(page.getByRole('dialog')).toContainText('Friedrich Engels');
  await page.keyboard.press('Escape');
  await expect(author).toBeFocused();
  await page
    .getByRole('button', { name: /Karl Marx.*Tempo de trabalho socialmente necessário/ })
    .click();
  await expect(page.locator('#argument-context')).toContainText(
    'Marx: tempo socialmente necessário',
  );
  await page.getByLabel('O tempo socialmente necessário', { exact: true }).check();
  await page.getByRole('button', { name: 'Conferir resposta' }).click();
  await page.getByRole('link', { name: 'Conferir fonte', exact: true }).click();
  await expect(page).toHaveURL(/\/marxismo.*#fontes$/);
  await expect(
    page.getByRole('button', { name: /Karl Marx.*Tempo de trabalho socialmente necessário/ }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('three pages work on mobile with reduced motion and accessible links', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of ['/', '/marxismo/', '/liberalismo/']) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
    ).toEqual([]);
  }
});
