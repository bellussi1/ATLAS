import assert from 'node:assert/strict';
import { test } from 'node:test';

import { entitiesByQid, hasLens, lensQids, resolveLens } from './belonging.mjs';

const atlases = [
  {
    id: 'atlas-a',
    entities: [
      { id: 'topic-root', externalIds: { wikidata: 'Q1' } },
      { id: 'person-a', externalIds: { wikidata: 'Q2' } },
    ],
  },
  {
    id: 'atlas-b',
    entities: [{ id: 'event-b', externalIds: { wikidata: 'Q3' } }, { id: 'no-qid' }],
  },
];

test('a raiz entra na lente e QIDs repetidos não duplicam a lista', () => {
  const registry = { rootQid: 'Q1', belonging: { qids: ['Q2', 'Q1', 'Q2'] } };
  assert.deepEqual(lensQids(registry), ['Q1', 'Q2']);
  assert.deepEqual(lensQids({ rootQid: 'Q9' }), ['Q9']);
});

test('sem QIDs aceitos não há lente: a coleção focal continua sendo a unidade', () => {
  assert.equal(hasLens({ rootQid: 'Q1', belonging: { qids: [] } }), false);
  assert.equal(hasLens({ rootQid: 'Q1' }), false);
  assert.equal(hasLens({ rootQid: 'Q1', belonging: { qids: ['Q2'] } }), true);
});

test('a lente resolve QIDs em qualquer coleção, sem mover a entidade', () => {
  const lens = resolveLens(atlases, ['Q1', 'Q2', 'Q3']);
  assert.deepEqual([...lens.ids], ['topic-root', 'person-a', 'event-b']);
  assert.deepEqual(
    lens.entities.map(({ qid, atlas, entity }) => `${qid}@${atlas.id}:${entity.id}`),
    ['Q1@atlas-a:topic-root', 'Q2@atlas-a:person-a', 'Q3@atlas-b:event-b'],
  );
  assert.deepEqual(lens.missing, []);
});

test('QID ausente é preservado para o relatório e não vira entidade fantasma', () => {
  const lens = resolveLens(atlases, ['Q1', 'Q404']);
  assert.deepEqual([...lens.ids], ['topic-root']);
  assert.deepEqual(lens.missing, ['Q404']);
});

test('QIDs repetidos em coleções diferentes resolvem uma vez, na primeira coleção', () => {
  const duplicated = [
    ...atlases,
    {
      id: 'atlas-c',
      entities: [{ id: 'person-a-copy', externalIds: { wikidata: 'Q2' } }],
    },
  ];
  assert.equal(entitiesByQid(duplicated).get('Q2').entity.id, 'person-a');
  assert.deepEqual([...resolveLens(duplicated, ['Q2']).ids], ['person-a']);
});
