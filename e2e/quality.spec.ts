import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Lab measurements, not field data: layout stability while scrolling the whole reading,
// WCAG A/AA rules from axe and the 24px minimum target for standalone controls.
for (const width of [390, 1440])
  for (const path of ['/marxismo/', '/liberalismo/'])
    test(`${path} at ${width}px stays stable, accessible and tappable`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(() => {
        const w = window as unknown as { __cls: number };
        w.__cls = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as unknown as {
            value: number;
            hadRecentInput: boolean;
          }[])
            if (!e.hadRecentInput) w.__cls += e.value;
        }).observe({ type: 'layout-shift', buffered: true });
      });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      for (let step = 0; step < 50; step++) await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(400);

      const result = await page.evaluate(() => ({
        cls: (window as unknown as { __cls: number }).__cls,
        overflow: document.documentElement.scrollWidth > innerWidth,
        small: [...document.querySelectorAll('main button, main a')]
          .filter((e) => {
            const b = e.getBoundingClientRect();
            return b.width > 0 && b.height > 0 && b.height < 24 && !e.closest('p, li, td');
          })
          .map((e) => e.outerHTML.slice(0, 80)),
      }));
      expect(result.cls).toBeLessThan(0.1);
      expect(result.overflow).toBe(false);
      expect(result.small).toEqual([]);
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(axe.violations.map((v) => v.id)).toEqual([]);
    });
