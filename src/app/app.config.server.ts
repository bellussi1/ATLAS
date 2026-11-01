import { type ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { CONTENT_ASSET_READER } from '@core/content/repositories/content-assets';
import { readContentAssetOnServer } from '@core/content/repositories/content-server-reader';

import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: CONTENT_ASSET_READER, useValue: readContentAssetOnServer },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
