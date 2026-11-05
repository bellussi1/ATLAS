import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const width of [1440, 390, 320]) {
  const mobile = width < 600;
  for (const route of ['marxismo', 'liberalismo']) {
    test(`${route}: contextual round trip on ${mobile ? 'touch' : 'keyboard'} at ${width}px`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        viewport: { width, height: mobile ? 844 : 1000 },
        isMobile: mobile,
        hasTouch: mobile,
        reducedMotion: mobile ? 'reduce' : 'no-preference',
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`/${route}/`);
      const term =
        route === 'marxismo'
          ? page.getByRole('button', { name: /^Karl Marx: abrir contexto de / }).first()
          : page.getByRole('button', { name: /^John Locke: abrir contexto de / }).first();
      await term.scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => scrollY);
      const trigger = await term.boundingBox();
      if (mobile) await term.tap();
      else {
        await term.focus();
        await page.keyboard.press('Enter');
      }
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      // The panel slides in, so measure once two consecutive readings agree.
      let panel = await dialog.boundingBox();
      await expect(async () => {
        const previous = panel;
        panel = await dialog.boundingBox();
        expect(panel?.height).toBe(previous?.height);
      }).toPass();
      // Reading leads start closed below stronger relations.
      if (route !== 'marxismo') {
        const summary = dialog.locator('.relation-group summary', { hasText: 'Pistas de leitura' });
        await (mobile ? summary.tap() : summary.click());
      }
      const connection =
        route === 'marxismo'
          ? dialog.locator('[data-connection="relation-marx-capital"]')
          : dialog.getByRole('button', { name: 'Adam Smith', exact: false });
      const entry = connection.locator('xpath=ancestor::li[1]');
      if (route === 'marxismo') {
        await expect(entry).toContainText('escreveu');
        await expect(entry.locator('figcaption a').first()).toBeVisible();
      } else {
        await expect(entry).toContainText('remete a');
        await expect(connection.locator('xpath=ancestor::details[1]')).toContainText(
          'Pistas de leitura',
        );
      }
      await connection.scrollIntoViewIfNeeded();
      const contextScroll = await dialog
        .locator('.context-body')
        .evaluate((element) => element.scrollTop);
      if (mobile) await connection.tap();
      else {
        await connection.focus();
        await page.keyboard.press('Enter');
      }
      await expect(dialog.locator('h2')).toHaveText(
        route === 'marxismo' ? 'O capital: volume I' : 'Adam Smith',
      );
      await expect(dialog.locator('h2')).toBeFocused();
      expect((await dialog.boundingBox())?.height).toBe(panel?.height);
      const a11y = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
      expect(
        a11y.violations.filter((v) => ['critical', 'serious'].includes(v.impact ?? '')),
      ).toEqual([]);
      const back = dialog
        .getByRole('navigation', { name: 'Percurso nesta leitura' })
        .getByRole('button')
        .last();
      if (mobile) await back.tap();
      else {
        await back.focus();
        await page.keyboard.press('Enter');
      }
      await expect(connection).toBeFocused();
      await expect(connection.locator('xpath=ancestor::details[1]')).toHaveAttribute('open', '');
      expect(
        Math.abs(
          (await dialog.locator('.context-body').evaluate((element) => element.scrollTop)) -
            contextScroll,
        ),
      ).toBeLessThan(2);
      const bounds = await dialog.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: `output/playwright/context-${route}-${width}.png`,
      });
      if (mobile) await dialog.getByRole('button', { name: 'Fechar contexto' }).tap();
      else await page.keyboard.press('Escape');
      await expect(term).toBeFocused();
      expect(Math.abs((await page.evaluate(() => scrollY)) - before)).toBeLessThan(2);
      expect(Math.abs((await term.boundingBox())!.y - trigger!.y)).toBeLessThan(2);
      await expect(page).toHaveURL(new RegExp(`/${route}/?$`));
      expect(errors).toEqual([]);
      await context.close();
    });
  }
}

test('three retained pages: desktop and mobile visual and accessibility audit', async ({
  page,
}) => {
  // Nine axe passes and eighteen full-page captures of long readings.
  test.setTimeout(120_000);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const route of ['', 'marxismo', 'liberalismo']) {
      await page.goto(`/${route}`);
      await expect(page.locator('h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const a11y = await new AxeBuilder({ page }).analyze();
      expect(
        a11y.violations.filter((v) => ['critical', 'serious'].includes(v.impact ?? '')),
      ).toEqual([]);
      await page.screenshot({
        path: `output/playwright/audit-${route || 'home'}-${width}.png`,
        fullPage: true,
      });
      await page.screenshot({
        path: `output/playwright/audit-opening-${route || 'home'}-${width}.png`,
      });
    }
  }
});
