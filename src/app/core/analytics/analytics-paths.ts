/** Canonical path for analytics: no query string, no hash, no trailing slash. */
export function trackedPath(pathname: string): string {
  if (!pathname) return '';
  const clean = pathname.split(/[?#]/)[0] || '';
  if (!clean) return '';
  return clean.length > 1 ? clean.replace(/\/+$/, '') : clean;
}

/** Click event path. Same-origin links become `click:/route`; external links use the host. */
export function clickPath(href: string, origin: string, custom?: string | null): string | null {
  if (custom) return `click:${custom}`;
  try {
    const url = new URL(href, origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin === origin ? `click:${trackedPath(url.pathname)}` : `click:${url.hostname}`;
  } catch {
    return null;
  }
}
