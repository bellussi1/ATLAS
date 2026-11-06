import { defineConfig } from '@playwright/test';

const port = process.env['ATLAS_PREVIEW_PORT'] ?? '4305';
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  // The accessibility audits on the full graph take longer than the default under load.
  timeout: 60_000,
  use: { baseURL, browserName: 'chromium' },
  webServer: { command: 'npm run preview', url: baseURL, reuseExistingServer: false, timeout: 30000 },
});
