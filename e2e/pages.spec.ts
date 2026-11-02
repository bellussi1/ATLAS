import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('unknown and unpublished institutional routes still return home', async ({ page }) => {
  for (const path of ['/sobre', '/estudar', '/rota-inexistente']) {
    await page.goto('/');
    await page.evaluate((destination) => {
      history.pushState(null, '', destination);
      dispatchEvent(new PopStateEvent('popstate'));
    }, path);
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
    await expect(page.getByLabel('Procurar no acervo', { exact: true })).toBeVisible();
  }
});

test('home search opens the universal catalogue and the reading sheet stays available', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Procurar no acervo', { exact: true }).fill('liberalismo');
  await page.getByRole('button', { name: 'Pesquisar', exact: true }).click();
  await expect(page).toHaveURL(/\/conhecimento\?q=liberalismo$/);
  await expect(
    page
      .getByRole('region', { name: 'Resultados da busca' })
      .getByRole('link', { name: 'Liberalismo', exact: true }),
  ).toHaveCount(2);
  await page.goto('/');
  await page.getByRole('button', { name: /atlas\s*Liberalismo/ }).click();
  await page.getByRole('link', { name: 'Ler o texto completo' }).click();
  await expect(page).toHaveURL(/\/liberalismo$/);
});

test('reading navigation includes the knowledge explorer', async ({ page }) => {
  for (const path of ['/', '/marxismo/', '/liberalismo/']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    const hrefs = await page.locator('a[href]').evaluateAll((links) =>
      links
        .map((a) => new URL(a.getAttribute('href')!, location.href))
        .filter((u) => u.origin === location.origin)
        .map((u) => u.pathname.replace(/\/$/, '') || '/'),
    );
    expect(
      hrefs.filter(
        (p) =>
          !['/', '/marxismo', '/liberalismo', '/conhecimento', '/rede', '/comparar'].includes(p),
      ),
    ).toEqual([]);
  }
});

test('Marxism chapters, comparison and sources remain on the same page', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/marxismo/');
  await expect(page.locator('.ideology-chapter')).toHaveCount(10);
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

test('ideology reading controls stay in sync on desktop and mobile', async ({ page }) => {
  for (const [path, firstAnchor, secondAnchor] of [
    ['/marxismo/', 'introducao', 'origens'],
    ['/liberalismo/', 'introducao', 'origens'],
  ]) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    if (path === '/marxismo/') {
      await page.screenshot({
        path: 'output/playwright/atlas-marxismo-editorial-desktop.png',
        fullPage: true,
      });
    }
    const chapterLinks = page.locator('app-ideology-reading-index .desktop-nav a');
    expect(await chapterLinks.count()).toBeGreaterThan(1);
    await chapterLinks.nth(1).click();
    await expect(page).toHaveURL(new RegExp(`#${secondAnchor}$`));
    await expect(page.locator(`#${secondAnchor}`)).toBeFocused();
    await page.getByRole('button', { name: '← Ponto anterior' }).click();
    await expect(page).toHaveURL(new RegExp(`#${firstAnchor}$`));

    const motionControl = page.locator('app-ideology-reading-index .motion-control');
    await motionControl.click();
    await expect(motionControl).toHaveAttribute('aria-pressed', 'true');
    expect(
      await page.evaluate(() =>
        document.documentElement.classList.contains('atlas-reduced-motion'),
      ),
    ).toBe(true);
    await page.getByRole('button', { name: 'Restaurar movimento' }).click();

    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const chapterPicker = page.getByLabel('Ir para capítulo');
    await chapterPicker.selectOption(secondAnchor);
    await expect(page).toHaveURL(new RegExp(`#${secondAnchor}$`));
    await expect(page.locator(`#${secondAnchor}`)).toBeFocused();
    await page.getByRole('button', { name: '← Ponto anterior' }).click();
    await expect(page).toHaveURL(new RegExp(`#${firstAnchor}$`));
  }
});

test('shared reading preserves filters and clears motion preference when leaving', async ({
  page,
}) => {
  for (const [path, secondAnchor] of [
    ['/marxismo/', 'origens'],
    ['/liberalismo/', 'origens'],
  ]) {
    await page.goto(`${path}?bibliografia=Locke`);
    const reader = page.locator('app-ideology-reading');
    await expect(reader).toHaveCount(1);
    await reader.locator('.desktop-nav a').nth(1).click();
    await expect(page).toHaveURL(new RegExp(`bibliografia=Locke#${secondAnchor}$`));
    await expect(reader.locator('a[aria-current="location"]')).toHaveAttribute(
      'href',
      `#${secondAnchor}`,
    );
    await reader.getByRole('button', { name: 'Reduzir movimento' }).click();
    await expect(page.locator('html')).toHaveClass(/atlas-reduced-motion/);
    // Client-side navigation must destroy the old reader and its document-wide preference.
    await reader.getByRole('link', { name: '← Página inicial', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('html')).not.toHaveClass(/atlas-reduced-motion/);
  }
});
