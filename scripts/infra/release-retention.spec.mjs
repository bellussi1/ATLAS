import assert from 'node:assert/strict';
import test from 'node:test';

import { keepPointers, keysForPointers } from './release-retention.mjs';

const pointer = (release, artifact, media) => ({
  release,
  manifest: { sha256: `${release}m` },
  artifacts: [{ sha256: artifact }],
  media: [{ key: `m/${media}.jpg` }],
});

test('keeps the current release and three previous distinct releases', () => {
  const current = pointer('d', 'd1', 'dm');
  const history = [
    pointer('c', 'c1', 'cm'),
    pointer('b', 'b1', 'bm'),
    pointer('a', 'a1', 'am'),
    pointer('old', 'old1', 'oldm'),
  ];
  const result = keepPointers(current, history, 4);
  assert.deepEqual(
    result.map((item) => item.release),
    ['d', 'c', 'b', 'a'],
  );
  assert.deepEqual([...keysForPointers(result)].sort(), [
    'c/a1.json',
    'c/am.json',
    'c/b1.json',
    'c/bm.json',
    'c/c1.json',
    'c/cm.json',
    'c/d1.json',
    'c/dm.json',
    'm/am.jpg',
    'm/bm.jpg',
    'm/cm.jpg',
    'm/dm.jpg',
    'pointer.json',
  ]);
});

test('deduplicates repeated pointers and never drops the current one', () => {
  const result = keepPointers(
    pointer('d', 'd1', 'dm'),
    [pointer('d', 'd1', 'dm'), pointer('c', 'c1', 'cm')],
    2,
  );
  assert.deepEqual(
    result.map((item) => item.release),
    ['d', 'c'],
  );
});
