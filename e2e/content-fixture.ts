import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test as base } from '@playwright/test';

import { DEFAULT_CONTENT_BASE_URL } from '../src/app/core/content/models/content-pointer';

export { expect };
export type { Page } from '@playwright/test';

const cache = 'generated/content-cache';

// Use the exact release verified by prebuild. The browser still requests the public URLs
// and the application still verifies the downloaded bytes and handles retries itself.
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route(DEFAULT_CONTENT_BASE_URL + '/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path !== '/pointer.json' && !/^\/c\/[a-f0-9]{64}\.json$/.test(path)) {
        await route.fallback();
        return;
      }
      await route.fulfill({
        contentType: 'application/json',
        body: await readFile(join(cache, path.slice(1))),
      });
    });
    await use(context);
  },
});
