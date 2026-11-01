import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import methodologyAtlasData from '../../content/atlas.json';
import marxismoGraph from '../../content/graph/marxismo.json';
import marxismoPage from '../../content/ideologies/marxismo/page.json';
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
    expect(graph.atlases.map((item) => item.id)).toContain('atlas-marx-valor');
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

  it('loads a partitioned page and its sourced relations from local assets', async () => {
    const result = firstValueFrom(TestBed.inject(ContentRepository).loadIdeology('marxismo'));
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/content/ideologies/marxismo/page.json').flush(marxismoPage);
    http.expectOne('/content/graph/marxismo.json').flush(marxismoGraph);
    expect((await result)?.page.chapters).toHaveLength(8);
  });

  it('does not request unpublished example pages or unknown slugs', async () => {
    await expect(
      firstValueFrom(TestBed.inject(ContentRepository).loadIdeology('anarquismo')),
    ).resolves.toBeNull();
  });

  it('propagates unavailable page files and rejects invalid page references', async () => {
    const repository = TestBed.inject(ContentRepository);
    const failed = expect(firstValueFrom(repository.loadIdeology('marxismo'))).rejects.toThrow();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/content/graph/marxismo.json').flush(marxismoGraph);
    http
      .expectOne('/content/ideologies/marxismo/page.json')
      .flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    await failed;
    const invalid = expect(firstValueFrom(repository.loadIdeology('marxismo'))).rejects.toThrow();
    http.expectOne('/content/ideologies/marxismo/page.json').flush({ schemaVersion: 9000 });
    http.expectOne('/content/graph/marxismo.json').flush(marxismoGraph);
    await invalid;
  });

  it('queries entities by atlas and period, then exposes incoming and outgoing graph links', () => {
    const repository = TestBed.inject(ContentRepository);
    const historicalPeople = repository.queryEntities({
      atlasId: 'atlas-processo-constituinte',
      type: 'person',
      fromYear: 1987,
    });
    expect(historicalPeople.map(({ entity }) => entity.title)).toEqual(['Ulysses Guimarães']);
    expect(
      repository.queryEntities({ atlasId: 'atlas-processo-constituinte', toYear: 1915 }),
    ).toEqual([]);
    expect(
      repository
        .queryRelations('person-ulysses-guimaraes', { direction: 'outgoing' })
        .map(({ label }) => label),
    ).toContain('presidiu');
  });
});
