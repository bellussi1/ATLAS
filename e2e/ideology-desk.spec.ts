import { expect, test } from '@playwright/test';

for (const slug of ['marxismo', 'liberalismo']) {
  test(`${slug}: opening offers questions, a chapter map and two doors`, async ({ page }) => {
    await page.goto(`/${slug}/`);
    const questions = page.locator('.poster-questions a');
    await expect(questions).toHaveCount(3);
    await expect(
      page.getByRole('navigation', { name: 'Mapa da tradição' }).locator('.map-tile'),
    ).toHaveCount(12);
    await questions.first().hover();
    await expect(page.locator('.map-tile[data-lit="true"]').first()).toBeVisible();
    await page.getByRole('link', { name: /Explorar pessoas, obras e conceitos/ }).click();
    await expect(page).toHaveURL(new RegExp(`/${slug}/?#explorar$`));
    await expect(page.locator('#desk-title')).toBeInViewport();
  });
}

test('the old desk address redirects to the single page', async ({ page }) => {
  await page.goto('/marxismo/mesa/');
  await expect(page).toHaveURL(/\/marxismo\/?$/);
  await expect(page.locator('#desk-title')).toBeAttached();
});

test('chapter links filter Explorar in place, chain records and return to the chapter', async ({
  page,
}) => {
  await page.goto('/marxismo/');
  await page
    .locator('#pensadores')
    .getByRole('link', { name: /Explorar os registros deste capítulo/ })
    .click();
  await expect(page).toHaveURL(/\/marxismo\/?\?de=pensadores/);
  await expect(page.locator('#desk-title')).toBeInViewport();
  await expect(page.getByRole('button', { name: /^Pessoa/, pressed: true })).toBeVisible();

  await page.getByRole('searchbox', { name: 'Buscar registros' }).fill('marx');
  await page.locator('.desk-card', { hasText: 'Karl Marx' }).click();
  await page.locator('.chain-next button', { hasText: 'O capital: volume I' }).click();
  await expect(page.locator('.chain-via').first()).toContainText('escreveu');
  await expect(page).toHaveURL(/cadeia=person-karl-marx,work-capital-volume-i/);

  await page.locator('.chain-step').getByRole('button', { name: 'Karl Marx' }).click();
  await expect(page.locator('.chain-step')).toHaveCount(1);

  await page.getByRole('link', { name: /Voltar ao capítulo/ }).click();
  await expect(page.locator('#pensadores')).toBeInViewport();
});

test('desk filters and chain steps keep the scroll position', async ({ page }) => {
  await page.goto('/marxismo/');
  const top = await page.evaluate(() => {
    const y = document.getElementById('explorar')!.offsetTop;
    window.scrollTo(0, y);
    return window.scrollY;
  });
  // Clicking through the DOM avoids Playwright scrolling the target into view.
  await page.evaluate(() =>
    (document.querySelectorAll('.desk-kinds button')[1] as HTMLElement).click(),
  );
  await expect(page).toHaveURL(/tipo=/);
  await page.evaluate(() => (document.querySelector('.desk-card') as HTMLElement).click());
  await expect(page).toHaveURL(/cadeia=/);
  expect(await page.evaluate(() => window.scrollY)).toBe(top);
});

test('desk works at 320px without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/liberalismo/?cadeia=person-john-locke');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

for (const width of [320, 375, 768, 1024, 1440]) {
  test(`single page has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/marxismo/?cadeia=person-karl-marx', '/liberalismo/?tipo=person']) {
      await page.goto(path);
      const offenders = await page.evaluate(() => {
        const limit = document.documentElement.clientWidth;
        return [...document.querySelectorAll('body *')]
          .filter((el) => {
            const box = el.getBoundingClientRect();
            if (!box.width || getComputedStyle(el).position === 'fixed') return false;
            const clipped = el.closest('[class*="carousel"], .sr-only, [aria-hidden="true"]');
            return !clipped && box.right > limit + 1;
          })
          .slice(0, 5)
          .map((el) => `${el.tagName.toLowerCase()}.${el.className}`);
      });
      expect(offenders, path).toEqual([]);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
}
