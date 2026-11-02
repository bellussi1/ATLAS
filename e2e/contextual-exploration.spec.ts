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
          ? page
              .getByRole('button', { name: 'Karl Marx: abrir contexto de Pensador', exact: true })
              .first()
          : page
              .getByRole('button', { name: 'John Locke: abrir contexto de Pensador', exact: true })
              .first();
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
      const panel = await dialog.boundingBox();
      const connection =
        route === 'marxismo'
          ? dialog.locator('[data-connection="relation-marx-capital"]')
          : dialog.getByRole('button', { name: 'Adam Smith', exact: false });
      const article = connection.locator('..');
      await article.locator('summary').click();
      await expect(article.locator('details')).toHaveAttribute('open', '');
      if (route === 'marxismo') {
        await expect(article).toContainText('escreveu');
        await expect(article.locator('details a').first()).toBeVisible();
      } else {
        await expect(article).toContainText('Descoberta enciclopédica');
        await expect(article.locator('details')).toContainText('Sem evidência historiográfica');
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
      const back = dialog.getByRole('button', { name: 'Contexto anterior', exact: false });
      if (mobile) await back.tap();
      else {
        await back.focus();
        await page.keyboard.press('Enter');
      }
      await expect(connection).toBeFocused();
      await expect(article.locator('details')).toHaveAttribute('open', '');
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
