import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { type BrowserContext, expect, type Page, test as base } from '@playwright/test';

import { DEFAULT_CONTENT_BASE_URL } from '../src/app/core/content/models/content-pointer';

export { expect };
export type { Page } from '@playwright/test';

const cache = 'generated/content-cache';

/** Serves the pinned release from the verified local cache, for any context the tests create. */
export async function routeContent(context: BrowserContext): Promise<void> {
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
}

/**
 * Serves the current build fixture instead of the pinned release. Used by tests that need
 * editorial data not yet published, such as a new chapter review.
 */
export async function routeContentFixture(page: Page): Promise<void> {
  const fixture = JSON.parse(
    await readFile(join('generated/testing', 'content-fixture.json'), 'utf8'),
  ) as { assets: Record<string, string> };
  const pointer = {
    ...JSON.parse(fixture.assets['pointer.json']),
    baseUrl: DEFAULT_CONTENT_BASE_URL,
  };
  await page.route(DEFAULT_CONTENT_BASE_URL + '/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/pointer.json') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(pointer) });
      return;
    }
    const body = fixture.assets[path.slice(1)];
    if (!body) {
      await route.fallback();
      return;
    }
    await route.fulfill({ contentType: 'application/json', body });
  });
}

// Angular marks replayed events with `jsaction` in the SSR HTML and removes it once hydrated.
// Waiting for that here keeps the first click or change from landing before its listener exists.
export async function waitForHydration(page: Page): Promise<void> {
  await page
    .waitForFunction(() => document.querySelectorAll('[jsaction]').length === 0, undefined, {
      timeout: 5000,
    })
    .catch(() => undefined);
}

// Use the exact release verified by prebuild. The browser still requests the public URLs
// and the application still verifies the downloaded bytes and handles retries itself.
export const test = base.extend({
  context: async ({ context }, use) => {
    await routeContent(context);
    await use(context);
  },
  page: async ({ page }, use) => {
    const goto = page.goto.bind(page);
    page.goto = (async (url, options) => {
      const response = await goto(url, options);
      await waitForHydration(page);
      return response;
    }) as Page['goto'];
    await use(page);
  },
});
