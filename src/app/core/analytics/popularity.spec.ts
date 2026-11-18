import { describe, expect, it } from 'vitest';

import { featureWithEditorialSlot, type PopularityData, rankByPopularity } from './popularity';

const data = (routes: Record<string, number>): PopularityData => ({
  generatedAt: '2026-11-17',
  windowDays: 30,
  source: 'test',
  routes: Object.fromEntries(
    Object.entries(routes).map(([path, visitors]) => [path, { visitors }]),
  ),
});

const items = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }, { slug: 'd' }];
const pathOf = (item: { slug: string }) => `/leitura/${item.slug}`;

describe('popularity', () => {
  it('keeps the editorial order without enough data', () => {
    expect(rankByPopularity(items, pathOf, data({}))).toEqual(items);
    expect(rankByPopularity(items, pathOf, data({ '/leitura/c': 3 }))).toEqual(items);
  });

  it('moves an item above the minimum to the front', () => {
    const ranked = rankByPopularity(items, pathOf, data({ '/leitura/c': 120 }));
    expect(ranked.map((item) => item.slug)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('keeps three popular items and one editorial slot on the home', () => {
    const featured = featureWithEditorialSlot(
      items,
      pathOf,
      data({ '/leitura/a': 100, '/leitura/b': 80, '/leitura/c': 60 }),
    );
    expect(featured).toHaveLength(4);
    expect(featured[0].slug).toBe('a');
    expect(featured[1].slug).toBe('b');
    expect(featured[2].slug).toBe('c');
    expect(featured[3].slug).toBe('d');
  });

  it('falls back to editorial order when no item reaches the minimum', () => {
    expect(featureWithEditorialSlot(items, pathOf, data({ '/leitura/c': 5 }))).toEqual(items);
  });
});
