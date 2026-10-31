import { expect, test } from '@playwright/test';

const publicRoutes = [
  '/',
  '/relacoes/',
  '/tempo-e-espaco/',
  '/conhecimento/',
  '/explorar/',
  '/atlas/marxismo/',
  '/atlas/marxismo/valor-e-trabalho/',
  '/atlas/liberalismos/',
  '/estudar/',
  '/sobre/',
  '/fontes/',
  '/sistema/',
];

test('mobile touch surfaces avoid horizontal overflow and preserve usable controls', async ({
  browser,
}) => {
  const context = await browser.newContext({
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  try {
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      for (const route of publicRoutes) {
        const response = await page.goto(route);
        expect(response?.status(), `${route} should prerender for mobile`).toBe(200);

        const layout = await page.evaluate(() => ({
          viewportWidth: document.documentElement.clientWidth,
          documentWidth: document.documentElement.scrollWidth,
          fineHover: matchMedia('(hover: hover) and (pointer: fine)').matches,
          undersizedFields: [
            ...document.querySelectorAll<
              HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
            >(
              'input:not([type="radio"]):not([type="checkbox"]):not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, select',
            ),
          ]
            .filter((field) => field.getBoundingClientRect().width > 0)
            .filter((field) => Number.parseFloat(getComputedStyle(field).fontSize) < 16)
            .map((field) => ({
              name: field.getAttribute('aria-label') ?? field.id,
              size: getComputedStyle(field).fontSize,
            })),
        }));
        expect(
          layout.documentWidth,
          `${route} at ${width}px should not scroll sideways`,
        ).toBeLessThanOrEqual(layout.viewportWidth);
        expect(layout.fineHover, `${route} should not enable pointer hover on touch`).toBe(false);
        expect(
          layout.undersizedFields,
          `${route} should keep mobile form text at 16px or larger`,
        ).toEqual([]);
      }
    }

    await page.goto('/');
    await expect
      .poll(() =>
        page
          .locator('input[type="search"]')
          .first()
          .evaluate((input) => getComputedStyle(input).fontSize),
      )
      .toBe('16px');
    const controlStyles = await page.evaluate(() => ({
      viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? '',
      tapHighlight: getComputedStyle(document.querySelector('a[href]')!).webkitTapHighlightColor,
      inputTapHighlight: getComputedStyle(document.querySelector('input[type="search"]')!)
        .webkitTapHighlightColor,
      linkTouchAction: getComputedStyle(document.querySelector('a[href]')!).touchAction,
      buttonTouchAction: getComputedStyle(document.querySelector('button')!).touchAction,
      buttonSelection: getComputedStyle(document.querySelector('button')!).userSelect,
      bodySelection: getComputedStyle(document.body).userSelect,
      iconTargets: [...document.querySelectorAll<HTMLElement>('button, a[href], [role="button"]')]
        .filter((control) => !control.textContent?.trim())
        .map((control) => {
          const { width, height } = control.getBoundingClientRect();
          return { width, height, label: control.getAttribute('aria-label') };
        }),
    }));

    expect(controlStyles.viewport).toContain('viewport-fit=cover');
    expect(controlStyles.tapHighlight).toBe('rgba(0, 0, 0, 0)');
    expect(controlStyles.inputTapHighlight).toBe('rgba(0, 0, 0, 0)');
    expect(controlStyles.linkTouchAction).toBe('manipulation');
    expect(controlStyles.buttonTouchAction).toBe('manipulation');
    expect(controlStyles.buttonSelection).toBe('none');
    expect(controlStyles.bodySelection).not.toBe('none');
    expect(
      controlStyles.iconTargets.every((target) => target.width >= 44 && target.height >= 44),
    ).toBe(true);
  } finally {
    await context.close();
  }
});
