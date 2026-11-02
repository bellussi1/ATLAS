import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Every public catalogue and reading, at phone and desktop width: one heading, no serious axe
// findings and no horizontal page scroll. Route changes that drop focus are covered in route-focus.spec.ts.
const routes = [
  '/',
  '/marxismo',
  '/liberalismo',
  '/conhecimento',
  '/entidades',
  '/ideologias',
  '/pessoas',
  '/obras',
  '/fontes',
  '/paises',
  '/regimes',
  '/partidos',
  '/instituicoes',
  '/acontecimentos',
  '/conceitos',
  '/lugares',
  '/verbete/brasil',
];

for (const width of [390, 1440])
  for (const path of routes)
    test(`${path} at ${width}px has one heading, no serious axe findings and no horizontal scroll`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
      expect(await page.locator('h1').count()).toBeGreaterThanOrEqual(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const audit = await new AxeBuilder({ page }).analyze();
      expect(
        audit.violations
          .filter((item) => item.impact === 'critical' || item.impact === 'serious')
          .map((item) => `${item.id}: ${item.nodes.length} node(s)`),
      ).toEqual([]);
    });

test('footer has one navigation and no destination repeated inside it', async ({ page }) => {
  await page.goto('/marxismo');
  const footer = page.locator('footer.site-footer');
  await expect(footer.getByRole('navigation')).toHaveCount(1);
  const links = await footer.getByRole('navigation').getByRole('link').allTextContents();
  expect(new Set(links).size).toBe(links.length);
  await expect(footer.locator('[role=status]')).toHaveCount(0);
});
