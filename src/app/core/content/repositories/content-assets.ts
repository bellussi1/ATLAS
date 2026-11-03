import { HttpClient } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { type ContentPackage } from '@core/content/models/content-artifacts';
import { DEFAULT_CONTENT_BASE_URL } from '@core/content/models/content-pointer';
import { firstValueFrom } from 'rxjs';

/** Public R2 base URL; the only address the content layer knows. */
export const CONTENT_BASE_URL = new InjectionToken<string>('content base url', {
  providedIn: 'root',
  factory: () => DEFAULT_CONTENT_BASE_URL,
});

/** Reads an object key relative to the base URL (for example `pointer.json` or `c/<sha256>.json`). */
export const CONTENT_ASSET_READER = new InjectionToken<(key: string) => Promise<string>>(
  'content asset reader',
  {
    providedIn: 'root',
    factory: () => {
      const http = inject(HttpClient);
      const base = inject(CONTENT_BASE_URL);
      return (key) =>
        firstValueFrom(
          http.get(new URL(key, `${base.replace(/\/+$/, '')}/`).href, { responseType: 'text' }),
        );
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
