import { expect, test } from './content-fixture';

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
    .getByRole('navigation', { name: 'Percurso nesta leitura' })
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
    page.getByRole('dialog').getByRole('region', { name: 'Fontes e licença' }),
  ).toContainText('Bernstein');
  await page.getByRole('button', { name: 'Fechar contexto' }).tap();
  await page.getByRole('button', { name: 'Estado e revolução', exact: true }).tap();
  await expect(page.locator('#debates')).toContainText('Réplica ainda não incorporada');
  await context.close();
});

test('timeline selection and graph exploration preserve geometry', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/marxismo/');
  const axis = page.locator('app-ideology-block app-timeline-axis').first();
  await axis.scrollIntoViewIfNeeded();
  const frame = axis.locator('.axis-scroller');
  const before = await frame.boundingBox();
  await axis.locator('.axis-marker').filter({ hasText: 'Comuna de Paris' }).click();
  await expect(page).toHaveURL(/evento=/);
  await expect(axis.locator('.axis-list li.current')).toContainText('Comuna de Paris');
  expect((await frame.boundingBox())?.height).toBe(before?.height);
  await expect(page.locator('.relation-item').first()).toContainText('Bernstein');
});

test('the timeline axis keeps markers apart and answers the keyboard on a phone', async ({
  page,
  request,
}) => {
  const html = await (await request.get('/marxismo/')).text();
  expect(html).toContain('class="axis-marker');
  expect(html).toContain('class="relation-sentences"');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 360, height: 740 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/marxismo/');
  const axis = page.locator('app-ideology-block app-timeline-axis').first();
  await expect(axis).toBeAttached();
  await page.waitForLoadState('networkidle');
  await axis.scrollIntoViewIfNeeded();
  const markers = axis.locator('.axis-marker');
  const total = await markers.count();
  expect(total).toBeGreaterThan(3);
  // No two markers of a track share a row and overlap, so each keeps its own touch target.
  const boxes = await markers.evaluateAll((n) =>
    n.map((e) => {
      const r = e.getBoundingClientRect();
      return {
        track: e.closest('.axis-track')?.getAttribute('data-track'),
        top: Math.round(r.top),
        l: r.left,
        r: r.right,
      };
    }),
  );
  for (const a of boxes)
    for (const b of boxes)
      if (a !== b && a.track === b.track && a.top === b.top)
        expect(a.r <= b.l + 1 || b.r <= a.l + 1).toBe(true);
  await markers.nth(2).click();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/evento=/);
  await expect(axis.locator('.axis-marker[aria-current="true"]')).toHaveCount(1);
  await expect(axis.locator('.axis-list li.current')).toHaveCount(1);
  await markers.nth(2).focus();
  await page.keyboard.press('ArrowRight');
  await expect(axis.locator('.axis-marker[aria-current="true"]')).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('dragging across the ruler cuts the axis, and the keyboard does the same', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/marxismo/');
  await page.waitForLoadState('networkidle');
  const axis = page.locator('#atlas-section-tempo app-timeline-axis');
  await axis.locator('.axis-ruler').evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const all = await axis.locator('.axis-marker').count();
  const ruler = axis.locator('.axis-ruler');
  const box = (await ruler.boundingBox())!;
  const visible = (await axis.locator('.axis-scroller').boundingBox())!;
  await page.mouse.move(visible.x + 60, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(visible.x + visible.width - 60, box.y + 20, { steps: 6 });
  await page.mouse.up();
  await expect(axis.locator('.axis-marker')).not.toHaveCount(all);
  await axis.getByRole('button', { name: /^Tudo/ }).click();
  await ruler.focus();
  await page.keyboard.press('Enter');
  for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(axis.locator('.axis-marker')).not.toHaveCount(all);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
