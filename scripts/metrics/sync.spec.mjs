import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildPopularity, mergeCloudflare, mergeGoatCounter, normalizeRoute } from './sync.mjs';

test('normalizes trailing slashes and query strings', () => {
  assert.equal(normalizeRoute('/leitura/marxismo/?utm=x'), '/leitura/marxismo');
  assert.equal(normalizeRoute('/'), '/');
});

test('merges visitors, views and clicks per canonical route', () => {
  const goat = {
    hits: [
      { path: '/leitura/marxismo/', count: 120 },
      { path: 'click:/leitura/marxismo/', count: 26 },
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
