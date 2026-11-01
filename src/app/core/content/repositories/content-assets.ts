import { HttpClient } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { type ContentPackage } from '@core/content/models/content-artifacts';
import { firstValueFrom } from 'rxjs';

export const CONTENT_ASSET_READER = new InjectionToken<(path: string) => Promise<string>>(
  'content asset reader',
  {
    providedIn: 'root',
    factory: () => {
      const http = inject(HttpClient);
      return (path) => firstValueFrom(http.get(path, { responseType: 'text' }));
    },
  },
);

/** Optional seed for component tests; application data always comes from generated assets. */
export const CONTENT_INITIAL_PACKAGE = new InjectionToken<ContentPackage | null>(
  'initial content package',
  {
    providedIn: 'root',
    factory: () => null,
  },
);
