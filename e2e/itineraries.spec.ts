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
