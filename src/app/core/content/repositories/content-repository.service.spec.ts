import { webcrypto } from 'node:crypto';

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { queryKnowledgeRelations } from '@core/content/queries/knowledge-graph';
import {
  contentAssetFixture,
  contentManifestFixture,
  methodologyKnowledgeGraph,
} from '@testing/content-fixture';
import { firstValueFrom } from 'rxjs';

import { CONTENT_ASSET_READER } from './content-assets';
import { ContentRepository } from './content-repository.service';

describe('ContentRepository generated assets', () => {
  const reads: string[] = [];
  beforeEach(() => {
    reads.length = 0;
    vi.stubGlobal('crypto', webcrypto);
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: CONTENT_ASSET_READER,
          useValue: async (path: string) => {
            reads.push(path);
            if (!Object.hasOwn(contentAssetFixture, path)) throw new Error(`Missing ${path}`);
            return contentAssetFixture[path];
          },
        },
      ],
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('loads only a requested collection and shares its cached request with full loading', async () => {
    const repository = TestBed.inject(ContentRepository);
    const atlas = await repository.loadCollection('atlas-liberalism');
    expect(atlas?.entities).toHaveLength(27);
    expect(reads).toHaveLength(2);
    expect(reads.some((path) => path.includes('atlas-marx-valor'))).toBe(false);
    const [first, second] = await Promise.all([
      firstValueFrom(repository.loadKnowledgeGraph()),
      firstValueFrom(repository.loadKnowledgeGraph()),
    ]);
    expect(first).toEqual(methodologyKnowledgeGraph);
    expect(first).toBe(second);
    expect(reads).toHaveLength(contentManifestFixture.collections.length + 4);
    expect(new Set(reads).size).toBe(reads.length);
    expect(repository.discoveryIndex.some((entry) => entry.id === 'person-karl-marx')).toBe(true);
  });

  it('uses compiled incoming/outgoing relations with the same filters as graph queries', async () => {
    const repository = TestBed.inject(ContentRepository);
    await firstValueFrom(repository.loadKnowledgeGraph());
    for (const atlas of methodologyKnowledgeGraph.atlases) {
      for (const entity of atlas.entities) {
        for (const direction of ['incoming', 'outgoing', 'both'] as const) {
          const query = { direction, atlasId: atlas.id };
          expect(repository.queryRelations(entity.id, query)).toEqual(
            queryKnowledgeRelations(methodologyKnowledgeGraph, entity.id, query),
          );
        }
      }
    }
  });

  it('transfers SSR assets and consumes them at hydration without another read', async () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    await firstValueFrom(TestBed.inject(ContentRepository).loadKnowledgeGraph());
    const transfer = TestBed.inject(TransferState).toJson();
    TestBed.resetTestingModule();
    const read = vi.fn(() => Promise.reject(new Error('Hydration attempted network')));
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: CONTENT_ASSET_READER, useValue: read },
      ],
    });
    const state = TestBed.inject(TransferState);
    for (const [key, value] of Object.entries(JSON.parse(transfer)))
      state.set(makeStateKey<string>(key), value as string);
    const result = await firstValueFrom(TestBed.inject(ContentRepository).loadKnowledgeGraph());
    expect(result).toEqual(methodologyKnowledgeGraph);
    expect(read).not.toHaveBeenCalled();
    expect(state.isEmpty).toBe(true);
  });

  it('rejects corrupt bytes without exposing a partial graph and retries the failed asset', async () => {
    const file = `/content/${contentManifestFixture.collections[0].file}`;
    let fail = true;
    TestBed.overrideProvider(CONTENT_ASSET_READER, {
      useValue: async (path: string) => {
        reads.push(path);
        return path === file && fail ? '{}' : contentAssetFixture[path];
      },
    });
    const repository = TestBed.inject(ContentRepository);
    await expect(firstValueFrom(repository.loadKnowledgeGraph())).rejects.toThrow('integridade');
    expect(() => repository.knowledgeGraph).toThrow('Carregue');
    fail = false;
    await expect(firstValueFrom(repository.loadKnowledgeGraph())).resolves.toEqual(
      methodologyKnowledgeGraph,
    );
    expect(reads.filter((path) => path === file)).toHaveLength(2);
    expect(await repository.loadCollection('missing')).toBeUndefined();
  });

  it('uses local HTTP text assets in the browser and rejects an invalid manifest', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const pending = expect(
      firstValueFrom(TestBed.inject(ContentRepository).loadKnowledgeGraph()),
    ).rejects.toThrow();
    const http = TestBed.inject(HttpTestingController);
    const request = http.expectOne('/content/manifest.json');
    expect(request.request.responseType).toBe('text');
    request.flush('{"schemaVersion":999}');
    await pending;
    http.verify();
  });
});
