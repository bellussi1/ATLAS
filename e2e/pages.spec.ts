import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { explorerCatalogues } from '../src/app/core/content/queries/knowledge-explorer';

const declaredDestinations = [
  '/',
  '/marxismo',
  '/liberalismo',
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
    await expect(page.getByRole('link', { name: 'Início', exact: true })).toBeVisible();
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
      .getByRole('link')
      .filter({ has: page.locator('strong', { hasText: /^Liberalismo$/ }) }),
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
      hrefs.filter((p) => !declaredDestinations.includes(p) && !p.startsWith('/verbete/')),
    ).toEqual([]);
  }
});

test('Marxism chapters, comparison and sources remain on the same page', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/marxismo/');
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
    const chapterLinks = page.locator('app-ideology-reading-index .desktop-nav a:not(.index-act)');
    expect(await chapterLinks.count()).toBeGreaterThan(1);
    await chapterLinks.nth(1).click();
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
    await chapterPicker.selectOption(secondAnchor);
    await expect(page).toHaveURL(new RegExp(`#${secondAnchor}$`));
    await expect(page.locator(`#${secondAnchor}`)).toBeFocused();
    await page.getByRole('button', { name: 'Voltar de onde veio' }).click();
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
  for (const path of ['/marxismo/', '/liberalismo/']) {
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

test('each image appears once in the narrative; only the archive catalogue repeats', async ({
  page,
}) => {
  for (const path of ['/marxismo/', '/liberalismo/']) {
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
  for (const path of ['/marxismo/', '/liberalismo/']) {
    await page.goto(`${path}`);
    const era = page.locator('.era-chart').first();
    await expect(era.locator('.dated-list li').first()).toBeVisible();
    await era.locator('.epoch-picker button.carousel-item').nth(1).click();
    await expect(era.locator('.epoch-detail h5').first()).toContainText('Registros datados');

    const relations = page.locator('.relations').first();
    await expect(relations.locator('.relation-legend li').first()).toBeVisible();
    await expect(relations.locator('.relation-sentence').first()).toContainText(/\S/);
    await expect(relations.locator('.relation-chip').first()).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  }
});

test('reading roadmap shows a first step and expands works in place', async ({ page }) => {
  for (const path of ['/marxismo/', '/liberalismo/']) {
    await page.goto(path);
    const roadmap = page.locator('#leituras app-reading-path');
    await expect(roadmap.locator('.first-step')).toHaveCount(1);
    const first = roadmap.locator('.work-toggle').first();
    await first.focus();
    await page.keyboard.press('Enter');
    await expect(first).toHaveAttribute('aria-expanded', 'true');
    await expect(roadmap.locator('.work-detail:visible')).toHaveCount(1);
    await roadmap.locator('.theme-filter button').first().click();
    expect(await roadmap.locator('.work.is-dimmed').count()).toBeGreaterThan(0);
    const total = await roadmap.locator('.work').count();
    await expect(roadmap.locator('.filter-count')).not.toContainText(`${total} de ${total}`);
  }
});

test('home keeps the poster colour and tints each later section as it scrolls', async ({
  page,
}) => {
  await page.goto('/');
  const home = page.locator('app-home-page');
  await expect(home).toHaveAttribute('data-tone', '0');
  await page.locator('.readings').scrollIntoViewIfNeeded();
  await expect(home).toHaveAttribute('data-tone', '2');
  await expect(home).not.toHaveAttribute('data-tone', '0');
});

test('reading prose keeps a measure of about 72 characters on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const path of ['/marxismo/', '/liberalismo/']) {
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

test('retired /rede and /comparar redirect to the archive search', async ({ page }) => {
  for (const path of ['/rede', '/comparar?esquerda=person-karl-marx']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/conhecimento/);
  }
});

test('debates show estimated positions with their evidence, in words and not only colour', async ({
  page,
}) => {
  await page.goto('/marxismo/');
  const positions = page.locator('#debates section.positions');
  await expect(positions).toBeVisible();
  await expect(positions.getByRole('heading', { name: 'Posições estimadas' })).toBeVisible();
  await expect(positions.locator('[data-status="estimada"]').first()).toContainText(
    'estimada em 0,76',
  );
  await expect(positions).toContainText('Não são fatos históricos');
  await expect(positions.locator('[data-status="estimada"] [role="img"]').first()).toHaveAttribute(
    'aria-label',
    /Eduard Bernstein, Método de mudança social: estimada em 0,76/,
  );
});

test('estimated positions show their claims and open the entity record in place', async ({
  page,
}) => {
  await page.goto('/marxismo/');
  const bernstein = page.locator('#debates section.positions article.entity').filter({
    hasText: 'Eduard Bernstein',
  });
  const revolution = bernstein.locator('li').filter({ hasText: 'Método de mudança social' });
  await revolution.locator('.claims summary').click();
  await expect(revolution).toContainText('movimento significa tudo');
  await expect(revolution).toContainText('Evolutionary Socialism');
  await expect(bernstein.locator('.hidden-axes summary')).toContainText('Sem evidência em 4 eixos');
  await bernstein.getByRole('button', { name: /Eduard Bernstein/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('chapter jumps enter the history and Back returns to the previous chapter', async ({
  page,
}) => {
  await page.goto('/marxismo');
  const index = page.locator('app-ideology-reading .desktop-nav a:not(.index-act)');
  await index.nth(1).click();
  await expect(page).toHaveURL(/#.+/);
  const second = new URL(page.url()).hash;
  await index.nth(2).click();
  await expect(
    page.locator(`app-ideology-reading .desktop-nav a:not(.index-act)[href="${second}"]`),
  ).not.toHaveAttribute('aria-current');
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${second.replace('#', '#')}$`));
  await expect(
    page.locator(`app-ideology-reading .desktop-nav a:not(.index-act)[href="${second}"]`),
  ).toHaveAttribute('aria-current', 'location');
});
