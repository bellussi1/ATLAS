import { safeDiscoveryOrigin } from '@core/content/queries/discovery-index';
import { queryKnowledgeRelations } from '@core/content/queries/knowledge-graph';
import { methodologyKnowledgeGraph } from '@testing/content-fixture';

describe('Marxism atlas content', () => {
  it('integrates a diverse reconciled Wikimedia snapshot without duplicating legacy records', () => {
    const atlas = methodologyKnowledgeGraph.atlases.find((item) => item.id === 'atlas-marx-valor')!;
    const entities = methodologyKnowledgeGraph.atlases.flatMap((item) => item.entities);
    const records = atlas.entityIds.map((id) => entities.find((entity) => entity.id === id)!);
    // 27 curated and imported records plus 15 from the Wikidata discovery selection.
    expect(records).toHaveLength(42);
    expect(new Set(records.map((entity) => entity.id)).size).toBe(records.length);
    expect(records.filter((entity) => entity.kind === 'person').length).toBeGreaterThanOrEqual(13);
    expect(records.some((entity) => entity.kind === 'work')).toBe(true);
    expect(records.some((entity) => entity.kind === 'event')).toBe(true);
    expect(records.some((entity) => entity.kind === 'institution')).toBe(true);
    expect(records.some((entity) => entity.kind === 'concept')).toBe(true);
    const imported = records.filter((entity) => Boolean(entity.externalIds?.wikidata));
    expect(imported).toHaveLength(39);
    expect(imported.every((entity) => entity.editorialStatus === 'pending')).toBe(true);
    expect(imported.every((entity) => Boolean(entity.discoveryMetadata?.wikipediaUrl))).toBe(true);
    const reconciledQids = imported.map((entity) => entity.externalIds?.wikidata).filter(Boolean);
    expect(new Set(reconciledQids).size).toBe(reconciledQids.length);
    expect(entities.filter((entity) => entity.id === 'person-karl-marx')).toHaveLength(1);
  });

  it('keeps discovery links distinct from sourced Wikidata statements and gates Commons media', () => {
    const atlas = methodologyKnowledgeGraph.atlases.find((item) => item.id === 'atlas-marx-valor')!;
    const discovery = atlas.relations.filter((relation) => relation.type === 'encyclopedic-link');
    const structured = atlas.relations.filter(
      (relation) => relation.provenance?.source === 'wikidata',
    );
    expect(discovery.length).toBeGreaterThan(0);
    expect(discovery.every((relation) => relation.provenance?.source === 'wikipedia')).toBe(true);
    expect(discovery.every((relation) => relation.editorialStatus === 'pending')).toBe(true);
    expect(structured.length).toBeGreaterThan(0);
    expect(structured.every((relation) => relation.evidenceIds.length > 0)).toBe(true);
    const authorship = structured.filter((relation) => relation.type === 'authored');
    // Authorship from Wikidata P50 for the Marxist works now included in the reading.
    expect(authorship).toHaveLength(6);
    expect(authorship.some((r) => r.toEntityId === 'work-communist-manifesto')).toBe(true);
    expect(
      authorship.every(
        (relation) =>
          relation.fromEntityId.startsWith('person-') && relation.toEntityId.startsWith('work-'),
      ),
    ).toBe(true);
    expect(new Set(atlas.sources.map((source) => source.id)).size).toBe(atlas.sources.length);
    expect(new Set(atlas.evidences.map((evidence) => evidence.id)).size).toBe(
      atlas.evidences.length,
    );
    expect(new Set(atlas.assetLicenses.map((asset) => asset.id)).size).toBe(
      atlas.assetLicenses.length,
    );
    expect(
      atlas.assetLicenses
        .filter((asset) => Boolean(asset.entityId))
        .every(
          (asset) =>
            asset.status === 'known' &&
            asset.reproduction === 'allowed' &&
            Boolean(asset.license && asset.licenseUrl && asset.attribution && asset.filePageUrl),
        ),
    ).toBe(true);
    expect(
      atlas.reviews.every((review) => review.status === 'pending' && review.reviewer === null),
    ).toBe(true);
  });

  it('registers sourced records with pending reviews and documented directed relations', () => {
    const atlas = methodologyKnowledgeGraph.atlases.find((item) => item.id === 'atlas-marx-valor')!;
    expect(atlas.entities).toHaveLength(42);
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
    expect(safeDiscoveryOrigin('/leitura/marxismo?argumento=marx&vinculo=critica#conceitos')).toBe(
      '/leitura/marxismo?argumento=marx&vinculo=critica#conceitos',
    );
    expect(safeDiscoveryOrigin('/marxismo')).toBe('/marxismo');
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
