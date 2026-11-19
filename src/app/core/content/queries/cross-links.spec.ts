import {
  itinerariesForEntity,
  itinerariesForReading,
  readingRootNodeId,
  readingsForEntity,
} from './cross-links';

describe('cross-links', () => {
  it('resolves root graph nodes and itineraries for published readings', () => {
    expect(readingRootNodeId('marxismo')).toBe('ideology-marxism');
    expect(readingRootNodeId('liberalismo')).toBe('ideology-liberalism');
    expect(readingRootNodeId('desconhecido')).toBeNull();

    const marxItineraries = itinerariesForReading('marxismo');
    expect(marxItineraries.map((it) => it.slug)).toEqual(
      expect.arrayContaining(['comparativo-liberdade', 'capitalismo-trabalho-e-industrializacao']),
    );
    expect(marxItineraries[0]?.path).toBe(`/itinerario/${marxItineraries[0]?.slug}`);
  });

  it('resolves continuous readings by entity id, slug, or collection id', () => {
    expect(readingsForEntity('person-karl-marx')).toEqual([
      { slug: 'marxismo', title: 'Marxismo', path: '/leitura/marxismo' },
    ]);
    expect(readingsForEntity('wiki-topic-getulio-vargas', 'getulio-vargas')).toEqual([
      { slug: 'trabalhismo', title: 'Trabalhismo', path: '/leitura/trabalhismo' },
    ]);
    expect(readingsForEntity('wiki-topic-outro', undefined, 'atlas-liberalismo')).toEqual([
      { slug: 'liberalismo', title: 'Liberalismo', path: '/leitura/liberalismo' },
    ]);
    expect(readingsForEntity('wiki-topic-stalinismo', 'stalinismo', 'atlas-stalinismo')).toEqual(
      [],
    );
    expect(
      readingsForEntity('wiki-topic-stalinismo', 'stalinismo', 'atlas-stalinismo', () => false),
    ).toEqual([{ slug: 'stalinismo', title: 'Stalinismo', path: '/leitura/stalinismo' }]);
  });

  it('resolves itineraries for entities statically and complements from bundled data', () => {
    const vargasItineraries = itinerariesForEntity('wiki-topic-getulio-vargas', 'getulio-vargas');
    expect(vargasItineraries.map((it) => it.slug)).toContain('trabalhismo-e-estado-social');

    const dynamicOnly = itinerariesForEntity('custom-entity', 'custom-slug', {
      extra: {
        slug: 'percurso-dinamico',
        title: 'Percurso Dinâmico',
        kind: 'conceitual',
        stops: [{ contextEntityId: 'custom-entity', destination: { type: 'grafo' } }],
        branches: [],
      },
    });
    expect(dynamicOnly).toEqual([
      {
        slug: 'percurso-dinamico',
        title: 'Percurso Dinâmico',
        path: '/itinerario/percurso-dinamico',
        kindLabel: 'Itinerário conceitual',
      },
    ]);
  });
});
