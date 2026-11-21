import { createHash, webcrypto } from 'node:crypto';

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { mirrorSlot } from '@core/content/media/mirror-index';
import { queryKnowledgeRelations } from '@core/content/queries/knowledge-graph';
import {
  contentAssetFixture,
  contentManifestFixture,
  methodologyKnowledgeGraph,
} from '@testing/content-fixture';
import { firstValueFrom } from 'rxjs';

import { CONTENT_ASSET_READER, CONTENT_PREFETCH } from './content-assets';
import { ContentRepository, isTransferable } from './content-repository.service';

describe('ContentRepository generated assets', () => {
  const reads: string[] = [];
  beforeEach(() => {
    reads.length = 0;
    vi.stubGlobal('crypto', webcrypto);
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: CONTENT_PREFETCH, useValue: false },
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
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('loads only a requested collection and shares its cached request with full loading', async () => {
    const repository = TestBed.inject(ContentRepository);
    const atlas = await repository.loadCollection('atlas-liberalism');
    expect(atlas?.entities).toHaveLength(27);
    expect(reads).toHaveLength(3);
    expect(reads.some((path) => path.includes('atlas-marx-valor'))).toBe(false);
    const [first, second] = await Promise.all([
      firstValueFrom(repository.loadKnowledgeGraph()),
      firstValueFrom(repository.loadKnowledgeGraph()),
    ]);
    expect(first.atlases.map((atlas) => atlas.entities.map((entity) => entity.id))).toEqual(
      methodologyKnowledgeGraph.atlases.map((atlas) => atlas.entities.map((entity) => entity.id)),
    );
    expect(first).toBe(second);
    expect(reads).toHaveLength(contentManifestFixture.collections.length + 5);
    expect(new Set(reads).size).toBe(reads.length);
    expect(repository.discoveryIndex.some((entry) => entry.id === 'person-karl-marx')).toBe(true);
  });

  it('loads only the network projection and layouts for the full-screen network', async () => {
    const repository = TestBed.inject(ContentRepository);
    await firstValueFrom(repository.loadNetworkGraph());
    const searchPath = `c/${contentManifestFixture.search.sha256}.json`;
    const adjacencyPath = `c/${contentManifestFixture.adjacency.sha256}.json`;
    const layoutsPath = `c/${contentManifestFixture.layouts.sha256}.json`;
    const networkPath = contentManifestFixture.network
      ? `c/${contentManifestFixture.network.sha256}.json`
      : null;
    expect(reads).toContain(layoutsPath);
    if (networkPath) {
      expect(reads).toContain(networkPath);
      for (const collection of contentManifestFixture.collections)
        expect(reads).not.toContain(`c/${collection.sha256}.json`);
    }
    expect(reads).not.toContain(searchPath);
    expect(reads).not.toContain(adjacencyPath);
    expect(reads.filter((path) => path.startsWith('c/'))).toHaveLength(
      networkPath ? 3 : contentManifestFixture.collections.length + 2,
    );
    // Navigating to a catalogue upgrades the same repository to the complete package.
    await firstValueFrom(repository.loadKnowledgeGraph());
    expect(reads).toContain(searchPath);
    expect(reads).toContain(adjacencyPath);
    expect(repository.discoveryIndex.some((entry) => entry.id === 'person-karl-marx')).toBe(true);
  });

  it('maps a pinned licensed path to its R2 key and returns null for an unpinned one', async () => {
    const repository = TestBed.inject(ContentRepository);
    await firstValueFrom(repository.loadKnowledgeGraph());
    const pointer = JSON.parse(contentAssetFixture['pointer.json']);
    expect(repository.mediaUrl('/images/ausente.jpg')).toBeNull();
    for (const item of pointer.media)
      expect(repository.mediaUrl(item.path)).toBe(`${pointer.baseUrl}/${item.key}`);
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

  it('transfers small SSR assets and reads each large object once during hydration', async () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    await firstValueFrom(TestBed.inject(ContentRepository).loadKnowledgeGraph());
    const transfer = TestBed.inject(TransferState).toJson();
    TestBed.resetTestingModule();
    const read = vi.fn(async (key: string) => contentAssetFixture[key]);
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
    expect(read.mock.calls.every(([key]) => !isTransferable(contentAssetFixture[key]))).toBe(true);
    expect(new Set(read.mock.calls.map(([key]) => key)).size).toBe(read.mock.calls.length);
    expect(state.isEmpty).toBe(true);
  });

  it('embeds only small objects on every public page', async () => {
    const transferred = async (path: string) => {
      window.history.pushState({}, '', path);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'server' },
          {
            provide: CONTENT_ASSET_READER,
            useValue: async (path: string) => contentAssetFixture[path],
          },
        ],
      });
      await firstValueFrom(TestBed.inject(ContentRepository).loadKnowledgeGraph());
      const state = JSON.parse(TestBed.inject(TransferState).toJson()) as Record<string, string>;
      return Object.values(state);
    };
    const onEntry = await transferred('/verbete/x');
    const onOther = await transferred('/leitura/marxismo');
    expect(onEntry.every(isTransferable)).toBe(true);
    expect(onOther).toEqual(onEntry);
    window.history.pushState({}, '', '/');
  });

  it('reuses a verified package across server renders and restores small hydration assets', async () => {
    const read = vi.fn(async (key: string) => contentAssetFixture[key]);
    const render = async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: CONTENT_ASSET_READER, useValue: read },
        ],
      });
      const graph = await firstValueFrom(TestBed.inject(ContentRepository).loadKnowledgeGraph());
      return { graph, transfer: JSON.parse(TestBed.inject(TransferState).toJson()) };
    };
    const first = await render();
    read.mockClear();
    const second = await render();
    expect(second.graph).toBe(first.graph);
    expect(second.transfer).toEqual(first.transfer);
    const collectionKeys = new Set(
      contentManifestFixture.collections.map((entry) => `c/${entry.sha256}.json`),
    );
    expect(read.mock.calls.some(([key]) => collectionKeys.has(key))).toBe(false);
  });

  it('rejects corrupt bytes without exposing a partial graph and retries the failed asset', async () => {
    const file = `c/${contentManifestFixture.collections[0].sha256}.json`;
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
    const request = http.expectOne((req) => req.url.endsWith('/pointer.json'));
    expect(request.request.responseType).toBe('text');
    request.flush('{"schemaVersion":999}');
    await pending;
    http.verify();
  });

  describe('lean reading bundle', () => {
    const digest = (text: string) => createHash('sha256').update(text).digest('hex');
    const bundleText = (ideologies: Record<string, unknown>) =>
      JSON.stringify({
        graph: methodologyKnowledgeGraph,
        search: [],
        adjacency: {},
        layouts: {},
        ideologies,
      });
    const lean = bundleText({ lean: { page: {}, supplement: {} } });
    const full = bundleText({ full: { page: {}, supplement: {} } });
    const pointer = {
      ...JSON.parse(contentAssetFixture['pointer.json']),
      bundle: { sha256: digest(full), bytes: new TextEncoder().encode(full).byteLength },
      readingBundle: { sha256: digest(lean), bytes: new TextEncoder().encode(lean).byteLength },
    };
    const assets: Record<string, string> = {
      ...contentAssetFixture,
      'pointer.json': JSON.stringify(pointer),
      [`c/${pointer.bundle.sha256}.json`]: full,
      [`c/${pointer.readingBundle.sha256}.json`]: lean,
    };
    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: CONTENT_PREFETCH, useValue: false },
          {
            provide: CONTENT_ASSET_READER,
            useValue: async (path: string) => {
              reads.push(path);
              return assets[path];
            },
          },
        ],
      });
    });

    it('serves a reading from the lean bundle and never downloads the full one', async () => {
      const repository = TestBed.inject(ContentRepository);
      await firstValueFrom(repository.loadReadingGraph());
      expect(reads).toEqual(['pointer.json', `c/${pointer.readingBundle.sha256}.json`]);
      expect(repository.bundledItineraries).toBeUndefined();
      expect(await repository.loadIdeology('lean')).not.toBeNull();
    });

    it('upgrades to the full bundle for the explorer and then serves readings from it', async () => {
      const repository = TestBed.inject(ContentRepository);
      await firstValueFrom(repository.loadReadingGraph());
      await firstValueFrom(repository.loadKnowledgeGraph());
      expect(reads).toContain(`c/${pointer.bundle.sha256}.json`);
      const total = reads.length;
      await firstValueFrom(repository.loadReadingGraph());
      expect(reads).toHaveLength(total);
      expect(await repository.loadIdeology('full')).not.toBeNull();
    });

    it('does not fetch the lean bundle once the full one is loading or loaded', async () => {
      const repository = TestBed.inject(ContentRepository);
      const [, graph] = await Promise.all([
        firstValueFrom(repository.loadKnowledgeGraph()),
        firstValueFrom(repository.loadReadingGraph()),
      ]);
      expect(graph).toBe(repository.knowledgeGraph);
      expect(reads).not.toContain(`c/${pointer.readingBundle.sha256}.json`);
    });
  });
});

describe('ContentRepository mirrored media', () => {
  const thumbnail =
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b4/Chapel.jpg/960px-Chapel.jpg';
  const object = `${'a'.repeat(64)}.jpg`;

  async function setup(indexBody: string | null) {
    vi.stubGlobal('crypto', webcrypto);
    const assets: Record<string, string> = { ...contentAssetFixture };
    const pointer = JSON.parse(assets['pointer.json']);
    if (indexBody) {
      const bytes = new TextEncoder().encode(indexBody);
      const sha256 = Buffer.from(await webcrypto.subtle.digest('SHA-256', bytes)).toString('hex');
      pointer.mirror = { sha256, bytes: bytes.byteLength };
      assets[`c/${sha256}.json`] = indexBody;
    }
    assets['pointer.json'] = JSON.stringify(pointer);
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: CONTENT_PREFETCH, useValue: false },
        {
          provide: CONTENT_ASSET_READER,
          useValue: async (path: string) => {
            if (!Object.hasOwn(assets, path)) throw new Error(`Missing ${path}`);
            return assets[path];
          },
        },
      ],
    });
    const repository = TestBed.inject(ContentRepository);
    await firstValueFrom(repository.loadKnowledgeGraph());
    return { repository, baseUrl: pointer.baseUrl as string };
  }
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('resolves a mirrored thumbnail to the immutable object on the bucket', async () => {
    const index = JSON.stringify({
      schemaVersion: 1,
      entries: { [mirrorSlot(thumbnail)]: object },
    });
    const { repository, baseUrl } = await setup(`${index}\n`);
    expect(repository.mirrorUrl(thumbnail)).toBe(`${baseUrl}/m/${object}`);
    expect(repository.mirrorUrl(`${thumbnail}?other`)).toBeNull();
  });

  it('keeps the original address when the release has no mirror or the index is invalid', async () => {
    expect((await setup(null)).repository.mirrorUrl(thumbnail)).toBeNull();
    TestBed.resetTestingModule();
    const broken = await setup('{"schemaVersion":1,"entries":{"x":"nope"}}\n');
    expect(broken.repository.mirrorUrl(thumbnail)).toBeNull();
  });
});
