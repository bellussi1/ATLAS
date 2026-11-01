import { TestBed } from '@angular/core/testing';

import { LiberalismAtlasPage } from '../pages/liberalism-atlas-page';
import { methodologyKnowledgeGraph } from './content-repository';
import { queryKnowledgeRelations } from './knowledge-graph';

describe('Liberalism atlas snapshot', () => {
  const atlas = methodologyKnowledgeGraph.atlases.find((item) => item.id === 'atlas-liberalism');

  it('loads the required real entities with Wikipedia and Wikidata identifiers', () => {
    expect(atlas).toBeDefined();
    const entities = methodologyKnowledgeGraph.atlases.flatMap((item) => item.entities);
    const wikidataIds = entities.flatMap((entity) => entity.externalIds?.wikidata ?? []);
    expect(wikidataIds).toEqual(
      expect.arrayContaining([
        'Q6216',
        'Q9353',
        'Q9381',
        'Q50020',
        'Q15975',
        'Q140694',
        'Q1325',
        'Q205162',
        'Q794394',
        'Q201712',
        'Q162719',
        'Q189508',
        'Q192769',
        'Q6534',
      ]),
    );
    expect(
      entities
        .filter((entity) => wikidataIds.includes(entity.externalIds?.wikidata ?? ''))
        .every((entity) =>
          Boolean(entity.discoveryMetadata?.wikipediaUrl && entity.externalIds?.wikipedia),
        ),
    ).toBe(true);
    expect(
      entities
        .filter((entity) => wikidataIds.includes(entity.externalIds?.wikidata ?? ''))
        .every((entity) => entity.editorialStatus === 'pending'),
    ).toBe(true);
    expect(
      entities
        .filter((entity) => wikidataIds.includes(entity.externalIds?.wikidata ?? ''))
        .every((entity) => entity.summary.length < 260),
    ).toBe(true);
  });

  it('marks encyclopedic discovery links as pending rather than validated historical relations', () => {
    expect(atlas).toBeDefined();
    expect(atlas?.relations.length).toBeGreaterThan(0);
    expect(
      atlas?.relations.every((relation) =>
        Boolean(relation.editorialStatus === 'pending' && relation.provenance),
      ),
    ).toBe(true);
    expect(atlas?.relations.some((relation) => relation.type === 'encyclopedic-link')).toBe(true);
    expect(
      queryKnowledgeRelations(methodologyKnowledgeGraph, 'ideology-liberalism', {
        atlasId: 'atlas-liberalism',
      }).length,
    ).toBeGreaterThan(0);
    expect(atlas?.reviews).toEqual([]);
    expect(
      atlas?.relations.some(
        (relation) => relation.type === 'related_to' && relation.evidenceIds.length > 0,
      ),
    ).toBe(true);
  });

  it('only exposes Commons media with file page, license and attribution metadata', () => {
    expect(atlas).toBeDefined();
    expect(atlas?.assetLicenses.length).toBeGreaterThan(0);
    expect(
      atlas?.assetLicenses.every(
        (asset) =>
          asset.status === 'known' &&
          asset.license &&
          asset.licenseUrl &&
          asset.filePageUrl &&
          asset.sourceUrl &&
          asset.attribution &&
          asset.entityId,
      ),
    ).toBe(true);
  });

  it('opens an entity context and returns to the exact previous selection', () => {
    const page = TestBed.runInInjectionContext(() => new LiberalismAtlasPage());
    expect(page.entities()).toHaveLength(page.atlas().entities.length);
    page.openEntity('person-john-locke');
    expect(page.selected()?.title).toBe('John Locke');
    expect(page.history()).toEqual(['ideology-liberalism']);
    page.openEntity('person-john-locke');
    expect(page.history()).toEqual(['ideology-liberalism']);
    page.returnContext();
    expect(page.selected()?.title).toBe('Liberalismo');
    expect(page.history()).toEqual([]);
  });

  it('provides dated people and events and only fully licensed media to the views', () => {
    const page = TestBed.runInInjectionContext(() => new LiberalismAtlasPage());
    expect(page.timelineEntities().some((entity) => entity.kind === 'event')).toBe(true);
    expect(page.timelineEntities().some((entity) => entity.kind === 'person')).toBe(true);
    expect(
      page
        .media()
        .every((item) =>
          Boolean(item.asset.licenseUrl && item.asset.filePageUrl && item.asset.attribution),
        ),
    ).toBe(true);
    expect(page.unconnectedEntityCount()).toBeGreaterThan(0);
  });
});
