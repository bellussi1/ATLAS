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

test('the timeline scale is the filter: markers open records and stay in place', async ({
  page,
  request,
}) => {
  const html = await (await request.get('/marxismo/')).text();
  expect(html).toContain('class="timeline-scale-track"');
  expect(html).toContain('class="relation-list"');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 360, height: 740 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/marxismo/');
  const scale = page.locator('.timeline-scale').first();
  await expect(scale).toBeAttached();
  await page.waitForLoadState('networkidle');
  await scale.scrollIntoViewIfNeeded();
  await expect(scale).toContainText('Linha do tempo');
  const stops = scale.locator('.timeline-stop');
  const total = await stops.count();
  expect(total).toBeGreaterThan(3);
  await expect(scale.locator('.timeline-scale-count')).toContainText(`1 de ${total}`);
  const lefts = () => stops.evaluateAll((n) => n.map((e) => (e as HTMLElement).style.left));
  const before = await lefts();
  // No two markers overlap, so each keeps its own touch target.
  const boxes = await stops.evaluateAll((n) =>
    n.map((e) => {
      const r = e.getBoundingClientRect();
      return [r.left, r.right];
    }),
  );
  for (let i = 1; i < boxes.length; i++)
    expect(boxes[i][0]).toBeGreaterThanOrEqual(boxes[i - 1][1] - 4);
  await stops.nth(2).click();
  await expect(page).toHaveURL(/evento=/);
  await expect(stops.nth(2)).toHaveAttribute('aria-pressed', 'true');
  await expect(scale.locator('.timeline-scale-count')).toContainText(`3 de ${total}`);
  await expect(page.locator('.timeline-event[aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator('.timeline-reading h3')).toHaveText(
    (await page.locator('.timeline-event[aria-pressed="true"] strong').textContent())!,
  );
  await stops.nth(2).focus();
  await page.keyboard.press('ArrowRight');
  await expect(stops.nth(3)).toBeFocused();
  await expect(stops.nth(3)).toHaveAttribute('aria-pressed', 'true');
  expect(await lefts()).toEqual(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
