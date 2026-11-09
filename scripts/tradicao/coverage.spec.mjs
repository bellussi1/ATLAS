import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkFloor, flatten, loadFloor, measure, measureTradition } from './coverage.mjs';

const references = ['marxismo', 'liberalismo'];

test('as leituras de referência cumprem o piso de cobertura', async () => {
  const floor = await loadFloor();
  for (const slug of references) {
    const gaps = checkFloor(await measureTradition(slug), floor);
    assert.deepEqual(gaps, [], `${slug} abaixo do piso: ${JSON.stringify(gaps)}`);
  }
});

test('o piso nunca excede o menor valor medido nas referências', async () => {
  const floor = await loadFloor();
  const [a, b] = await Promise.all(references.map(async (s) => flatten(await measureTradition(s))));
  for (const [metric, minimum] of Object.entries(floor.minimum))
    assert.ok(
      minimum <= Math.min(a[metric], b[metric]),
      `${metric}: piso ${minimum} acima da referência`,
    );
  for (const [metric, maximum] of Object.entries(floor.maximum))
    assert.ok(
      maximum >= Math.max(a[metric], b[metric]),
      `${metric}: teto ${maximum} abaixo da referência`,
    );
});

test('o piso exige as dimensões da régua: entidades, relações, fontes, capítulos, blocos e imagens', async () => {
  const { minimum } = await loadFloor();
  for (const prefix of ['entities.', 'relations.', 'sources.', 'chapters.', 'blocks.', 'images.'])
    assert.ok(
      Object.keys(minimum).some((metric) => metric.startsWith(prefix)),
      `piso sem métrica de ${prefix}`,
    );
});

test('uma tradição vazia falha em todas as dimensões, e uma leitura rascunho não passa por completa', () => {
  const atlas = {
    id: 'atlas-x',
    entities: [{ id: 'person-a', kind: 'person' }],
    relations: [],
    sources: [],
    assetLicenses: [],
  };
  const chapters = Array.from({ length: 12 }, (_, i) => ({
    id: `c${i}`,
    coverage: 'pending',
    blocks: [],
    sourceIds: [],
  }));
  const page = {
    slug: 'x',
    published: false,
    review: { status: 'rascunho' },
    atlasId: 'atlas-x',
    portrait: null,
    chapters,
  };
  const metrics = measure({ page, supplement: { sources: [], edges: [] }, atlases: [atlas] });
  assert.equal(metrics.entities.pessoa, 1);
  assert.equal(metrics.chapters.pendentes, 12);
  const gaps = checkFloor(metrics, {
    minimum: { 'entities.pessoa': 2, 'images.licenciadas': 1 },
    maximum: { 'chapters.pendentes': 1 },
  });
  assert.deepEqual(gaps.map((g) => g.metric).sort(), [
    'chapters.pendentes',
    'entities.pessoa',
    'images.licenciadas',
  ]);
});

test('só imagem conhecida, reproduzível e de entidade do escopo conta', () => {
  const asset = (id, entityId, status, reproduction) => ({
    id,
    entityId,
    status,
    reproduction,
  });
  const atlas = {
    id: 'atlas-x',
    entities: [
      { id: 'person-a', kind: 'person' },
      { id: 'person-b', kind: 'person' },
    ],
    relations: [],
    sources: [],
    assetLicenses: [
      asset('ok', 'person-a', 'known', 'allowed'),
      asset('bloqueada', 'person-b', 'unknown', 'blocked'),
      asset('fora', 'person-z', 'known', 'allowed'),
    ],
  };
  const page = {
    slug: 'x',
    published: false,
    review: { status: 'rascunho' },
    atlasId: 'atlas-x',
    portrait: null,
    chapters: [],
  };
  const metrics = measure({ page, supplement: {}, atlases: [atlas] });
  assert.equal(metrics.images.licenciadas, 1);
  assert.equal(metrics.images.entidadesComImagem, 1);
});

test('a lente mede as entidades onde elas estão e ignora o que ficou fora dela', () => {
  const atlasA = {
    id: 'atlas-a',
    entities: [
      { id: 'topic-root', kind: 'ideology', externalIds: { wikidata: 'Q1' } },
      { id: 'person-a', kind: 'person', externalIds: { wikidata: 'Q2' } },
      { id: 'person-extra', kind: 'person' },
    ],
    relations: [],
    sources: [{ id: 'src-topic-root' }, { id: 'src-person-a' }, { id: 'src-person-extra' }],
    claims: [],
    citations: [],
    evidences: [],
    assetLicenses: [],
  };
  const atlasB = {
    id: 'atlas-b',
    entities: [{ id: 'event-b', kind: 'event', externalIds: { wikidata: 'Q3' } }],
    relations: [
      {
        id: 'relation-1',
        fromEntityId: 'person-a',
        toEntityId: 'event-b',
        type: 'participated_in',
        evidenceIds: ['ev-1'],
      },
    ],
    sources: [{ id: 'src-event-b' }],
    claims: [],
    citations: [],
    evidences: [{ id: 'ev-1', sourceId: 'src-event-b' }],
    assetLicenses: [
      {
        id: 'asset-1',
        entityId: 'event-b',
        status: 'known',
        reproduction: 'allowed',
      },
    ],
  };
  const page = {
    slug: 'x',
    published: false,
    review: { status: 'rascunho' },
    atlasId: 'atlas-a',
    portrait: null,
    chapters: [],
  };
  const metrics = measure({
    page,
    supplement: {},
    atlases: [atlasA, atlasB],
    qids: ['Q1', 'Q2', 'Q3', 'Q404'],
  });
  assert.equal(metrics.entities.total, 3);
  assert.equal(metrics.entities.pessoa, 1);
  assert.equal(metrics.entities.evento, 1);
  assert.equal(metrics.relations.grafo, 1);
  assert.equal(metrics.relations.documentadas, 1);
  assert.equal(metrics.sources.total, 3);
  assert.equal(metrics.images.licenciadas, 1);
  assert.deepEqual(
    {
      qids: metrics.lens.qids,
      resolved: metrics.lens.resolved,
      missing: metrics.lens.missingQids,
    },
    { qids: 4, resolved: 3, missing: ['Q404'] },
  );
});
