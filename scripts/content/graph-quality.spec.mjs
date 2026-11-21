import assert from 'node:assert/strict';
import test from 'node:test';

import './register-source-modules.mjs';
import { readSourceGraph } from './source-graph.mjs';

const fold = (value) =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const graph = await readSourceGraph();
const entities = graph.atlases.flatMap((atlas) => atlas.entities);

test('não há dois países com o mesmo nome', () => {
  const byName = new Map();
  for (const entity of entities) {
    if (entity.kind !== 'place' || entity.placeType !== 'country') continue;
    const key = fold(entity.title);
    byName.set(key, [...(byName.get(key) ?? []), entity.id]);
  }
  const duplicated = [...byName].filter(([, ids]) => ids.length > 1);
  assert.deepEqual(duplicated, []);
});

test('lugar sem tipo de país não repete o título de um país', () => {
  const countries = new Set(
    entities
      .filter((entity) => entity.kind === 'place' && entity.placeType === 'country')
      .map((entity) => fold(entity.title)),
  );
  const clones = entities
    .filter((entity) => entity.kind === 'place' && entity.placeType !== 'country')
    .filter((entity) => countries.has(fold(entity.title)))
    .map((entity) => `${entity.id} (${entity.title})`);
  assert.deepEqual(clones, []);
});

test('o Brasil é uma só entidade e herdou o que a cópia enciclopédica trazia', () => {
  const brazil = entities.filter((entity) => fold(entity.title) === 'brasil');
  assert.deepEqual(
    brazil.map((entity) => entity.id),
    ['country-brazil'],
  );
  assert.equal(
    entities.some((entity) => entity.id === 'wiki-topic-brasil'),
    false,
  );
  assert.equal(brazil[0].externalIds?.wikidata, 'Q155');
});
