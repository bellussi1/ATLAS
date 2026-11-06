import { auditPage } from './accessibility';
import { expect, test } from './content-fixture';

test('the bibliography audit detects invalid markup beyond its first batch', async ({ page }) => {
  const records = Array.from({ length: 1005 }, (_, index) => {
    const last = index === 1004;
    return `<article><details class="source-uses"><summary>Fonte ${index}</summary></details><button ${last ? 'id="last-source"' : ''} aria-expanded="${last ? 'invalid' : 'false'}">Citações ${index}</button></article>`;
  }).join('');
  await page.setContent(
    `<html lang="pt-BR"><title>Fontes</title><main><h1>Fontes</h1><section class="results">${records}</section></main></html>`,
  );
  const violations = await auditPage(page);
  const invalidAttribute = violations.find((violation) => violation.id === 'aria-valid-attr-value');
  expect(invalidAttribute?.nodes.some((node) => node.target.includes('#last-source'))).toBe(true);
});
