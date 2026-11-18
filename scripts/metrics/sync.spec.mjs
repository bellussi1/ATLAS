import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildPopularity,
  fetchGoatCounterHits,
  mergeCloudflare,
  mergeGoatCounter,
  normalizeRoute,
} from './sync.mjs';

test('normalizes trailing slashes and query strings', () => {
  assert.equal(normalizeRoute('/leitura/marxismo/?utm=x'), '/leitura/marxismo');
  assert.equal(normalizeRoute('/'), '/');
});

test('merges visitors, views and clicks per canonical route', () => {
  const goat = {
    hits: [
      { path: '/leitura/marxismo/', count: 120 },
      { path: 'click:/leitura/marxismo/', count: 26 },
      { path: '/acervo', count: 300 },
      { path: '/acervo/pessoas', count: 45 },
      { path: '/', count: 900 },
      { path: 'click:github.com', count: 4 },
    ],
  };
  const cloudflare = {
    data: {
      viewer: {
        accounts: [
          {
            rumPageloadEventsAdaptiveGroups: [
              {
                count: 240,
                sum: { visits: 150 },
                dimensions: { requestPath: '/leitura/marxismo/' },
              },
            ],
          },
        ],
      },
    },
  };
  const routes = mergeCloudflare(mergeGoatCounter({}, goat), cloudflare);
  assert.deepEqual(routes['/leitura/marxismo'], { visitors: 120, views: 240, clicks: 26 });
  assert.deepEqual(routes['/acervo/pessoas'], { visitors: 45, views: 0, clicks: 0 });
  assert.equal(routes['/acervo'], undefined);
  assert.equal(routes['/'], undefined);
  assert.equal(routes['click:github.com'], undefined);
});

test('builds a dated snapshot', () => {
  const data = buildPopularity(
    { hits: [{ path: '/verbete/brasil', count: 10 }] },
    {},
    new Date('2026-11-17T12:00:00Z'),
  );
  assert.equal(data.generatedAt, '2026-11-17');
  assert.equal(data.windowDays, 30);
  assert.equal(data.routes['/verbete/brasil'].visitors, 10);
});

test('paginates GoatCounter stats with limit=100 and exclude_paths', async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    if (urls.length === 1) {
      return {
        hits: [{ path: '/verbete/a', path_id: 11, count: 5 }],
        more: true,
      };
    }
    return {
      hits: [{ path: '/verbete/b', path_id: 22, count: 3 }],
      more: false,
    };
  };

  const result = await fetchGoatCounterHits(
    'bellussi',
    'secret-token',
    '2026-10-18',
    '2026-11-17',
    {
      fetchImpl,
      delayMs: 0,
    },
  );

  assert.equal(urls.length, 2);
  assert.match(urls[0], /limit=100/);
  assert.doesNotMatch(urls[0], /limit=1000/);
  assert.doesNotMatch(urls[0], /exclude_paths/);
  assert.match(urls[1], /limit=100/);
  assert.match(urls[1], /exclude_paths=11/);
  assert.deepEqual(
    result.hits.map((hit) => hit.path),
    ['/verbete/a', '/verbete/b'],
  );
});
