import { readFile } from 'node:fs/promises';

import AxeBuilder from '@axe-core/playwright';

import { expect, test } from './content-fixture';

test('a connection keeps the search origin so the results stay one step away', async ({ page }) => {
  await page.goto('/entidades?q=Marx');
  const results = page.getByRole('region', { name: 'Resultados da busca' });
  await results.getByRole('link').first().click();
  await expect(page).toHaveURL(/origem=/);
  const connection = page.locator('.connection a.relation-party').first();
  await connection.click();
  await expect(page).toHaveURL(/origem=/);
  await expect(page.getByRole('link', { name: 'Voltar aos resultados' })).toHaveAttribute(
    'href',
    /\/entidades\?q=Marx/,
  );
});

test('universal search starts at home, handles aliases and keeps filters through a permanent page', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Procurar no acervo', { exact: true }).fill('guimaraes silveira');
  await page.getByRole('button', { name: 'Pesquisar', exact: true }).click();
  await expect(page).toHaveURL(/conhecimento\?q=guimaraes/);
  const results = page.getByRole('region', { name: 'Resultados da busca' });
  await results
    .getByRole('link')
    .filter({ has: page.locator('strong', { hasText: /^Ulysses Guimarães$/ }) })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ulysses Guimarães');
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Pessoas');
  await expect(page.getByRole('button', { name: 'Copiar link', exact: true })).toBeVisible();
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
    'href',
    '/verbete/ulysses-guimaraes',
  );
  await page.getByRole('link', { name: 'Voltar aos resultados' }).click();
  await expect(page.getByLabel('Procurar no acervo', { exact: true })).toHaveValue(
    'guimaraes silveira',
  );
  const categories = page.getByRole('group', { name: 'Categorias de registro' });
  await categories.getByRole('link', { name: /^Pessoa\b/ }).click();
  await expect(page).toHaveURL(/tipo=pessoa/);
  await page.goBack();
  await expect(categories.getByRole('link', { name: /^Todos\b/ })).toHaveAttribute(
    'aria-current',
    'true',
  );
  await page.goForward();
  await expect(categories.getByRole('link', { name: /^Pessoa\b/ })).toHaveAttribute(
    'aria-current',
    'true',
  );
  await page.reload();
  await expect(categories.getByRole('link', { name: /^Pessoa\b/ })).toHaveAttribute(
    'aria-current',
    'true',
  );
  await page
    .getByLabel('Procurar no acervo', { exact: true })
    .fill('nenhum-registro-com-este-nome');
  await page.getByRole('button', { name: 'Pesquisar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Nenhum registro encontrado' })).toBeVisible();
  await page.getByRole('link', { name: 'Limpar busca e filtros' }).click();
  await expect(results.getByRole('article').first()).toBeVisible();
});

test('catalogues expose actual records and permanent pages update when following a relation', async ({
  page,
}) => {
  for (const [path, title] of [
    ['/entidades', 'Entidades'],
    ['/pessoas', 'Pessoas'],
    ['/obras', 'Obras'],
    ['/ideologias', 'Ideologias'],
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    expect(await page.locator('.results article').count()).toBeGreaterThan(0);
    expect(
      await page
        .locator('.results article a')
        .evaluateAll((links) =>
          links.every((a) => a.getAttribute('href')?.startsWith('/verbete/')),
        ),
    ).toBe(true);
  }
  await page.goto('/verbete/karl-marx');
  await expect(page).toHaveTitle('Karl Marx — ATLAS');
  await page
    .locator('.connection')
    .getByRole('link', { name: 'O capital: volume I', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('O capital: volume I');
  await expect(page).toHaveTitle('O capital: volume I — ATLAS');
  await expect(
    page.locator('.connection').getByRole('link', { name: 'Karl Marx', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Abrir esta fonte no índice' }).first().click();
  await expect(page).toHaveURL(/fontes#source-/);
  await expect(page.locator(new URL(page.url()).hash)).toBeVisible();
});

test('contextual exploration opens the matching permanent entity page', async ({ page }) => {
  await page.goto('/marxismo');
  await page.locator('#conceitos .knowledge-term').first().click();
  const dialog = page.getByRole('dialog');
  const title = (await dialog.locator('h2').textContent())!.trim();
  await dialog.getByRole('link', { name: /Abrir o verbete de/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  await expect(page).toHaveURL(/\/verbete\//);
});

test('all search destinations have prerendered HTML with matching title, canonical and fragments', async ({
  request,
}) => {
  // One request per search destination: the budget grows with the catalogue, not a fixed 30 s.
  test.setTimeout(300_000);
  const cache = 'generated/content-cache';
  const asset = async (hash: string) =>
    JSON.parse(await readFile(`${cache}/c/${hash}.json`, 'utf8'));
  const pointer = JSON.parse(await readFile(`${cache}/pointer.json`, 'utf8'));
  const manifest = await asset(pointer.manifest.sha256);
  const site = process.env['ATLAS_SITE_URL']?.replace(/\/+$/, '');
  const index = (await asset(manifest.search.sha256)) as {
    path: string;
    title: string;
    fragment?: string;
  }[];
  for (const entry of index) {
    const response = await request.get(entry.path);
    expect(response.ok(), entry.path).toBe(true);
    const html = await response.text();
    const readingPaths = ['/marxismo', '/liberalismo', '/social-democracia', '/anarquismo'];
    const pageTitle = readingPaths.includes(entry.path)
      ? `${entry.title}: ideias e divergências`
      : entry.path === '/fontes'
        ? 'Fontes'
        : entry.title;
    const title = pageTitle
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
    expect(html.match(/<title>(.*?)<\/title>/)?.[1], entry.path).toBe(title + ' — ATLAS');
    expect(html.match(/property="og:title" content="([^"]*)"/)?.[1], entry.path).toBe(
      title + ' — ATLAS',
    );
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    expect(canonical, entry.path).toBe(site ? site + entry.path : undefined);
    if (entry.fragment) expect(html).toContain('id="' + entry.fragment + '"');
  }
});

test('catalogues and entries reflow at 320px and have no serious axe findings', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of ['/conhecimento?q=xyzzy', '/pessoas', '/verbete/karl-marx', '/fontes']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const result = await new AxeBuilder({ page }).analyze();
    expect(
      result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    ).toEqual([]);
  }
  await page.goto('/verbete/karl-marx');
  await page.screenshot({ path: 'output/playwright/explorer-record-mobile.png', fullPage: true });
  await page.goto('/conhecimento');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('#conteudo')).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/pessoas');
  await page.screenshot({ path: 'output/playwright/explorer-people-desktop.png', fullPage: true });
});

test('missing and unavailable entries provide recovery without external return links', async ({
  page,
}) => {
  await page.goto('/pessoas?tipo=invalid');
  await expect(page.getByRole('heading', { name: 'Nenhum registro encontrado' })).toBeVisible();
  await page.goto('/verbete/karl-marx?origem=https://evil.test');
  await expect(page.getByRole('link', { name: 'Voltar aos resultados' })).toHaveCount(0);
  await page.evaluate(() => {
    history.pushState(null, '', '/verbete/registro-inexistente');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Registro não encontrado');
  await page
    .getByRole('main')
    .getByRole('link', { name: /^Acervo/ })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Conhecimento');
});
