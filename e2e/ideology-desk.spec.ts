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
    await expect(page).toHaveURL(new RegExp(`/${slug}/mesa`));
    await expect(page.getByRole('heading', { name: 'Mesa de exploração' })).toBeVisible();
  });
}

test('desk filters, chains records and returns to the chapter of origin', async ({ page }) => {
  await page.goto('/marxismo/');
  await page
    .locator('#pensadores')
    .getByRole('link', { name: /Explorar os registros deste capítulo/ })
    .click();
  await expect(page).toHaveURL(/de=pensadores/);
  await expect(page.getByRole('button', { name: /^Pessoa/, pressed: true })).toBeVisible();

  await page.getByRole('searchbox', { name: 'Buscar registros' }).fill('marx');
  await page.locator('.desk-card', { hasText: 'Karl Marx' }).click();
  await page.locator('.chain-next button', { hasText: 'O capital: volume I' }).click();
  await expect(page.locator('.chain-via').first()).toContainText('escreveu');
  await expect(page).toHaveURL(/cadeia=person-karl-marx,work-capital-volume-i/);

  await page.locator('.chain-step').getByRole('button', { name: 'Karl Marx' }).click();
  await expect(page.locator('.chain-step')).toHaveCount(1);

  await page.getByRole('link', { name: /Voltar ao capítulo/ }).click();
  await expect(page).toHaveURL(/\/marxismo\/?#pensadores$/);
});

test('desk works at 320px without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/liberalismo/mesa/?cadeia=person-john-locke');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
