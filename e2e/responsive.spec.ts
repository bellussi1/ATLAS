import { expect, test } from './content-fixture';

/**
 * Responsive audit: every public route at phone, tablet and desktop widths must
 * fit the viewport without horizontal scrolling and keep controls reachable.
 */
const widths = [320, 390, 640, 768, 1024, 1440];
const routes = [
  '/',
  '/leitura/marxismo',
  '/leitura/liberalismo',
  '/acervo',
  '/acervo/pessoas',
  '/acervo/fontes',
  '/verbete/karl-marx',
  '/verbete/john-locke',
];

for (const width of widths) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const problems: string[] = [];
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('h1').first()).toBeVisible();
      const report = await page.evaluate(() => {
        const limit = document.documentElement.clientWidth;
        const offenders = [...document.querySelectorAll<HTMLElement>('main *')]
          .filter((el) => {
            const box = el.getBoundingClientRect();
            if (!box.width || getComputedStyle(el).position === 'fixed') return false;
            let parent = el.parentElement;
            while (parent && parent !== document.body) {
              const overflow = getComputedStyle(parent).overflowX;
              if (overflow !== 'visible') return false;
              parent = parent.parentElement;
            }
            return box.right > limit + 1 || box.left < -1;
          })
          .slice(0, 3)
          .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`);
        return { scroll: document.documentElement.scrollWidth > limit, offenders };
      });
      if (report.scroll || report.offenders.length)
        problems.push(`${route}: ${report.offenders.join(', ') || 'page scrolls'}`);
    }
    expect(problems).toEqual([]);
  });
}
