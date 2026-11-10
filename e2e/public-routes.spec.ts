import { auditPage } from './accessibility';
import { expect, test } from './content-fixture';

// Every public catalogue and reading, at phone and desktop width: one heading, no serious axe
// findings and no horizontal page scroll. Route changes that drop focus are covered in route-focus.spec.ts.
const routes = [
  '/',
  '/leitura/marxismo',
  '/leitura/liberalismo',
  '/leitura/social-democracia',
  '/leitura/anarquismo',
  '/leitura/nazismo',
  '/leitura/stalinismo',
  '/leitura/trabalhismo',
  '/acervo',
  '/acervo/entidades',
  '/acervo/ideologias',
  '/acervo/pessoas',
  '/acervo/obras',
  '/acervo/fontes',
  '/acervo/paises',
  '/acervo/regimes',
  '/acervo/partidos',
  '/acervo/instituicoes',
  '/acervo/acontecimentos',
  '/acervo/conceitos',
  '/acervo/lugares',
  '/verbete/brasil',
];

for (const width of [390, 1440])
  for (const path of routes)
    test(`${path} at ${width}px has one heading, no serious axe findings and no horizontal scroll`, async ({
      page,
    }) => {
      test.setTimeout(path === '/acervo/fontes' ? 90_000 : 30_000);
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
      expect(await page.locator('h1').count()).toBeGreaterThanOrEqual(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const violations = await auditPage(page);
      expect(
        violations
          .filter((item) => item.impact === 'critical' || item.impact === 'serious')
          .map((item) => `${item.id}: ${item.nodes.length} node(s)`),
      ).toEqual([]);
    });

test('footer has one navigation and no destination repeated inside it', async ({ page }) => {
  await page.goto('/leitura/marxismo');
  const footer = page.locator('footer.site-footer');
  await expect(footer.getByRole('navigation')).toHaveCount(1);
  const links = await footer.getByRole('navigation').getByRole('link').allTextContents();
  expect(new Set(links).size).toBe(links.length);
  await expect(footer.locator('[role=status]')).toHaveCount(0);
});
