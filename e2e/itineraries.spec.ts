import { expect, test } from '@playwright/test';

import { waitForHydration } from './content-fixture';

test('itinerarios index renders cleanly on desktop and 320px mobile without overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/itinerarios');
  await expect(page.getByRole('heading', { level: 1, name: 'Itinerários' })).toBeVisible();
  await expect(page.locator('.itineraries')).toBeVisible();

  await page.setViewportSize({ width: 320, height: 640 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test('trabalhismo route reads top to bottom: index, stops, next steps and ending without 320px overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/itinerario/trabalhismo-e-estado-social');
  await waitForHydration(page);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /Trabalhismo brasileiro e Estado social em perspectiva comparada/i,
    }),
  ).toBeVisible();
  const index = page.getByRole('navigation', { name: /Percurso/ });
  await expect(index).toBeVisible();
  await expect(page.locator('.roadmap-track .stop')).toHaveCount(6);
  await expect(page.locator('.roadmap-track .branch')).toHaveCount(3);
  await expect(page.locator('.roadmap-connector:not(.roadmap-connector--end)')).toHaveCount(5);

  // The step button moves reading (and focus) to the next stop; the index follows.
  await page.locator('.roadmap-connector').first().click();
  await expect(page.locator('#parada-marco-era-vargas .stop__title')).toBeFocused();
  await expect(index.locator('[aria-current="step"]')).toContainText('A Era Vargas');

  // The end of the route points to real follow-ups and other itineraries.
  await page.locator('.roadmap-connector--end').click();
  const ending = page.locator('#depois-do-percurso');
  await expect(ending.getByRole('heading', { level: 2, name: 'Depois do percurso' })).toBeFocused();
  await expect(ending.locator('.connections a').first()).toContainText('Acontecimentos');
  await expect(ending.locator('.related-itinerary').first()).toHaveAttribute(
    'href',
    /\/itinerario\//,
  );

  await page.setViewportSize({ width: 320, height: 640 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test('branch convergence link stays on itinerary page and focuses target stop', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/itinerario/comparativo-liberdade');
  await waitForHydration(page);
  await expect(page.locator('.roadmap-track .stop')).toHaveCount(6);
  const convergeLink = page
    .locator('.branch__target a', {
      hasText: /Marxismo: trabalho assalariado, valor e emancipação/i,
    })
    .first();
  await convergeLink.click();
  await expect(page).toHaveURL(/\/itinerario\/comparativo-liberdade/);
  await expect(page).toHaveTitle(/Liberalismo e socialismo/);
  await expect(page.locator('#parada-critica-marxista')).toHaveClass(/is-active/);
  await expect(page.locator('#parada-critica-marxista .stop__title')).toBeFocused();
  await expect(
    page.getByRole('navigation', { name: /Percurso/ }).locator('[aria-current="step"]'),
  ).toContainText('Marxismo');
});

test('home exposes itinerarios band and footer/header links', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 2, name: /Seguir um itinerário/i }),
  ).toBeVisible();
  await expect(
    page.locator('.site-header').getByRole('link', { name: 'Itinerários' }),
  ).toBeVisible();
  await expect(
    page.locator('.site-footer').getByRole('link', { name: /Itinerários temáticos/i }),
  ).toBeVisible();
});

test('unknown itinerary slug responds with 404 without redirect', async ({ page }) => {
  const response = await page.goto('/itinerario/inexistente-teste');
  expect(response?.status()).toBe(404);
});

test('leituras index links to itinerarios', async ({ page }) => {
  await page.goto('/leituras');
  await expect(page.getByRole('heading', { level: 1, name: 'Leituras contínuas' })).toBeVisible();
  await page.getByRole('link', { name: /Explorar itinerários temáticos/i }).click();
  await expect(page).toHaveURL(/\/itinerarios$/);
});
