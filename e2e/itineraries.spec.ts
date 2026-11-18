import { expect, test } from '@playwright/test';

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

test('trabalhismo roadmap renders connected stops, branches and overview without 320px overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/itinerario/trabalhismo-e-estado-social');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /Trabalhismo brasileiro e Estado social em perspectiva comparada/i,
    }),
  ).toBeVisible();
  await expect(page.locator('.roadmap-diagram')).toBeVisible();
  await expect(page.locator('.roadmap-desk')).toBeVisible();
  await expect(page.locator('.roadmap-track .stop')).toHaveCount(6);
  await expect(page.locator('.roadmap-track .branch')).toHaveCount(3);
  await expect(page.locator('.roadmap-connector')).toHaveCount(5);

  await page
    .locator('.roadmap-desk')
    .getByRole('button', { name: /Próxima/i })
    .click();
  await expect(page.locator('.roadmap-desk')).toContainText('Parada 2 de 6');

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
  await expect(page.locator('.roadmap-track .stop')).toHaveCount(6);
  const convergeLink = page
    .locator('.branch__target a', {
      hasText: /Marxismo: trabalho assalariado, valor e emancipação/i,
    })
    .first();
  await convergeLink.click();
  await expect(page).toHaveURL(/\/itinerario\/comparativo-liberdade/);
  await expect(page.locator('#parada-critica-marxista')).toHaveClass(/is-active/);
  await expect(page.locator('.roadmap-desk')).toContainText('Parada 3 de 6');
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
