import { expect, test } from '@playwright/test';

test('keywords open sourced context without moving the reading', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/marxismo/');
  const term = page.locator('#conceitos .knowledge-term').first();
  await expect(term).toBeVisible();
  await term.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  await term.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('link').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(term).toBeFocused();
  expect(Math.abs((await page.evaluate(() => scrollY)) - before)).toBeLessThan(2);
});

test('following a connection starts the new context and restores the previous focus', async ({
  page,
}) => {
  await page.goto('/marxismo/');
  await page.locator('#conceitos .knowledge-term').first().click();
  const dialog = page.getByRole('dialog');
  const connection = dialog.locator('.context-connections button').first();
  await connection.click();
  await expect(dialog.locator('h2')).toBeFocused();
  expect(await dialog.locator('.context-body').evaluate((e) => e.scrollTop)).toBe(0);
  await dialog
    .getByRole('navigation', { name: 'Percurso neste contexto' })
    .getByRole('button')
    .last()
    .click();
  await expect(connection).toBeFocused();
  await page.keyboard.press('Escape');
});

test('argument cards and current cards expose evidence on touch', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto('/marxismo/');
  await page.locator('#vertentes .exploration-card').first().tap();
  await expect(page.getByRole('dialog')).toContainText('Bernstein');
  await page.getByRole('button', { name: 'Fechar contexto' }).tap();
  await page.locator('#debates .argument-card').first().tap();
  await expect(
    page.getByRole('dialog').getByRole('region', { name: 'Fontes do contexto' }),
  ).toContainText('Bernstein');
  await page.getByRole('button', { name: 'Fechar contexto' }).tap();
  await page.getByRole('button', { name: 'Estado e revolução', exact: true }).tap();
  await expect(page.locator('#debates')).toContainText('Réplica ainda não incorporada');
  await context.close();
});

test('timeline selection and graph exploration preserve geometry', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/marxismo/');
  const panel = page.locator('.timeline-reading');
  await panel.scrollIntoViewIfNeeded();
  const before = await panel.boundingBox();
  await page.locator('.timeline-event').filter({ hasText: 'Comuna de Paris' }).click();
  await expect(panel).toContainText('Comuna de Paris');
  expect((await panel.boundingBox())?.height).toBe(before?.height);
  await expect(page.locator('.relation-item').first()).toContainText('Bernstein');
});

test('temporal axis stays fixed across filters and SVG is prerendered', async ({
  page,
  request,
}) => {
  // The reading prerenders the timeline and the debate.
  const response = await request.get('/marxismo/');
  const html = await response.text();
  expect(html).toContain('class="timeline-axis"');
  expect(html).toContain('class="relation-list"');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 740 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/marxismo/');
  const axis = page.locator('.timeline-axis');
  const initial = await axis.innerHTML();
  await page.getByLabel('Recorte temporal', { exact: true }).selectOption('antes-1850');
  await expect(page).toHaveURL(/periodo=antes-1850/);
  // Selection may change, but the time scale and all dated markers keep their coordinates.
  const positions = () =>
    axis.locator('circle').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('cx')));
  const before = await positions();
  expect(initial).toContain('<line');
  await page.getByLabel('Recorte temporal', { exact: true }).selectOption('desde-1850');
  await expect(page).toHaveURL(/periodo=desde-1850/);
  expect(await positions()).toEqual(before);
  const event = page.locator('.timeline-event').first();
  await event.focus();
  await page.keyboard.press('Enter');
  await expect(event).toBeFocused();
  await expect(event).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page
    .locator('.timeline-reading')
    .screenshot({ path: 'output/playwright/marxismo-timeline-320.png' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .locator('.timeline-reading')
    .screenshot({ path: 'output/playwright/marxismo-timeline-desktop.png' });
  await page
    .locator('.relations')
    .screenshot({ path: 'output/playwright/marxismo-grafo-desktop.png' });
});
