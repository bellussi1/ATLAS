/**
 * Canonical public origin of the static site. Keep in sync with the `ATLAS_SITE_URL` used by
 * `scripts/seo.mjs` and the Pages deploy. A constant is needed because the app also runs in
 * previews, where `location.origin` is not the canonical address.
 */
export const PUBLIC_SITE_URL = 'https://atlas-bellussi.pages.dev';

/** Absolute canonical URL for a route; directory routes keep the trailing slash used by Pages. */
export function absoluteSiteUrl(path: string): string {
  const normalized = path === '/' ? '/' : `${path.replace(/\/+$/, '')}/`;
  return new URL(normalized, `${PUBLIC_SITE_URL}/`).href;
}
