import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('public routes render and the pilot is not indexable', async ({ page }) => {
  for (const path of [
    '/',
    '/conhecimento/',
    '/relacoes/',
    '/tempo-e-espaco/',
    '/estudar/',
    '/fontes/',
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');
    expect(response?.headers()['content-security-policy']).toContain("default-src 'self'");
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /ATLAS/);
  }
});

test('homepage has no automatically detectable critical accessibility violations', async ({
  page,
}) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => item.impact === 'critical')).toEqual([]);
});

test('search remains interactive under the pilot security policy', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('Content Security Policy'))
      violations.push(message.text());
  });
  await page.goto('/conhecimento/');
  await page.getByRole('searchbox', { name: 'Pesquisar no acervo' }).fill('Ulysses');
  await expect(page.locator('.results')).toContainText('Ulysses Guimarães');
  expect(violations).toEqual([]);
});
