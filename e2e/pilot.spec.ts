import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('public routes render and the pilot is not indexable', async ({ page }) => {
  for (const path of ['/', '/conhecimento/', '/relacoes/', '/tempo-e-espaco/', '/estudar/', '/fontes/']) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  }
});

test('homepage has no automatically detectable critical accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(item => item.impact === 'critical')).toEqual([]);
});
