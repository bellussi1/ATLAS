import { provideHttpClient } from '@angular/common/http';
import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  type ActivatedRouteSnapshot,
  provideRouter,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';

import { routes } from './app.routes';

const leaf = (route: ActivatedRouteSnapshot): ActivatedRouteSnapshot =>
  route.firstChild ? leaf(route.firstChild) : route;

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition, from, to }) => {
          const root = document.documentElement;
          // Keyboard, reduced motion and in-page query/fragment changes are immediate.
          if (
            root.dataset['input'] === 'keyboard' ||
            root.classList.contains('atlas-reduced-motion') ||
            matchMedia('(prefers-reduced-motion: reduce)').matches ||
            leaf(from).routeConfig === leaf(to).routeConfig
          )
            transition.skipTransition();
        },
      }),
    ),
    provideClientHydration(withEventReplay()),
  ],
};
