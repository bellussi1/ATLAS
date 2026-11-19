import './register-source-modules.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

import { applyGeo, extractCoordinates } from './enrich-wikidata-geo.mjs';

function makePlace(overrides = {}) {
  return {
    id: 'wiki-topic-brasil',
    slug: 'brasil',
    title: 'Brasil',
    summary: 'País da América do Sul.',
    aliases: [],
    context: 'Registro enciclopédico.',
    temporalExtent: null,
    uncertainty: 'low',
    revision: 1,
    sections: [{ heading: 'Resumo', paragraphs: ['Texto de teste.'] }],
    kind: 'place',
    placeCategory: 'country',
    externalIds: { wikidata: 'Q155', wikipedia: 'Brasil' },
    ...overrides,
  };
}

function makeGraph(entities) {
  return {
    id: 'knowledge-graph-atlas',
    version: '1.1.0',
    updatedAt: '2026-11-17',
    atlases: [
      {
        id: 'atlas-teste',
        title: 'Teste',
        version: '1.0.0',
        updatedAt: '2026-11-17',
        sources: [],
        assetLicenses: [],
        claims: [],
        relations: [],
        entities,
      },
    ],
  };
}

test('extractCoordinates arredonda para 4 casas e rejeita globos fora da Terra', () => {
  const nonEarth = extractCoordinates({
    P625: [
      {
        rank: 'normal',
        mainsnak: {
          datavalue: {
            value: {
              latitude: 12.34567,
              longitude: -45.67891,
              globe: 'http://www.wikidata.org/entity/Q111',
            },
          },
        },
      },
      {
        rank: 'normal',
        mainsnak: {
          datavalue: {
            value: {
              latitude: -15.793889,
              longitude: -47.882778,
              globe: 'http://www.wikidata.org/entity/Q2',
            },
          },
        },
      },
    ],
  });
  assert.deepEqual(nonEarth, { lat: -15.7939, lon: -47.8828 });
});

test('applyGeo preenche coordenadas e ISO em país moderno mantendo temporalExtent nulo', () => {
  const brazil = makePlace({ id: 'country-brazil', externalIds: undefined });
  const graph = makeGraph([brazil]);
  const claimsByQid = {
    Q155: {
      P625: [
        {
          rank: 'normal',
          mainsnak: { datavalue: { value: { latitude: -14.235, longitude: -51.9253 } } },
        },
      ],
      P297: [{ rank: 'normal', mainsnak: { datavalue: { value: 'BR' } } }],
      P299: [{ rank: 'normal', mainsnak: { datavalue: { value: '076' } } }],
      P571: [
        {
          rank: 'normal',
          mainsnak: { datavalue: { value: { time: '+1822-09-07T00:00:00Z', precision: 11 } } },
        },
      ],
    },
  };

  const first = applyGeo(graph, { claimsByQid });
  assert.equal(first.withCoordinates, 1);
  assert.equal(first.countriesWithIso, 1);
  assert.deepEqual(brazil.coordinates, { lat: -14.235, lon: -51.9253 });
  assert.equal(brazil.isoAlpha2, 'BR');
  assert.equal(brazil.isoNumeric, '076');
  assert.equal(brazil.temporalExtent, null);

  const second = applyGeo(graph, { claimsByQid });
  assert.equal(second.changed, false);
});

test('applyGeo omite códigos ISO e preenche temporalExtent em formações históricas dissolvidas', () => {
  const ddr = makePlace({
    id: 'wiki-topic-alemanha-oriental',
    slug: 'alemanha-oriental',
    title: 'Alemanha Oriental',
    externalIds: { wikidata: 'Q16957', wikipedia: 'Alemanha Oriental' },
  });
  const graph = makeGraph([ddr]);
  const claimsByQid = {
    Q16957: {
      P625: [
        {
          rank: 'normal',
          mainsnak: { datavalue: { value: { latitude: 52.5167, longitude: 13.3833 } } },
        },
      ],
      P297: [{ rank: 'normal', mainsnak: { datavalue: { value: 'DD' } } }],
      P299: [{ rank: 'normal', mainsnak: { datavalue: { value: '278' } } }],
      P571: [
        {
          rank: 'normal',
          mainsnak: { datavalue: { value: { time: '+1949-10-07T00:00:00Z', precision: 11 } } },
        },
      ],
      P576: [
        {
          rank: 'normal',
          mainsnak: { datavalue: { value: { time: '+1990-10-03T00:00:00Z', precision: 11 } } },
        },
      ],
    },
  };

  const result = applyGeo(graph, { claimsByQid });
  assert.equal(result.historicalPolitiesDated, 1);
  assert.equal(ddr.isoAlpha2, undefined);
  assert.equal(ddr.isoNumeric, undefined);
  assert.deepEqual(ddr.temporalExtent, {
    startYear: 1949,
    endYear: 1990,
    precision: 'range',
    label: null,
  });
});
