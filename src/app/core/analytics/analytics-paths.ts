/** Canonical path for analytics: no trailing slash, query string preserved. */
export function trackedPath(pathname: string, search = ''): string {
  if (!pathname) return '';
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return `${path}${search}`;
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
