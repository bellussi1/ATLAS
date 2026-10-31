import { methodologyKnowledgeGraph } from './content-repository';
import { safeDiscoveryOrigin } from './discovery-index';
import { queryKnowledgeRelations } from './knowledge-graph';

describe('Marxism atlas content', () => {
  it('registers sourced records with pending reviews and documented directed relations', () => {
    const atlas = methodologyKnowledgeGraph.atlases.find((item) => item.id === 'atlas-marx-valor')!;
    expect(atlas.entities).toHaveLength(5);
    expect(
      atlas.claims.every(
        (claim) => claim.editorialStatus === 'pending' && claim.citationIds.length > 0,
      ),
    ).toBe(true);
    expect(
      atlas.reviews.every((review) => review.status === 'pending' && review.reviewer === null),
    ).toBe(true);
    expect(
      queryKnowledgeRelations(methodologyKnowledgeGraph, 'person-karl-marx').map(
        (item) => item.label,
      ),
    ).toContain('analisa criticamente');
    expect(
      queryKnowledgeRelations(methodologyKnowledgeGraph, 'person-adam-smith').map(
        (item) => item.label,
      ),
    ).toContain('é analisado criticamente por');
  });
  it('only accepts a valid local map context', () => {
    expect(safeDiscoveryOrigin('/atlas/marxismo')).toBe('/atlas/marxismo');
    expect(
      safeDiscoveryOrigin('/atlas/marxismo/valor-e-trabalho?argumento=marx&vinculo=critica'),
    ).toBe('/atlas/marxismo/valor-e-trabalho?argumento=marx&vinculo=critica');
    expect(safeDiscoveryOrigin('/atlas/marxismo/valor-e-trabalho?argumento=outro')).toBeNull();
    expect(safeDiscoveryOrigin('/atlas/marxismo?destino=https://example.org')).toBeNull();
    expect(safeDiscoveryOrigin('/atlas/marxismo?argumento=marx')).toBe(
      '/atlas/marxismo?argumento=marx',
    );
    expect(safeDiscoveryOrigin('/atlas/marxismo?argumento=marx&vinculo=critica')).toBe(
      '/atlas/marxismo?argumento=marx&vinculo=critica',
    );
    expect(safeDiscoveryOrigin('/atlas/marxismo?argumento=marx&vinculo=invalido')).toBeNull();
    expect(safeDiscoveryOrigin('/atlas/marxismo?argumento=outro')).toBeNull();
    expect(safeDiscoveryOrigin('https://example.org/atlas/marxismo?argumento=marx')).toBeNull();
  });
});
