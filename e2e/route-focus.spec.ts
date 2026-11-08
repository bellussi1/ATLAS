import { expect, type Page, test } from './content-fixture';

/** The router owns history.state once its initial navigation has completed. */
const routerReady = (page: Page) =>
  page.waitForFunction(() =>
    Boolean((history.state as { navigationId?: number } | null)?.navigationId),
  );

test('moving to another page moves focus to the content and names it by its title', async ({
  page,
}) => {
  await page.goto('/');
  await routerReady(page);
  await page.evaluate(() => {
    history.pushState(null, '', '/leitura/marxismo');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Marxismo');
  await expect(page.locator('#conteudo')).toBeFocused();
  await expect(page.locator('#conteudo')).toHaveAccessibleName(/Marxismo/);
});

test('a query change keeps focus where it is', async ({ page }) => {
  await page.goto('/acervo');
  await routerReady(page);
  await page.getByLabel('Procurar no acervo', { exact: true }).focus();
  await page.evaluate(() => {
    history.pushState(null, '', '/acervo?q=liberalismo');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByLabel('Procurar no acervo', { exact: true })).toBeFocused();
});

test('an unknown address shows the not-found heading and keeps the address', async ({ page }) => {
  await page.goto('/');
  await routerReady(page);
  await page.evaluate(() => {
    history.pushState(null, '', '/rota-que-nao-existe');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page).toHaveURL(/\/rota-que-nao-existe$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página não encontrada');
  await expect(page.locator('#conteudo')).toBeFocused();
});
