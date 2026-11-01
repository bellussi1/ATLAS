import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { reconcileRequests, titleIndex } from './reconcile.mjs';

const baseline = JSON.parse(
  await readFile(new URL('./raw/liberalism/2026-11-01/baseline.json', import.meta.url)),
);

test('global QID reconciliation preserves canonical ID across collections and deduplicates requests', () => {
  const result = reconcileRequests(baseline, [
    ['person-smith-imported', 'Smith', 'Smith', 'person', 'Q9381'],
    ['person-smith-imported', 'Smith', 'Smith', 'person', 'Q9381'],
    ['person-adam-smith', 'Adam Smith', 'Adam Smith', 'person', 'Q9381'],
  ]);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].id, 'person-adam-smith');
  assert.equal(result.mapping['person-smith-imported'], 'person-adam-smith');
});

test('conflicting internal IDs, QIDs and entity kinds fail instead of silently merging', () => {
  assert.throws(
    () => reconcileRequests(baseline, [['person-adam-smith', 'Marx', 'Marx', 'person', 'Q9061']]),
    /conflito/i,
  );
  assert.throws(
    () => reconcileRequests(baseline, [['work-smith', 'Smith', 'Smith', 'work', 'Q9381']]),
    /tipo/i,
  );
  const graph = structuredClone(baseline);
  const smith = graph.atlases.flatMap((a) => a.entities).find((e) => e.id === 'person-adam-smith');
  graph.atlases[0].entities.push({
    ...smith,
    id: 'person-smith-duplicate',
    slug: 'smith-duplicate',
  });
  assert.throws(() => reconcileRequests(graph, []), /Q9381/);
});

test('homonyms are ambiguous; aliases never override a global canonical ID', () => {
  const index = titleIndex([
    { id: 'person-one', title: 'Mesmo nome', aliases: ['Alias Único'] },
    { id: 'person-two', title: 'Mesmo_nome', aliases: [] },
  ]);
  assert.equal(index.resolve('Mesmo nome'), undefined);
  assert.equal(index.resolve(' alias único '), 'person-one');
  assert.deepEqual(index.ambiguous, ['mesmo nome']);
});

test('an existing ID without external metadata cannot be assigned two different QIDs', () => {
  const entity = baseline.atlases.flatMap((atlas) => atlas.entities).find((e) => !e.externalIds);
  assert.throws(
    () =>
      reconcileRequests(baseline, [
        [entity.id, 'First', 'First', entity.kind, 'Q999999901'],
        [entity.id, 'Second', 'Second', entity.kind, 'Q999999902'],
      ]),
    /conflito/i,
  );
});
