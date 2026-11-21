import { type ResolveFn } from '@angular/router';

/**
 * The Natural Earth outlines (about 236 kB) are their own chunk, fetched in parallel with the
 * network bundle only when `/mapa` opens. The data rarely changes, so the chunk stays cached
 * across deploys that only touch the page code.
 */
export const globeBaseMapResolver: ResolveFn<unknown> = () =>
  import('@world-map/data/natural-earth-globe.json').then((module) => module.default);
