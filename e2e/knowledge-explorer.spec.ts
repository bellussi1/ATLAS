import { readFile } from 'node:fs/promises';

import { auditPage } from './accessibility';
import { expect, test } from './content-fixture';

test('a connection keeps the search origin so the results stay one step away', async ({ page }) => {
  await page.goto('/verbete/karl-marx?origem=%2Fentidades%3Fq%3DMarx');
  await expect(page).toHaveURL(/origem=/);
  const group = page
    .locator('.connection-group')
    .filter({ has: page.locator('a.relation-party') })
    .first();
  if (!(await group.evaluate((details: HTMLDetailsElement) => details.open)))
    await group.locator('summary').click();
  const connection = group.locator('a.relation-party').first();
  await connection.click();
  await expect(page).toHaveURL(/origem=/);
  await expect(page.getByRole('link', { name: 'Voltar aos resultados' })).toHaveAttribute(
    'href',
    /\/entidades\?q=Marx/,
  );
});

test('search returns names instead of every passage that mentions them', async ({ page }) => {
  await page.goto('/acervo?q=lula');
  const results = page.getByRole('region', { name: 'Resultados da busca' });
  await expect(
    results.getByRole('link').filter({ hasText: 'Luiz Inácio Lula da Silva' }).first(),
  ).toBeVisible();
  await expect(
    results.getByRole('link').filter({ hasText: 'Partido dos Trabalhadores' }),
  ).toHaveCount(0);
  await expect(page.locator('.notice')).toHaveCount(0);
});

test('universal search starts at home, handles aliases and keeps filters through a permanent page', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Procurar no acervo', { exact: true }).fill('guimaraes silveira');
  await page.getByRole('button', { name: 'Pesquisar', exact: true }).click();
  await expect(page).toHaveURL(/acervo\?q=guimaraes/);
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
    'https://atlas-bellussi.pages.dev/verbete/ulysses-guimaraes/',
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
  await expect(page).toHaveURL(/\/fontes(\?pagina=\d+)?#source-/);
  await expect(page.locator(new URL(page.url()).hash)).toBeVisible();
});

test('contextual exploration opens the matching permanent entity page', async ({ page }) => {
  await page.goto('/leitura/marxismo');
  await page.locator('#conceitos .knowledge-term').first().click();
  const dialog = page.getByRole('dialog');
  const title = (await dialog.locator('h2').textContent())!.trim();
  await dialog.getByRole('link', { name: /Abrir o verbete de/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  await expect(page).toHaveURL(/\/verbete\//);
});

test('book records offer a direct Amazon link and other works do not', async ({ page }) => {
  await page.goto('/verbete/o-capital/');
  const buy = page.getByRole('link', { name: 'Comprar na Amazon' });
  await expect(buy).toHaveAttribute('href', /^https:\/\/www\.amazon\.com\.br\/s\?/);
  await expect(buy).toHaveAttribute('href', /i=stripbooks/);
  await expect(buy).toHaveAttribute('target', '_blank');
  expect(await buy.getAttribute('rel')).toContain('noopener');

  await page.goto('/verbete/futebol/');
  await expect(page.getByRole('link', { name: 'Comprar na Amazon' })).toHaveCount(0);
});

test('a record opens the graph with its node selected and the URL restores it', async ({
  page,
}) => {
  await page.goto('/verbete/karl-marx/');
  await page.getByRole('link', { name: 'Ver no grafo' }).click();
  await expect(page).toHaveURL(/\/grafos\?no=person-karl-marx/);
  await expect(page.locator('.detail')).toContainText('Karl Marx');

  await page.goto('/grafos?no=person-karl-marx');
  await expect(page.locator('.detail')).toContainText('Karl Marx');
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
  // Same public origin as `scripts/seo.mjs` and `src/app/core/routing/site-url.ts`.
  const site = (process.env['ATLAS_SITE_URL'] || 'https://atlas-bellussi.pages.dev').replace(
    /\/+$/,
    '',
  );
  const index = (await asset(manifest.search.sha256)) as {
    path: string;
    title: string;
    fragment?: string;
  }[];
  const readingPaths = [
    '/leitura/marxismo',
    '/leitura/liberalismo',
    '/leitura/social-democracia',
    '/leitura/anarquismo',
  ];
  // Releases published before the /leitura prefix keep old reading paths in the search index;
  // the reading route redirects them, so the prerendered target is the canonical one.
  const legacyReadings = new Map([
    ['/marxismo', '/leitura/marxismo'],
    ['/liberalismo', '/leitura/liberalismo'],
    ['/social-democracia', '/leitura/social-democracia'],
    ['/anarquismo', '/leitura/anarquismo'],
  ]);
  for (const entry of index) {
    const target = legacyReadings.get(entry.path) ?? entry.path;
    const response = await request.get(target);
    expect(response.ok(), target).toBe(true);
    const html = await response.text();
    const pageTitle = readingPaths.includes(target)
      ? `${entry.title}: ideias e divergências`
      : target === '/fontes'
        ? 'Fontes'
        : entry.title;
    const title = pageTitle
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
    expect(html.match(/<title>(.*?)<\/title>/)?.[1], target).toBe(title + ' — ATLAS');
    expect(html.match(/property="og:title" content="([^"]*)"/)?.[1], target).toBe(
      title + ' — ATLAS',
    );
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    // The Pages host serves directory routes with a trailing slash; the canonical follows it.
    const canonicalTarget = target === '/' ? '/' : `${target.replace(/\/+$/, '')}/`;
    expect(canonical, target).toBe(site + canonicalTarget);
    if (entry.fragment && target !== '/fontes')
      expect(html).toContain('id="' + entry.fragment + '"');
    // Sources are paginated: page 1 carries the pager and its own anchors; later anchors are
    // resolved in the browser by /fontes, as covered in pages.spec.ts.
    if (target === '/fontes') expect(html).toContain('Paginação do acervo');
  }
});

for (const path of ['/acervo?q=xyzzy', '/pessoas', '/verbete/karl-marx', '/fontes']) {
  test(`${path} reflows at 320px and has no serious axe findings`, async ({ page }) => {
    test.setTimeout(path === '/fontes' ? 90_000 : 30_000);
    await page.setViewportSize({ width: 320, height: 740 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const violations = await auditPage(page);
    expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });
}

test('the catalogue skip link focuses its content on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/acervo');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('#conteudo')).toBeFocused();
});

test('missing and unavailable entries provide recovery without external return links', async ({
  page,
}) => {
  await page.goto('/pessoas?tipo=invalid');
  await expect(page.getByRole('heading', { name: 'Nenhum registro encontrado' })).toBeVisible();
  await page.goto('/verbete/karl-marx?origem=https://evil.test');
  await expect(page.getByRole('link', { name: 'Voltar aos resultados' })).toHaveCount(0);
  await page.goto('/acervo');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Acervo');
  await page
    .getByRole('main')
    .getByRole('link', { name: /^Acervo/ })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Acervo');
});
