import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('home exposes direct network and comparison entry points on desktop and mobile', async ({
  page,
}) => {
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const tools = page.getByRole('navigation', { name: 'Ferramentas de exploração' });
    await tools.getByRole('link', { name: 'Explorar a rede', exact: true }).click();
    await expect(page).toHaveURL(/\/rede\/?$/);
    await expect(page.getByRole('searchbox', { name: 'Encontrar registro' })).toBeVisible();
    await page.goBack();
    await tools.getByRole('link', { name: 'Comparar registros', exact: true }).click();
    await expect(page).toHaveURL(/\/comparar\/?$/);
    await expect(
      page.getByRole('combobox', { name: 'Primeiro registro', exact: true }),
    ).toBeVisible();
  }
});

test('network focus changes keep the canvas and page stable, with immediate keyboard and reduced-motion selection', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/rede?colecao=atlas-marx-valor');
  const smith = page.locator('g[data-node="person-adam-smith"]');
  const marx = page.locator('g[data-node="person-karl-marx"]');
  const canvas = page.getByRole('group', { name: 'Rede de entidades' });
  await smith.scrollIntoViewIfNeeded();
  const before = await canvas.boundingBox();
  const scroll = await page.evaluate(() => scrollY);
  await page.locator('.selection').evaluate((panel) => {
    panel.scrollTop = 180;
  });
  await smith.click();
  await expect(smith).toHaveAttribute('aria-pressed', 'true');
  expect((await canvas.boundingBox())!.height).toBeCloseTo(before!.height, 0);
  expect(Math.abs((await page.evaluate(() => scrollY)) - scroll)).toBeLessThanOrEqual(2);
  expect(await smith.evaluate((node) => getComputedStyle(node).transitionProperty)).toContain(
    'transform',
  );
  await expect.poll(() => page.locator('.selection').evaluate((panel) => panel.scrollTop)).toBe(0);
  await marx.focus();
  await marx.press('Enter');
  await expect(marx).toHaveAttribute('aria-pressed', 'true');
  await expect(marx).toBeFocused();
  expect(
    await marx.evaluate((node) =>
      Math.max(
        ...getComputedStyle(node)
          .transitionDuration.split(',')
          .map((value) => parseFloat(value)),
      ),
    ),
  ).toBeLessThanOrEqual(0.001);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await smith.click();
  await expect(smith).toHaveAttribute('aria-pressed', 'true');
  expect(
    await smith.evaluate((node) =>
      Math.max(
        ...getComputedStyle(node)
          .transitionDuration.split(',')
          .map((value) => parseFloat(value)),
      ),
    ),
  ).toBeLessThanOrEqual(0.001);
});

test('network search and connections provide a usable mobile path without the diagram', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/rede');
  const search = page.getByRole('searchbox', { name: 'Encontrar registro' });
  await search.fill('locke');
  await page
    .getByRole('list', { name: 'Resultados na rede' })
    .getByRole('button', { name: 'John Locke', exact: true })
    .click();
  await expect(
    page
      .getByRole('region', { name: 'Registro selecionado' })
      .getByRole('heading', { name: 'John Locke', exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/no=person-john-locke/);
  await expect(search).toHaveValue('locke');
  await search.fill('registro inexistente');
  await expect(page.getByRole('status').filter({ hasText: 'registros encontrados' })).toHaveText(
    '0 registros encontrados neste recorte.',
  );
  await search.fill('');
  const connection = page.locator('.connection > button').first();
  const title = await connection.textContent();
  await connection.click();
  await expect(page.locator('.selection h2')).toHaveText(title!.trim());
  await expect(page.locator('.network-visual')).not.toBeVisible();
});

test('comparison prioritizes the pair, swaps sides and keeps the chosen scope and evidence reachable', async ({
  page,
}) => {
  await page.goto(
    '/comparar?colecao=atlas-marx-valor&esquerda=person-karl-marx&direita=person-adam-smith',
  );
  await page.getByRole('button', { name: 'Inverter registros' }).click();
  await expect(page.getByRole('combobox', { name: 'Primeiro registro', exact: true })).toHaveValue(
    'person-adam-smith',
  );
  await expect(page.getByRole('combobox', { name: 'Segundo registro', exact: true })).toHaveValue(
    'person-karl-marx',
  );
  await expect(page).toHaveURL(/colecao=atlas-marx-valor/);
  await page.goBack();
  await expect(page.getByRole('combobox', { name: 'Primeiro registro', exact: true })).toHaveValue(
    'person-karl-marx',
  );
  const references = page
    .locator('.comparison > article')
    .first()
    .getByText('Conferir afirmações e referências', { exact: true });
  await references.click();
  await expect(
    page.locator('.comparison > article').first().getByText('Stanford', { exact: false }).first(),
  ).toBeVisible();
});

test('network uses compiled coordinates, keeps its axis and shares filters with comparison', async ({
  page,
}) => {
  await page.goto('/rede?colecao=atlas-marx-valor&no=person-karl-marx');
  await expect(page.getByRole('combobox', { name: 'Coleção', exact: true })).toHaveValue(
    'atlas-marx-valor',
  );
  const node = page.locator('g[data-node="person-adam-smith"]');
  const position = await node.getAttribute('transform');
  const axis = await page.locator('.axis').textContent();
  await expect(page.getByRole('region', { name: 'Registro selecionado' })).toContainText(
    'Karl Marx',
  );
  await expect(page.locator('.selection')).toContainText('Procedência:');
  await page
    .getByRole('combobox', { name: 'Tipo de entidade', exact: true })
    .selectOption('person');
  await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
  await expect(page).toHaveURL(/tipo=person/);
  await expect(node).toHaveAttribute('transform', position!);
  await expect(page.locator('.axis')).toHaveText(axis!);
  await page
    .getByRole('navigation', { name: 'Modos de exploração' })
    .getByRole('link', { name: 'Comparadores' })
    .click();
  await expect(page).toHaveURL(/comparar.*tipo=person/);
  await expect(page.getByRole('combobox', { name: 'Coleção', exact: true })).toHaveValue(
    'atlas-marx-valor',
  );
  await page
    .getByRole('combobox', { name: 'Primeiro registro', exact: true })
    .selectOption('person-karl-marx');
  await page
    .getByRole('combobox', { name: 'Segundo registro', exact: true })
    .selectOption('person-adam-smith');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Primeiro registro', exact: true })).toHaveValue(
    'person-karl-marx',
  );
  await expect(page.getByRole('combobox', { name: 'Segundo registro', exact: true })).toHaveValue(
    'person-adam-smith',
  );
  await expect(page.locator('.comparison')).toContainText('Stanford');
  await expect(
    page.locator('app-relation-evidence').filter({ hasText: 'analisa criticamente' }),
  ).toHaveCount(1);
});

test('conceptual and historical modes keep evidence, gaps and partial dates explicit', async ({
  page,
}) => {
  await page.goto('/comparar');
  await expect(page.locator('.comparison > article')).toHaveCount(2);
  await expect(page.locator('.method')).toContainText('não calcula similaridade');
  await expect(page.locator('.comparison')).toContainText('Não há afirmação');
  await expect(page.locator('.comparison')).toContainText('Localizador:');
  await page.getByRole('button', { name: 'Explorar duas revoluções' }).click();
  await expect(page.getByRole('combobox', { name: 'Modo de comparação', exact: true })).toHaveValue(
    'historica',
  );
  await expect(page.locator('.comparison')).toContainText('Revolução Francesa');
  await expect(page.getByRole('region', { name: 'Timeline dos registros' })).toContainText(
    'Apenas um extremo conhecido',
  );
  await page.goBack();
  await expect(page.getByRole('combobox', { name: 'Modo de comparação', exact: true })).toHaveValue(
    'conceitual',
  );
  await page.goForward();
  await expect(page.getByRole('combobox', { name: 'Modo de comparação', exact: true })).toHaveValue(
    'historica',
  );
  await page
    .getByRole('combobox', { name: 'Primeiro registro', exact: true })
    .selectOption('work-communist-manifesto');
  await page
    .getByRole('combobox', { name: 'Segundo registro', exact: true })
    .selectOption('work-capital-volume-i');
  await expect(page.locator('li[data-entity="work-communist-manifesto"] .period')).toHaveClass(
    /point.*partial|partial.*point/,
  );
  await expect(page.locator('li[data-entity="work-capital-volume-i"]')).toContainText('1867');
  await page
    .getByRole('combobox', { name: 'Primeiro registro', exact: true })
    .selectOption('concept-historical-materialism');
  await expect(page.locator('li[data-entity="concept-historical-materialism"]')).toContainText(
    'Sem data registrada',
  );
});

test('network selection works by keyboard without repositioning nodes or moving scroll', async ({
  page,
}) => {
  await page.goto('/rede?colecao=atlas-marx-valor');
  const node = page.locator('g[data-node="person-adam-smith"]');
  await node.focus();
  await node.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  await node.press('Enter');
  await expect(node).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/no=person-adam-smith/);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  expect(Math.abs((await page.evaluate(() => scrollY)) - before)).toBeLessThanOrEqual(2);
  await expect(node).toBeFocused();
});

test('invalid filters, hidden selections and duplicate pairs offer recovery', async ({ page }) => {
  await page.goto('/rede?de=1900&ate=1800');
  await expect(page.getByRole('alert')).toContainText('ano inicial');
  await expect(page.locator('g[data-node]')).toHaveCount(0);
  await page.goto('/comparar?esquerda=missing&direita=person-karl-marx');
  await expect(page.getByRole('alert')).toContainText('disponíveis no recorte');
  await expect(page.locator('.comparison')).toHaveCount(0);
  await page.goto('/comparar?esquerda=person-karl-marx&direita=person-karl-marx');
  await expect(page.getByRole('alert')).toContainText('diferentes');
  await page.getByRole('button', { name: 'Limpar filtros e seleção' }).click();
  await expect(page.locator('.comparison > article')).toHaveCount(2);
  await page.goto('/rede?colecao=missing');
  await expect(page.getByRole('combobox', { name: 'Coleção', exact: true })).toHaveValue('missing');
  await expect(page.locator('main').getByRole('status')).toContainText('0 entidades');
});

test('network and comparators are static, hydrate without downloads and reflow at 320px', async ({
  page,
  request,
}) => {
  for (const path of ['/rede', '/comparar']) {
    const html = await (await request.get(path)).text();
    expect(html).toContain('rel="canonical" href="' + path + '"');
  }
  const downloads: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/content/')) downloads.push(r.url());
  });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of [
    '/rede',
    '/comparar?modo=historica&esquerda=person-karl-marx&direita=person-adam-smith',
  ]) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const audit = await new AxeBuilder({ page }).analyze();
    expect(
      audit.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    ).toEqual([]);
  }
  expect(downloads).toEqual([]);
  await page.screenshot({ path: 'output/playwright/comparison-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/rede?colecao=atlas-liberalism&no=person-john-locke');
  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual(
    [],
  );
  await page.screenshot({ path: 'output/playwright/network-desktop.png', fullPage: true });
});
