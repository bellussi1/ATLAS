import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { queryKnowledgeRelations } from '@core/content/queries/knowledge-graph';
import { IdeologyAtlasComponent } from '@ideologies/components/ideology-atlas/ideology-atlas.component';
import { provideContentFixture } from '@testing/content-fixture';
import { methodologyKnowledgeGraph } from '@testing/content-fixture';

describe('Liberalism atlas snapshot', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ providers: [...provideContentFixture(), provideRouter([])] }),
  );
  function createAtlas() {
    const fixture = TestBed.createComponent(IdeologyAtlasComponent);
    fixture.componentRef.setInput('atlasId', 'atlas-liberalism');
    fixture.componentRef.setInput('rootEntityId', 'ideology-liberalism');
    fixture.componentRef.setInput('origin', '/liberalismo');
    return fixture.componentInstance;
  }

  it('preserves arbitrary entity roots using compiled geometry', () => {
    const fixture = TestBed.createComponent(IdeologyAtlasComponent);
    fixture.componentRef.setInput('atlasId', 'atlas-liberalism');
    fixture.componentRef.setInput('rootEntityId', 'person-john-locke');
    fixture.componentRef.setInput('origin', '/liberalismo');
    expect(
      fixture.componentInstance.graphNodes().find((node) => node.entity.id === 'person-john-locke'),
    ).toMatchObject({ x: 460, y: 286 });
  });
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
    const page = createAtlas();
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

  it('keeps the textual relation list synchronized with the graph filter', () => {
    const fixture = TestBed.createComponent(IdeologyAtlasComponent);
    fixture.componentRef.setInput('atlasId', 'atlas-liberalism');
    fixture.componentRef.setInput('rootEntityId', 'ideology-liberalism');
    fixture.componentRef.setInput('origin', '/liberalismo');
    fixture.componentRef.setInput('continuous', true);
    fixture.detectChanges();

    const page = fixture.componentInstance;
    const candidate = page.entities().find((entity) => {
      const types = new Set(
        queryKnowledgeRelations(methodologyKnowledgeGraph, entity.id, {
          atlasId: 'atlas-liberalism',
        }).map((relation) => relation.relationType),
      );
      return types.has('encyclopedic-link') && types.size > 1;
    });
    expect(candidate).toBeDefined();
    page.selectedId.set(candidate!.id);
    fixture.detectChanges();

    for (const filter of ['discovery', 'structured'] as const) {
      page.setRelationFilter(filter);
      fixture.detectChanges();
      const visibleIds = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
          '.text-network li[data-relation-id]',
        ),
      ).map((item) => item.dataset['relationId']);
      expect(visibleIds).toEqual(page.visibleRelations().map((relation) => relation.relationId));
      expect(visibleIds.length).toBeGreaterThan(0);
      const expectedNodeIds = [
        page.selectedId(),
        page.rootEntityId(),
        ...page.visibleRelations().map((relation) => relation.relatedEntityId),
      ];
      expect(
        page
          .graphNodes()
          .map((node) => node.entity.id)
          .sort(),
      ).toEqual([...new Set(expectedNodeIds)].sort());

      const firstRelation = page.visibleRelations()[0];
      const firstItem = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
        `.text-network li[data-relation-id="${firstRelation.relationId}"]`,
      );
      expect(firstItem?.textContent).toContain(page.relationName(firstRelation));
      expect(firstItem?.textContent).toContain(
        `Incerteza ${page.relationUncertaintyLabel(firstRelation)}`,
      );
      expect(firstItem?.querySelector('a[href]')).not.toBeNull();
    }
    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLDetailsElement>('.text-network')
        ?.open,
    ).toBe(true);
  });

  it('provides dated people and events and only fully licensed media to the views', () => {
    const page = createAtlas();
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
