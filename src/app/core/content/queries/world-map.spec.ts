import type { KnowledgeGraph } from '@core/content/models/content-schema';

import {
  buildWorldMapArc,
  buildWorldMapModel,
  filterWorldMap,
  mapQueryParamsForEntity,
  pickSurpriseCandidate,
  placeMapLabels,
  projectNaturalEarth,
} from './world-map';

describe('world map queries', () => {
  it('projects coordinates inside the 960x500 Natural Earth frame and orders west before east', () => {
    const brazil = projectNaturalEarth(-14.235, -51.9253);
    const germany = projectNaturalEarth(51.1657, 10.4515);
    const japan = projectNaturalEarth(36.2048, 138.2529);

    expect(brazil.x).toBeGreaterThan(200);
    expect(brazil.x).toBeLessThan(germany.x);
    expect(germany.x).toBeLessThan(japan.x);
    expect(brazil.y).toBeGreaterThan(germany.y);
    expect(buildWorldMapArc(brazil, germany)).toMatch(
      /^M[\d.]+ [\d.]+Q[\d.]+ [\d.]+ [\d.]+ [\d.]+$/,
    );
  });

  it('merges country entities sharing isoNumeric, applies strict temporal filtering, and builds cross-border connections', () => {
    const graph: KnowledgeGraph = {
      id: 'knowledge-graph-atlas',
      version: '1.1.0',
      updatedAt: '2026-11-18',
      atlases: [
        {
          id: 'atlas-teste',
          slug: 'teste',
          title: 'Teste',
          description: 'Atlas de teste.',
          version: '1.0.0',
          updatedAt: '2026-11-18',
          entityIds: [],
          sources: [],
          evidences: [],
          citations: [],
          reviews: [],
          assetLicenses: [],
          claims: [],
          learningPaths: [],
          entities: [
            {
              id: 'country-brazil',
              slug: 'brasil',
              title: 'Brasil',
              summary: 'República Federativa do Brasil.',
              aliases: [],
              context: 'Contexto.',
              temporalExtent: null,
              uncertainty: 'low' as const,
              revision: 1,
              sections: [{ heading: 'Resumo', paragraphs: ['Texto.'] }],
              kind: 'place' as const,
              placeType: 'country' as const,
              placeCategory: 'country' as const,
              isoAlpha2: 'BR',
              isoNumeric: '076',
              coordinates: { lat: -14.235, lon: -51.9253 },
              countryProfile: {
                officialName: 'República Federativa do Brasil',
                territorialScope: 'Escopo 1988.',
                identityNote: 'Nota.',
                evidenceIds: ['ev-1'],
              },
            },
            {
              id: 'wiki-topic-alemanha',
              slug: 'alemanha',
              title: 'Alemanha',
              summary: 'Alemanha moderna.',
              aliases: [],
              context: 'Contexto.',
              temporalExtent: null,
              uncertainty: 'low' as const,
              revision: 1,
              sections: [{ heading: 'Resumo', paragraphs: ['Texto.'] }],
              kind: 'place' as const,
              placeCategory: 'country' as const,
              isoAlpha2: 'DE',
              isoNumeric: '276',
              coordinates: { lat: 51.1657, lon: 10.4515 },
            },
            {
              id: 'wiki-topic-alemanha-nazista',
              slug: 'alemanha-nazista',
              title: 'Alemanha Nazista',
              summary: 'Regime de 1933–1945.',
              aliases: [],
              context: 'Contexto.',
              temporalExtent: {
                startYear: 1933,
                endYear: 1945,
                precision: 'range' as const,
                label: null,
              },
              uncertainty: 'low' as const,
              revision: 1,
              sections: [{ heading: 'Resumo', paragraphs: ['Texto.'] }],
              kind: 'place' as const,
              placeCategory: 'country' as const,
              coordinates: { lat: 52.51, lon: 13.38 },
            },
            {
              id: 'regime-brazil-constitution-1988',
              slug: 'brasil-recorte-constitucional-1988',
              title: 'Brasil: recorte constitucional de 1988',
              summary: 'Estado democrático de direito.',
              aliases: [],
              context: 'Contexto.',
              temporalExtent: {
                startYear: 1988,
                endYear: null,
                precision: 'year' as const,
                label: null,
              },
              uncertainty: 'low' as const,
              revision: 1,
              sections: [{ heading: 'Resumo', paragraphs: ['Texto.'] }],
              kind: 'place' as const,
              placeType: 'regime' as const,
              regimeProfile: {
                countryIds: ['country-brazil'],
                periodNote: '1988.',
                classifications: [
                  {
                    label: 'Estado democrático de direito',
                    attribution: 'Constituição de 1988',
                    edition: '1988',
                    limits: 'Texto formal.',
                    evidenceIds: ['ev-1'],
                  },
                ],
              },
            },
            {
              id: 'event-dated-1942',
              slug: 'feb-1942',
              title: 'Participação na Segunda Guerra',
              summary: 'Evento datado.',
              aliases: [],
              context: 'Contexto.',
              temporalExtent: {
                startYear: 1942,
                endYear: 1945,
                precision: 'range' as const,
                label: null,
              },
              uncertainty: 'low' as const,
              revision: 1,
              sections: [{ heading: 'Resumo', paragraphs: ['Texto.'] }],
              kind: 'event' as const,
            },
            {
              id: 'concept-undated',
              slug: 'conceito-sem-data',
              title: 'Conceito sem data',
              summary: 'Sem recorte estrito.',
              aliases: [],
              context: 'Contexto.',
              temporalExtent: null,
              uncertainty: 'unknown' as const,
              revision: 1,
              sections: [{ heading: 'Resumo', paragraphs: ['Texto.'] }],
              kind: 'concept' as const,
            },
          ],
          relations: [
            {
              id: 'rel-br-dated',
              fromEntityId: 'event-dated-1942',
              toEntityId: 'country-brazil',
              type: 'documented-association' as const,
              label: 'envolveu',
              reverseLabel: 'participou de',
              context: 'Brasil e Alemanha no conflito.',
              temporalExtent: {
                startYear: 1942,
                endYear: 1945,
                precision: 'range' as const,
                label: null,
              },
              uncertainty: 'low' as const,
              evidenceIds: ['ev-1'],
            },
            {
              id: 'rel-de-dated',
              fromEntityId: 'event-dated-1942',
              toEntityId: 'wiki-topic-alemanha-nazista',
              type: 'documented-association' as const,
              label: 'envolveu',
              reverseLabel: 'participou de',
              context: 'Conflito.',
              temporalExtent: {
                startYear: 1942,
                endYear: 1945,
                precision: 'range' as const,
                label: null,
              },
              uncertainty: 'low' as const,
              evidenceIds: ['ev-1'],
            },
            {
              id: 'rel-br-undated',
              fromEntityId: 'concept-undated',
              toEntityId: 'country-brazil',
              type: 'documented-association' as const,
              label: 'aplica-se a',
              reverseLabel: 'vincula-se a',
              context: 'Conceito sem data.',
              temporalExtent: null,
              uncertainty: 'unknown' as const,
              evidenceIds: ['ev-1'],
            },
          ],
        },
      ],
    };

    const model = buildWorldMapModel(graph, [
      { isoNumeric: '076', name: 'Brazil', cx: 347.3, cy: 281.4, lat: -10.84, lon: -53.12 },
      { isoNumeric: '276', name: 'Germany', cx: 502.6, cy: 101.1, lat: 51.09, lon: 10.37 },
    ]);

    expect(model.territories.map((t) => t.id)).toContain('country-brazil');
    expect(model.territories.find((t) => t.id === 'wiki-topic-alemanha-nazista')?.layer).toBe(
      'polity',
    );
    expect(model.connections.length).toBeGreaterThanOrEqual(1);
    expect(model.hotpoints.length).toBe(2);
    expect(model.hotpoints.map((hp) => hp.year)).toEqual([1942, 1988]);
    expect(model.hotpoints[0]).toMatchObject({
      slug: 'feb-1942',
      yearFrom: 1942,
      yearTo: 1945,
      territoryId: 'country-brazil',
      territoryTitle: 'Brasil',
      focusLat: -14.235,
      focusLon: -51.9253,
    });
    expect(model.hotpoints[1]).toMatchObject({
      slug: 'brasil-recorte-constitucional-1988',
      yearFrom: 1988,
      yearTo: 1992,
      territoryId: 'country-brazil',
    });

    const ww2Slice = filterWorldMap(model, {
      yearFrom: 1914,
      yearTo: 1945,
      includeUndated: false,
      families: null,
      layers: null,
    });
    expect(ww2Slice.territoryMap.has('wiki-topic-alemanha-nazista')).toBe(true);
    expect(ww2Slice.excludedUndatedRecords).toBe(1);
    expect(ww2Slice.territoryMap.get('country-brazil')?.activeRegimes).toHaveLength(0);

    const post1988 = filterWorldMap(model, {
      yearFrom: 1988,
      yearTo: 2026,
      includeUndated: false,
      families: null,
      layers: null,
    });
    expect(post1988.territoryMap.has('wiki-topic-alemanha-nazista')).toBe(false);
    expect(post1988.territoryMap.get('country-brazil')?.activeRegimes).toHaveLength(1);

    const labels = placeMapLabels(ww2Slice.activeTerritories, {
      selectedTerritoryId: 'country-brazil',
      hoveredTerritoryId: null,
      highlightedIds: null,
      view: { x: 0, y: 0, k: 1 },
    });
    expect(labels.find((l) => l.territoryId === 'country-brazil')?.priority).toBe('selected');

    expect(mapQueryParamsForEntity(graph.atlases[0].entities[0], graph)).toEqual({
      pais: 'brasil',
    });
    expect(mapQueryParamsForEntity(graph.atlases[0].entities[3], graph)).toEqual({
      pais: 'brasil',
      ano: '1988',
    });
    expect(mapQueryParamsForEntity(graph.atlases[0].entities[4], graph)).toEqual({
      entidade: 'feb-1942',
      ano: '1942',
    });
    expect(pickSurpriseCandidate(model)).not.toBeNull();
  });
});
