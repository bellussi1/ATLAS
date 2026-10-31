import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

await mkdir('docs/auditoria-visual', { recursive: true });
const browser = await chromium.launch();
const suffix = process.argv.includes('--after') ? '-depois' : '';
for (const [name, path] of [['home', '/'], ['estudo', '/estudar/'], ['tempo', '/tempo-e-espaco/'], ['verbete', '/verbete/igualdade-perante-a-lei/']]) {
  for (const [size, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    await page.goto(`http://127.0.0.1:4305${path}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `docs/auditoria-visual/${name}-${size}${suffix}.png`, fullPage: true });
    await page.close();
  }
}
await browser.close();
