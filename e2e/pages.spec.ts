import AxeBuilder from '@axe-core/playwright';

import { explorerCatalogues } from '../src/app/core/content/queries/knowledge-explorer';
import { expect, openReadingFixture, routeContentFixture, test } from './content-fixture';

const declaredDestinations = [
  '/',
  '/leitura/marxismo',
  '/leitura/liberalismo',
  '/leitura/social-democracia',
  '/leitura/anarquismo',
  '/grafos',
  ...explorerCatalogues.map((catalogue) => `/${catalogue.path}`),
];

test('unknown and unpublished institutional routes say so and keep the address', async ({
  page,
}) => {
  for (const path of ['/sobre', '/estudar', '/rota-inexistente']) {
    await page.goto('/');
    await page.evaluate((destination) => {
      history.pushState(null, '', destination);
      dispatchEvent(new PopStateEvent('popstate'));
    }, path);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página não encontrada');
    await expect(page.getByRole('link', { name: /^Início/ })).toBeVisible();
  }
});

test('old reading addresses redirect to the canonical /leitura path', async ({ page }) => {
  for (const slug of ['marxismo', 'liberalismo', 'social-democracia', 'anarquismo']) {
    await page.goto(`/${slug}`);
    await expect(page).toHaveURL(new RegExp(`/leitura/${slug}/?$`));
    await expect(page.locator('app-ideology-reading')).toBeVisible();
  }
});

test('home search opens the universal catalogue and the reading sheet stays available', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Procurar no acervo', { exact: true }).fill('liberalismo');
  await page.getByRole('button', { name: 'Pesquisar', exact: true }).click();
  await expect(page).toHaveURL(/\/acervo\?q=liberalismo$/);
  const results = page.getByRole('region', { name: 'Resultados da busca' });
  await expect(results).toBeVisible();
  await expect(results.getByRole('link').first()).toBeVisible();
  await expect(page.locator('#explorer-query')).toHaveValue('liberalismo');
  await page.goto('/');
  await page.getByRole('button', { name: /Leitura\s+Liberalismo/ }).click();
  const sheetLink = page.getByRole('link', { name: 'Ler o texto completo' });
  await expect(sheetLink).toHaveAttribute('href', '/leitura/liberalismo');
  await sheetLink.click();
  await expect(page).toHaveURL(/\/leitura\/liberalismo$/);
});

test('reading navigation includes the knowledge explorer', async ({ page }) => {
  for (const path of ['/', '/leitura/marxismo/', '/leitura/liberalismo/']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    const hrefs = await page.locator('a[href]').evaluateAll((links) =>
      links
        .map((a) => new URL(a.getAttribute('href')!, location.href))
        .filter((u) => u.origin === location.origin)
        .map((u) => u.pathname.replace(/\/$/, '') || '/'),
    );
    expect(
      hrefs.filter((p) => !declaredDestinations.includes(p) && !p.startsWith('/verbete/')),
    ).toEqual([]);
  }
});

test('Marxism chapters, comparison and sources remain on the same page', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/leitura/marxismo/');
  await expect(page.locator('.ideology-chapter')).toHaveCount(12);
  const chapters = page.getByRole('navigation', { name: 'Capítulos', exact: true });
  // Acts other than the current one are folded; opening Situar lists its chapters.
  await chapters.getByRole('link', { name: /^Situar/ }).click();
  await chapters.getByRole('link', { name: /Vozes que/ }).click();
  await expect(page).toHaveURL(/#pensadores$/);
  const author = page.locator('#pensadores').getByRole('button', { name: /Friedrich Engels/ });
  await author.click();
  await expect(page.getByRole('dialog')).toContainText('Friedrich Engels');
  await page.keyboard.press('Escape');
  await expect(author).toBeFocused();
  // The value debate is an optional deepening inside the concepts chapter.
  await page.getByText('Aprofundar: argumentos e respostas').click();
  await page
    .getByRole('button', { name: /Karl Marx.*Tempo de trabalho socialmente necessário/ })
    .click();
  await expect(page.locator('#argument-context')).toContainText(
    'Marx: tempo socialmente necessário',
  );
  await page.getByLabel('O tempo socialmente necessário', { exact: true }).check();
  await page.getByRole('button', { name: 'Conferir resposta' }).click();
  await page.getByRole('link', { name: 'Conferir fonte', exact: true }).click();
  await expect(page).toHaveURL(/\/leitura\/marxismo.*#fontes$/);
  await expect(
    page.getByRole('button', { name: /Karl Marx.*Tempo de trabalho socialmente necessário/ }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('gallery toggle hides and shows cards beyond the preview', async ({ page }) => {
  await page.goto('/leitura/marxismo/');
  const section = page.locator('#pensadores');
  const gallery = section.locator('.entity-gallery');
  const toggle = section.locator('.gallery-toggle');
  await toggle.scrollIntoViewIfNeeded();
  const visible = () => gallery.locator('button.record-card:visible').count();
  const total = Number((await toggle.textContent())?.match(/\d+/)?.[0]);
  expect(total).toBeGreaterThan(6);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(await visible()).toBe(6);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(await visible()).toBe(total);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(await visible()).toBe(6);
});

test('the four readings do not repeat an entity index above the graph', async ({ page }) => {
  for (const slug of ['marxismo', 'liberalismo', 'social-democracia', 'anarquismo']) {
    await page.goto(`/leitura/${slug}/`);
    await expect(page.locator('.index, #atlas-search')).toHaveCount(0);
    const graph = page.locator('app-knowledge-network').first();
    await expect(graph).toBeVisible();
    await expect(graph.locator('#graph-search')).toBeVisible();
    await expect(page.getByText('Busque um nome na barra do grafo').first()).toBeVisible();
  }
});

test('all four readings open one shared context sheet from the graph', async ({ page }) => {
  const readings = [
    ['marxismo', 'Friedrich Engels'],
    ['liberalismo', 'John Locke'],
    ['social-democracia', 'August Bebel'],
    ['anarquismo', 'Mikhail Bakunin'],
  ] as const;
  for (const [slug, name] of readings) {
    await page.goto(`/leitura/${slug}#conexoes`);
    const network = page.locator('#conexoes app-knowledge-network');
    await expect(network).toBeVisible();
    await network.locator('#graph-search').fill(name);
    await network.locator('#graph-search').press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('#knowledge-context-title')).toHaveText(name);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(network.locator('.node.is-selected')).toHaveCount(1);
  }
});

test('mobile: a graph node opens the shared context sheet without losing the selection', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/leitura/anarquismo#conexoes');
  const network = page.locator('#conexoes app-knowledge-network');
  await expect(network).toBeVisible();
  await network.locator('#graph-search').fill('Mikhail Bakunin');
  await network.locator('#graph-search').press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#knowledge-context-title')).toHaveText('Mikhail Bakunin');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(network.locator('.node.is-selected')).toHaveCount(1);
});

test('the chapter review explains its purpose and reveals the answer on demand', async ({
  page,
}) => {
  await routeContentFixture(page);
  await page.goto('/');
  await page.locator('.cover-choice[data-reading="marxismo"]').click();
  await page.getByRole('link', { name: 'Ler o texto completo' }).click();
  await expect(page).toHaveURL(/\/leitura\/marxismo\/?$/);
  const review = page.locator('.chapter-review').first();
  await review.scrollIntoViewIfNeeded();
  await expect(review.locator('.review-kicker')).toHaveText('Revisão');
  await expect(review.locator('.review-rationale')).toContainText('Distinga o nome comum');
  await expect(review.locator('.review-answer')).toHaveCount(0);
  await review.getByRole('button', { name: 'Mostrar resposta' }).click();
  await expect(review.locator('.review-answer')).toContainText('Unem a referência à obra');
  await expect(review.locator('.review-sources')).toBeVisible();
  await expect(review.getByRole('button', { name: 'Ocultar resposta' })).toBeVisible();
});

test('the reading ends with at most five curated connections', async ({ page }) => {
  await page.goto('/leitura/marxismo/');
  const connections = page.getByRole('navigation', { name: 'Conexões desta leitura' });
  await expect(connections).toBeVisible();
  await expect(connections.getByRole('link', { name: 'Liberalismo' })).toBeVisible();
  await expect(connections.getByRole('link', { name: 'Anarquismo' })).toBeVisible();
  await expect(connections.getByRole('link', { name: 'Social-democracia' })).toBeVisible();
  expect(await connections.getByRole('link').count()).toBeLessThanOrEqual(5);
});

test('a verbete with a continuous reading offers the contextual path', async ({ page }) => {
  await page.goto('/verbete/karl-marx/');
  await expect(
    page.getByRole('heading', { name: 'Este verbete tem contexto maior' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continuar em Marxismo' })).toHaveAttribute(
    'href',
    '/leitura/marxismo',
  );
  await expect(page.getByRole('link', { name: 'Voltar ao topo' })).toBeVisible();
});

test('a record without an image keeps its geometric illustration in the right column', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/verbete/burguesia');
  const text = page.locator('.hero-text');
  const art = page.locator('.hero-media--illustration app-geometric-illustration');
  await expect(art).toBeVisible();
  const [textBox, artBox] = await Promise.all([text.boundingBox(), art.boundingBox()]);
  expect(artBox!.x).toBeGreaterThanOrEqual(textBox!.x + textBox!.width);
  await page.setViewportSize({ width: 390, height: 844 });
  const [mobileTextBox, mobileArtBox] = await Promise.all([text.boundingBox(), art.boundingBox()]);
  expect(mobileArtBox!.y).toBeGreaterThan(mobileTextBox!.y);
  expect(Math.abs(mobileArtBox!.x - mobileTextBox!.x)).toBeLessThan(2);
});

test('three pages work on mobile with reduced motion and accessible links', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of ['/', '/leitura/marxismo/', '/leitura/liberalismo/']) {
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
    ['/leitura/marxismo/', 'introducao', 'origens'],
    ['/leitura/liberalismo/', 'introducao', 'origens'],
  ]) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    const chapterLinks = page.locator('app-ideology-reading-index .desktop-nav a:not(.index-act)');
    expect(await chapterLinks.count()).toBeGreaterThan(1);
    const chapterLink = page.locator(
      `app-ideology-reading-index .desktop-nav a[href="#${secondAnchor}"]`,
    );
    await expect(chapterLink).toHaveCount(1);
    await chapterLink.click();
    await expect(page).toHaveURL(new RegExp(`#${secondAnchor}$`));
    await expect(page.locator(`#${secondAnchor}`)).toBeFocused();
    await page.getByRole('button', { name: 'Voltar de onde veio' }).click();
    await expect(page).toHaveURL(new RegExp(`#${firstAnchor}$`));

    const motionControl = page.locator('app-ideology-reading-index .motion-control');
    // The index starts beside the first chapter and sticks once the reading reaches it.
    await page.evaluate(() =>
      window.scrollTo(0, document.getElementById('introducao')!.offsetTop + 400),
    );
    await expect(motionControl).toBeInViewport();
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
    await expect(chapterPicker.locator('option')).toHaveCount(12);
    await chapterPicker.selectOption(secondAnchor);
    await expect(chapterPicker).toHaveValue(secondAnchor);
    await expect(page.locator(`#${secondAnchor}`)).toBeFocused();
  }
});

test('shared reading preserves filters and clears motion preference when leaving', async ({
  page,
}) => {
  for (const [path, secondAnchor] of [
    ['/leitura/marxismo/', 'origens'],
    ['/leitura/liberalismo/', 'origens'],
  ]) {
    await page.goto(`${path}?bibliografia=Locke`);
    const reader = page.locator('app-ideology-reading');
    await expect(reader).toHaveCount(1);
    await reader.locator('.desktop-nav a:not(.index-act)').nth(1).click();
    await expect(page).toHaveURL(new RegExp(`bibliografia=Locke#${secondAnchor}$`));
    await expect(reader.locator('a[aria-current="location"]')).toHaveAttribute(
      'href',
      `#${secondAnchor}`,
    );
    await reader.getByRole('button', { name: 'Reduzir movimento' }).click();
    await expect(page.locator('html')).toHaveClass(/atlas-reduced-motion/);
    // Client-side navigation must destroy the old reader and its document-wide preference.
    await page
      .getByRole('navigation', { name: 'Breadcrumb' })
      .getByRole('link', { name: 'Início', exact: true })
      .click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('html')).not.toHaveClass(/atlas-reduced-motion/);
  }
});

test('both readings share the twelve canonical chapters, one index and no nested scroll', async ({
  page,
}) => {
  const canonical = [
    'introducao',
    'origens',
    'principios',
    'conceitos',
    'epocas',
    'pensadores',
    'vertentes',
    'experiencias',
    'debates',
    'conexoes',
    'leituras',
    'fontes',
  ];
  for (const path of ['/leitura/marxismo/', '/leitura/liberalismo/']) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${path}#correntes`);
    await expect(page).toHaveURL(/#vertentes$/);
    expect(
      await page.locator('article .ideology-chapter').evaluateAll((s) => s.map((e) => e.id)),
    ).toEqual(canonical);
    // Three acts; the sidebar lists the chapters of every act.
    await expect(page.locator('.desktop-nav .index-act')).toHaveCount(3);
    await expect(page.locator('.desktop-nav a:not(.index-act)')).toHaveCount(12);
    const nested = await page.evaluate(() =>
      [...document.querySelectorAll('.chapter-sequence *')]
        .filter(
          (e) =>
            /(auto|scroll)/.test(getComputedStyle(e).overflowY) &&
            e.scrollHeight > e.clientHeight + 5 &&
            // A labelled, focusable scroll region (the era chart) is deliberate, not a trap.
            !(e.getAttribute('role') === 'region' && e.getAttribute('tabindex') === '0'),
        )
        .map((e) => e.className),
    );
    expect(nested).toEqual([]);
  }
});

test('the connections chapter draws the tradition as a graph scoped to its atlas', async ({
  page,
}) => {
  await page.goto('/leitura/marxismo#conexoes');
  const network = page.locator('#conexoes app-knowledge-network');
  await expect(network).toBeVisible();
  const nodes = network.locator('[data-node]');
  await expect(nodes.first()).toBeVisible();
  const count = await nodes.count();
  expect(count).toBeGreaterThan(40);
  await expect(network.locator('#graph-status')).toContainText(`${count} de`);
  // The tradition's own record is part of the cut and opens selected.
  await expect(network.locator('[data-node="ideology-marxism"]')).toHaveCount(1);
  await expect(network.locator('.node.is-selected')).toHaveCount(1);
  await expect(network.locator('.node__selection')).toHaveCount(1);
  await expect(network.locator('.zoom__level')).toHaveText('100%');
  await expect(network.locator('.detail')).toHaveCount(0);
  await network.locator('#graph-search').fill('Friedrich Engels');
  await network.locator('#graph-search').press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Friedrich Engels' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#knowledge-context-title')).toHaveText('Friedrich Engels');
  await expect(network.locator('.node.is-selected')).toHaveCount(1);
  await expect(network.locator('.node__selection')).toHaveCount(1);
  await expect(network.locator('.label.is-selected')).toContainText('Friedrich Engels');
  // A selection marks the node; it must not erase the rest of the map.
  await expect(network.locator('.node.is-dimmed')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  const selection = network.locator('.selection-pill');
  await expect(selection).toContainText('Selecionado');
  await expect(selection).toContainText('Friedrich Engels');
  await expect(selection.getByRole('link', { name: /Verbete/ })).toHaveAttribute(
    'href',
    /\/verbete\//,
  );
  await selection.getByRole('button', { name: 'Ver ficha' }).click();
  const reopened = page.getByRole('dialog', { name: 'Friedrich Engels' });
  await expect(reopened).toBeVisible();
  await expect(reopened.locator('#knowledge-context-title')).toBeFocused();
});

test('each image appears once in the narrative; only the archive catalogue repeats', async ({
  page,
}) => {
  for (const path of ['/leitura/marxismo/', '/leitura/liberalismo/']) {
    await page.goto(path);
    const sources = await page
      .locator('.chapter-sequence .ideology-chapter:not(#conexoes) img')
      .evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).src));
    expect(sources.length).toBeGreaterThan(5);
    expect(new Set(sources).size).toBe(sources.length);
  }
});

test('épocas list dated records and the relations explain each kind of connection', async ({
  page,
}) => {
  for (const slug of ['marxismo', 'liberalismo']) {
    await openReadingFixture(page, slug);
    const era = page.locator('.era-chart').first();
    await expect(era.locator('.epoch-row').first()).toBeVisible();
    await expect(era.locator('.era-epoch.is-selected .marker-note').first()).toContainText(
      'Por que importa',
    );
    await era.locator('.era-epoch .epoch-row').nth(1).click();
    await expect(era.locator('.era-epoch.is-selected .epoch-summary')).toBeVisible();
    await expect(era.locator('.era-epoch.is-selected .alive-list').first()).toBeVisible();
    await era.getByRole('button', { name: /^Pessoas/ }).click();
    await expect(era.locator('.era-filter[aria-pressed="true"]')).toContainText('Pessoas');

    const relations = page.locator('.relations').first();
    await expect(relations.locator('.relation-legend li').first()).toBeVisible();
    await expect(relations.locator('.relation-sentence').first()).toContainText(/\S/);
    await expect(relations.locator('.relation-chip').first()).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  }
});

test('opening an epoch animates the collapse without moving the page', async ({ page }) => {
  await page.goto('/leitura/marxismo/');
  const era = page.locator('.era-chart').first();
  const rows = era.locator('.epoch-row');
  await expect(rows.nth(1)).toBeVisible();
  const before = await page.evaluate(() => Math.round(scrollY));
  await page.evaluate(() =>
    document.querySelectorAll<HTMLButtonElement>('app-era-chart .epoch-row')[1].click(),
  );
  await expect(rows.nth(1)).toHaveAttribute('aria-expanded', 'true');
  await page.waitForTimeout(60);
  await expect(era.locator('.epoch-body.is-leaving')).toHaveCount(1);
  expect(await page.evaluate(() => Math.round(scrollY))).toBe(before);
  await expect(era.locator('.epoch-body.is-leaving')).toHaveCount(0, { timeout: 1000 });
  await expect(era.locator('.epoch-body')).toHaveCount(1);
  await expect(era.locator('.epoch-body')).toHaveAttribute('id', /^epoch-/);
});

test('reading roadmap shows a first step and expands works in place', async ({ page }) => {
  for (const path of ['/leitura/marxismo/', '/leitura/liberalismo/']) {
    await page.goto(path);
    const roadmap = page.locator('#leituras app-reading-path');
    await expect(roadmap.locator('.first-step')).toHaveCount(1);
    const first = roadmap.locator('.work-toggle').first();
    await first.focus();
    await page.keyboard.press('Enter');
    await expect(first).toHaveAttribute('aria-expanded', 'true');
    await expect(roadmap.locator('.work-detail:visible')).toHaveCount(1);
    const theme = roadmap.locator('.quick-themes button').first();
    await theme.click();
    await expect(theme).toHaveAttribute('aria-pressed', 'true');
    expect(await roadmap.locator('.work.is-dimmed').count()).toBeGreaterThan(0);
    const total = await roadmap.locator('.work').count();
    await expect(roadmap.locator('.filter-count')).toContainText(`de ${total} obras em destaque`);
    await roadmap.locator('.theme-all').click();
    await expect(roadmap.locator('.theme-all')).toHaveAttribute('aria-pressed', 'true');
    await expect(roadmap.locator('.work.is-dimmed')).toHaveCount(0);
  }
});

test('theme chips separate selected, available and hover states', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/leitura/marxismo/');
  const roadmap = page.locator('#leituras app-reading-path');
  const active = roadmap.locator('.theme-all');
  const available = roadmap.locator('.quick-themes button').first();

  await expect(active).toHaveAttribute('aria-pressed', 'true');
  await expect(available).toHaveAttribute('aria-pressed', 'false');
  const activeBackground = await active.evaluate((el) => getComputedStyle(el).backgroundColor);
  const availableBackground = await available.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  expect(activeBackground).not.toBe(availableBackground);

  await available.hover();
  await expect
    .poll(() => available.evaluate((el) => getComputedStyle(el).backgroundColor))
    .not.toBe(availableBackground);

  await available.click();
  await expect(available).toHaveAttribute('aria-pressed', 'true');
  await expect(active).toHaveAttribute('aria-pressed', 'false');
  await expect(roadmap.locator('.filter-count')).toContainText('Economia');

  const dimmed = roadmap.locator('.work.is-dimmed').first();
  await dimmed.locator('.work-toggle').focus();
  await expect.poll(() => dimmed.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
});

test('theme filter uses the compact select in all four readings', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const slug of ['marxismo', 'liberalismo', 'social-democracia', 'anarquismo']) {
    await page.goto(`/leitura/${slug}/`);
    const roadmap = page.locator('#leituras app-reading-path');
    const total = await roadmap.locator('.work').count();
    const select = roadmap.locator('select');

    await expect(select).toBeVisible();
    await expect(roadmap.locator('.quick-themes')).toBeHidden();
    await expect(roadmap.locator('.filter-count')).toContainText(`${total} obras`);

    await select.selectOption({ index: 1 });
    expect(await select.inputValue()).not.toBe('');
    await expect(roadmap.locator('.filter-count')).toContainText('obras em destaque');
    await expect(roadmap.locator('.filter-count')).toContainText(`de ${total}`);
    expect(await roadmap.locator('.work.is-dimmed').count()).toBeGreaterThan(0);
    expect(await roadmap.locator('.work').count()).toBe(total);
    await expect(roadmap.locator('.theme-all')).toHaveAttribute('aria-pressed', 'false');

    await roadmap.locator('.theme-all').click();
    await expect(roadmap.locator('.work.is-dimmed')).toHaveCount(0);
    await expect(select).toHaveValue('');
    await expect(roadmap.locator('.theme-all')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('home keeps the poster colour and tints each later section as it scrolls', async ({
  page,
}) => {
  await page.goto('/');
  const home = page.locator('app-home-page');
  await expect(home).toHaveAttribute('data-tone', '0');
  await page.locator('.readings').scrollIntoViewIfNeeded();
  await expect(home).toHaveAttribute('data-tone', '3');
  await expect(home).not.toHaveAttribute('data-tone', '0');
});

test('reading prose keeps a measure of about 72 characters on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const path of ['/leitura/marxismo/', '/leitura/liberalismo/']) {
    await page.goto(path);
    // Characters per line, measured as the box width over the width of "0" in the paragraph's font.
    const measures = await page.evaluate(() =>
      [...document.querySelectorAll('.chapter-narrative > p')].map((el) => {
        const probe = document.createElement('span');
        probe.style.font = getComputedStyle(el).font;
        probe.style.position = 'absolute';
        probe.style.visibility = 'hidden';
        probe.style.whiteSpace = 'nowrap';
        probe.textContent = '0'.repeat(100);
        el.append(probe);
        const zero = probe.getBoundingClientRect().width / 100;
        probe.remove();
        return {
          id: el.closest('.ideology-chapter')?.id ?? '',
          chars: el.getBoundingClientRect().width / zero,
        };
      }),
    );
    expect(measures.length).toBeGreaterThan(10);
    for (const { id, chars } of measures) expect(chars, id).toBeLessThanOrEqual(78);
  }
});

test('retired /comparar redirects to the archive search and /grafo and /rede to /grafos', async ({
  page,
}) => {
  await page.goto('/comparar?esquerda=person-karl-marx');
  await expect(page).toHaveURL(/\/acervo/);
  await page.goto('/grafo');
  await expect(page).toHaveURL(/\/grafos$/);
  await page.goto('/rede');
  await expect(page).toHaveURL(/\/grafos$/);
});

test('/fontes paginates and a source anchor opens the page that holds it', async ({ page }) => {
  await page.goto('/fontes');
  const rows = page.locator('.source-row');
  await expect(rows).toHaveCount(24);
  const pager = page.getByRole('navigation', { name: 'Paginação do acervo' }).first();
  await expect(pager).toBeVisible();
  await pager.getByRole('link', { name: /Próxima/ }).click();
  await expect(page).toHaveURL(/pagina=2/);
  const id = await rows.first().getAttribute('id');
  expect(id).toBeTruthy();
  await page.goto(`/fontes#${id}`);
  await expect(page).toHaveURL(/pagina=2/);
  await expect(page.locator(`#${id}`)).toBeInViewport();
});

test('paging and switching the record type keep the place without flashing the top', async ({
  page,
}) => {
  await page.goto('/acervo');
  await expect(page.locator('.result-card')).toHaveCount(24);
  await page.evaluate(() => window.scrollTo(0, 700));
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(600);

  const recordFrames = async (action: () => Promise<void>) => {
    await page.evaluate(() => {
      const trace: number[] = [];
      Object.assign(window, { atlasTrace: trace, atlasRecording: true });
      const tick = () => {
        trace.push(Math.round(window.scrollY));
        if ((window as unknown as { atlasRecording: boolean }).atlasRecording)
          requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await action();
    await page.waitForTimeout(500);
    return page.evaluate(() => {
      const data = window as unknown as { atlasTrace: number[]; atlasRecording: boolean };
      data.atlasRecording = false;
      return Math.min(...data.atlasTrace);
    });
  };

  const afterPage = await recordFrames(() =>
    page.evaluate(() =>
      (document.querySelector('.pager__link[rel="next"]') as HTMLAnchorElement).click(),
    ),
  );
  await expect(page).toHaveURL(/pagina=2/);
  expect(afterPage).toBeGreaterThan(200);

  const afterType = await recordFrames(() =>
    page.evaluate(() =>
      (
        [...document.querySelectorAll('.kind-filter__item')].find((item) =>
          item.textContent?.startsWith('Pessoa '),
        ) as HTMLAnchorElement
      ).click(),
    ),
  );
  await expect(page).toHaveURL(/tipo=pessoa/);
  expect(afterType).toBeGreaterThan(200);
});

test('debates show estimated positions with their evidence, in words and not only colour', async ({
  page,
}) => {
  await page.goto('/leitura/marxismo/');
  const positions = page.locator('#debates section.positions');
  await expect(positions).toBeVisible();
  await expect(positions.getByRole('heading', { name: 'Posições estimadas' })).toBeVisible();
  const contrast = positions.locator('.contrast');
  await expect(contrast).toContainText('Método de mudança social');
  await expect(contrast.locator('.compare-head strong')).toHaveCount(2);
  await expect(contrast.locator('.compare-row .track')).toHaveCount(2);
  await expect(contrast).not.toContainText('diferença de');
  await expect(positions).toContainText('Não são fatos históricos');
  await contrast.locator('.compare-open').nth(1).click();
  await expect(positions.locator('.carousel-count')).not.toHaveText(/^\s*1[–-]/);

  const bernstein = positions
    .locator('article.entity')
    .filter({ has: page.getByRole('heading', { name: 'Eduard Bernstein', exact: true }) });
  await expect(bernstein.locator('.status-chip').first()).toContainText('Estimada · 2 fontes');
  await expect(bernstein.locator('.track').first()).toHaveAttribute(
    'aria-label',
    /Eduard Bernstein, Método de mudança social: Estimada · 2 fontes/,
  );
  await expect(bernstein.locator('.axis-panel .marker')).toHaveCount(1);
});

test('estimated positions show their claims and open the entity record in place', async ({
  page,
}) => {
  await page.goto('/leitura/marxismo/');
  const bernstein = page
    .locator('#debates section.positions article.entity')
    .filter({ has: page.getByRole('heading', { name: 'Eduard Bernstein', exact: true }) });
  const claims = bernstein.locator('.axis-panel .claims');
  await claims.locator('summary').click();
  await expect(claims).toContainText('movimento significa tudo');
  await expect(claims).toContainText('Evolutionary Socialism');
  await expect(claims.locator('a').first()).toHaveAttribute('href', /^https?:/);
  await expect(bernstein.locator('.hidden-axes summary')).toContainText('Eixos sem evidência (4)');
  await bernstein.getByRole('button', { name: 'Ver ficha de Eduard Bernstein' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('positions distinguish divergence, indicative evidence and missing evidence', async ({
  page,
}) => {
  await page.goto('/leitura/marxismo/');
  const positions = page.locator('#debates section.positions');
  const card = (title: string) =>
    positions
      .locator('article.entity')
      .filter({ has: page.getByRole('heading', { name: title, exact: true }) });

  const marx = card('Karl Marx');
  await expect(marx.locator('.axis-chip[aria-pressed="true"]')).toContainText('Limites do Estado');
  await expect(marx.locator('.axis-panel')).toHaveAttribute('data-status', 'divergente');
  await expect(marx.locator('.axis-panel .end')).toHaveCount(2);
  await expect(marx.locator('.axis-panel .marker')).toHaveCount(0);
  await expect(marx.locator('.status-chip')).toContainText('Divergente · 2 fontes');

  const lenin = card('Lenin');
  await expect(lenin.locator('.status-chip')).toContainText('Indicativa · 1 afirmação');
  await expect(lenin.locator('.axis-panel')).toHaveAttribute('data-status', 'indicativa');

  const mao = card('Mao Tsé-Tung');
  await expect(mao.locator('.hidden-axes summary')).toContainText('Eixos sem evidência (5)');
});

test('chapter jumps enter the history and Back returns to the previous chapter', async ({
  page,
}) => {
  await page.goto('/leitura/marxismo');
  await expect(page.locator('app-ideology-reading')).toBeVisible();
  // Pick two chapters from the same act: opening the first collapses the other acts.
  const pair = await page.evaluate(() => {
    const nav = document.querySelector('app-ideology-reading .desktop-nav');
    if (!nav) return null;
    const groups: string[][] = [];
    let current: string[] | null = null;
    for (const child of nav.children) {
      if (child.classList.contains('index-act')) {
        current = [];
        groups.push(current);
      } else if (current && child.matches('a')) {
        const href = child.getAttribute('href');
        if (href) current.push(href);
      }
    }
    return groups.find((group) => group.length > 1)?.slice(0, 2) ?? null;
  });
  expect(pair).not.toBeNull();
  const [first, second] = pair!;
  await page
    .locator(`app-ideology-reading .desktop-nav a:not(.index-act)[href="${first}"]`)
    .click();
  await expect(page).toHaveURL(new RegExp(`${first}$`));
  await page
    .locator(`app-ideology-reading .desktop-nav a:not(.index-act)[href="${second}"]`)
    .click();
  await expect(page).toHaveURL(new RegExp(`${second}$`));
  await expect(
    page.locator(`app-ideology-reading .desktop-nav a:not(.index-act)[href="${first}"]`),
  ).not.toHaveAttribute('aria-current');
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${first}$`));
  await expect(
    page.locator(`app-ideology-reading .desktop-nav a:not(.index-act)[href="${first}"]`),
  ).toHaveAttribute('aria-current', 'location');
});
