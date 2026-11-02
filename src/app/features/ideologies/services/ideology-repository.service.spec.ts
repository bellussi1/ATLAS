import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  type IdeologyDossier,
  validateIdeologyDossier,
} from '@ideologies/models/ideology-page.schema';
import { provideContentFixture } from '@testing/content-fixture';
import { methodologyKnowledgeGraph } from '@testing/content-fixture';
import { firstValueFrom } from 'rxjs';

import marxismoGraph from '../../../../content/graph/marxismo.json';
import marxismoPage from '../../../../content/ideologies/marxismo/page.json';
import { IdeologyRepository } from './ideology-repository.service';

describe('IdeologyRepository', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        ...provideContentFixture(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('prerenders bundled snapshots without HTTP and transfers the validated dossier', async () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    const dossier = await firstValueFrom(
      TestBed.inject(IdeologyRepository).loadIdeology('marxismo'),
    );
    expect(dossier?.page.title).toBe('Marxismo');
    expect(
      TestBed.inject(TransferState).get(
        makeStateKey<IdeologyDossier | null>('ideology-marxismo'),
        null,
      ),
    ).toEqual(dossier);
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('consumes the transferred dossier without requesting snapshots during hydration', async () => {
    const dossier = validateIdeologyDossier(marxismoPage, marxismoGraph, methodologyKnowledgeGraph);
    const state = TestBed.inject(TransferState);
    const key = makeStateKey<IdeologyDossier | null>('ideology-marxismo');
    state.set(key, dossier);
    const result = await firstValueFrom(
      TestBed.inject(IdeologyRepository).loadIdeology('marxismo'),
    );
    expect(result).toEqual(dossier);
    expect(state.hasKey(key)).toBe(false);
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('loads a partitioned page and its sourced relations from local assets', async () => {
    const result = firstValueFrom(TestBed.inject(IdeologyRepository).loadIdeology('marxismo'));
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/content/ideologies/marxismo/page.json').flush(marxismoPage);
    http.expectOne('/content/graph/marxismo.json').flush(marxismoGraph);
    expect((await result)?.page.chapters).toHaveLength(12);
  });

  it.each(['anarquismo', 'slug-ausente', '__proto__', 'constructor'])(
    'does not request unpublished or unknown snapshots: %s',
    async (slug) => {
      await expect(
        firstValueFrom(TestBed.inject(IdeologyRepository).loadIdeology(slug)),
      ).resolves.toBeNull();
      TestBed.inject(HttpTestingController).expectNone(() => true);
    },
  );

  it('propagates unavailable page files and rejects invalid page references', async () => {
    const repository = TestBed.inject(IdeologyRepository);
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
});
