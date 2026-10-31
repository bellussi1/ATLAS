import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import methodologyAtlasData from '../../content/atlas.json';
import { ContentRepository } from './content-repository';

describe('ContentRepository', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ContentRepository,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('loads and validates the structured content asset without a backend', async () => {
    const repository = TestBed.inject(ContentRepository);
    const atlasPromise = firstValueFrom(repository.loadAtlas());
    const graphPromise = firstValueFrom(repository.loadKnowledgeGraph());
    const request = TestBed.inject(HttpTestingController).expectOne('/content/atlas.json');
    expect(request.request.method).toBe('GET');
    request.flush(methodologyAtlasData);

    const [atlas, graph] = await Promise.all([atlasPromise, graphPromise]);
    expect(atlas.title).toBe('Metodologia do ATLAS');
    expect(graph.atlases).toHaveLength(3);
    expect(repository.findBySlug('metodologia-do-atlas')?.title).toBe('Metodologia do ATLAS');
  });

  it('returns the static bundle without making a browser request during prerender', async () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    const repository = TestBed.inject(ContentRepository);

    await expect(firstValueFrom(repository.loadAtlas())).resolves.toBe(repository.atlas);
    TestBed.inject(HttpTestingController).expectNone('/content/atlas.json');
  });

  it('rejects an asset that does not satisfy the content schema', async () => {
    const repository = TestBed.inject(ContentRepository);
    const atlasPromise = expect(firstValueFrom(repository.loadAtlas())).rejects.toThrow();
    TestBed.inject(HttpTestingController).expectOne('/content/atlas.json').flush({ invalid: true });

    await atlasPromise;
  });

  it('returns no record for an unknown slug', () => {
    expect(TestBed.inject(ContentRepository).findBySlug('slug-inexistente')).toBeUndefined();
  });

  it('queries entities by atlas and period, then exposes incoming and outgoing graph links', () => {
    const repository = TestBed.inject(ContentRepository);
    const historicalPeople = repository.queryEntities({ atlasId: 'atlas-processo-constituinte', type: 'person', fromYear: 1987 });
    expect(historicalPeople.map(({ entity }) => entity.title)).toEqual(['Ulysses Guimarães']);
    expect(repository.queryEntities({ atlasId: 'atlas-processo-constituinte', toYear: 1915 })).toEqual([]);
    expect(repository.queryRelations('person-ulysses-guimaraes', { direction: 'outgoing' }).map(({ label }) => label))
      .toContain('presidiu');
  });
});
