export interface RoutePopularity {
  visitors?: number;
  views?: number;
  clicks?: number;
}

export interface PopularityData {
  generatedAt: string;
  windowDays: number;
  source: string;
  routes: Record<string, RoutePopularity>;
}

/** Canonical key used by the metrics snapshot and by the page components. */
export function normalizeRoute(path: string): string {
  if (!path) return '/';
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, '');
  return clean || '/';
}

export interface RankOptions<T = unknown> {
  /** Below this, an item keeps the editorial order. */
  minVisitors?: number;
  /** Strength of the editorial prior; avoids one click jumping the queue. */
  smoothing?: number;
  eligible?: (item: T) => boolean;
}

/**
 * Sorts by 30-day visitors, with the editorial order as prior for items without enough data.
 * Items below the minimum stay after the ranked ones, in their original order.
 */
export function rankByPopularity<T>(
  items: readonly T[],
  pathOf: (item: T) => string,
  data: PopularityData,
  options: RankOptions<T> = {},
): T[] {
  const minVisitors = options.minVisitors ?? 20;
  const smoothing = options.smoothing ?? 20;
  const eligible = options.eligible ?? (() => true);
  const entries = items.map((item, index) => {
    const key = normalizeRoute(pathOf(item));
    return { item, index, visitors: data.routes[key]?.visitors ?? 0, ok: eligible(item) };
  });
  const ranked = entries.filter((entry) => entry.ok && entry.visitors >= minVisitors);
  if (!ranked.length) return [...items];
  const mean = ranked.reduce((sum, entry) => sum + entry.visitors, 0) / ranked.length;
  const score = (visitors: number) => (visitors + smoothing * mean) / (1 + smoothing);
  ranked.sort((a, b) => score(b.visitors) - score(a.visitors) || a.index - b.index);
  const popular = ranked.map((entry) => entry.item);
  const rest = entries.filter((entry) => !ranked.includes(entry)).map((entry) => entry.item);
  return [...popular, ...rest];
}

/** Home: three popular items plus one editorial slot, so popularity does not feed itself. */
export function featureWithEditorialSlot<T>(
  items: readonly T[],
  pathOf: (item: T) => string,
  data: PopularityData,
  count = 4,
  options: RankOptions<T> = {},
): T[] {
  const ranked = rankByPopularity(items, pathOf, data, options);
  const picked = ranked.slice(0, Math.max(0, count - 1));
  const editorial = items.find((item) => !picked.includes(item));
  return editorial ? [...picked, editorial] : ranked.slice(0, count);
}
