import AxeBuilder from '@axe-core/playwright';
import { type Page } from '@playwright/test';

/** Audit the page envelope and every source record, keeping large bibliographies in bounded batches. */
export async function auditPage(page: Page) {
  const batchSize = 500;
  const records = '.results > article';
  const count = await page.locator('.results > article .source-uses').count();
  if (count <= batchSize) return (await new AxeBuilder({ page }).analyze()).violations;
  const violations = (await new AxeBuilder({ page }).exclude(records).analyze()).violations;
  for (let first = 1; first <= count; first += batchSize) {
    const last = first + batchSize - 1;
    const batch = `${records}:nth-of-type(n + ${first}):nth-of-type(-n + ${last})`;
    violations.push(...(await new AxeBuilder({ page }).include(batch).analyze()).violations);
  }
  return violations;
}
