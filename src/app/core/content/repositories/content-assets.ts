import { HttpClient } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { type ContentPackage } from '@core/content/models/content-artifacts';
import { DEFAULT_CONTENT_BASE_URL } from '@core/content/models/content-pointer';
import { firstValueFrom } from 'rxjs';

/** Public R2 base URL; the browser can override it on the local preview port. */
export const CONTENT_BASE_URL = new InjectionToken<string>('content base url', {
  providedIn: 'root',
  factory: () => {
    const override = (globalThis as typeof globalThis & { __ATLAS_CONTENT_BASE__?: string })
      .__ATLAS_CONTENT_BASE__;
    return override ?? DEFAULT_CONTENT_BASE_URL;
  },
});

/**
 * Absolute base with a trailing slash. A path-only base (the local preview uses `/content`)
 * resolves against the page origin; `new URL(key, '/content/')` alone throws.
 */
export function contentBaseHref(base: string, origin = globalThis.location?.href): string {
  const withSlash = `${base.replace(/\/+$/, '')}/`;
  return new URL(withSlash, origin ?? 'https://atlas.invalid/').href;
}

/** Reads an object key relative to the base URL (for example `pointer.json` or `c/<sha256>.json`). */
export const CONTENT_ASSET_READER = new InjectionToken<(key: string) => Promise<string>>(
  'content asset reader',
  {
    providedIn: 'root',
    factory: () => {
      const http = inject(HttpClient);
      const base = contentBaseHref(inject(CONTENT_BASE_URL));
      return (key) => firstValueFrom(http.get(new URL(key, base).href, { responseType: 'text' }));
    },
  },
);

/** Optional seed for component tests; application data always comes from the content release. */
export const CONTENT_INITIAL_PACKAGE = new InjectionToken<ContentPackage | null>(
  'initial content package',
  {
    providedIn: 'root',
    factory: () => null,
  },
);

/** Whether the full-screen graph may warm the complete package in the background. */
export const CONTENT_PREFETCH = new InjectionToken<boolean>('content prefetch', {
  providedIn: 'root',
  factory: () => true,
});
