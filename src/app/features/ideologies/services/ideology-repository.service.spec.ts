import { makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CONTENT_ASSET_READER } from '@core/content/repositories/content-assets';
import {
  type IdeologyDossier,
  validateIdeologyDossier,
} from '@ideologies/models/ideology-page.schema';
import {
  contentAssetFixture,
  methodologyKnowledgeGraph,
  provideContentFixture,
} from '@testing/content-fixture';
import { firstValueFrom } from 'rxjs';

import marxismoGraph from '../../../../../content/graph/marxismo.json';
import marxismoPage from '../../../../../content/ideologies/marxismo/page.json';
import { IdeologyRepository } from './ideology-repository.service';

describe('IdeologyRepository', () => {
  const reads: string[] = [];
  beforeEach(() => {
    reads.length = 0;
    TestBed.configureTestingModule({
      providers: [
        ...provideContentFixture(),
        {
          provide: CONTENT_ASSET_READER,
          useValue: async (key: string) => {
            reads.push(key);
            return contentAssetFixture[key];
          },
        },
      ],
    });
  });

  it('reads the reading from the release and transfers the validated dossier on the server', async () => {
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
  });

  it('consumes the transferred dossier without reading the release during hydration', async () => {
    const dossier = validateIdeologyDossier(marxismoPage, marxismoGraph, methodologyKnowledgeGraph);
    const state = TestBed.inject(TransferState);
    const key = makeStateKey<IdeologyDossier | null>('ideology-marxismo');
    state.set(key, dossier);
    const result = await firstValueFrom(
      TestBed.inject(IdeologyRepository).loadIdeology('marxismo'),
    );
    expect(result).toEqual(dossier);
    expect(state.hasKey(key)).toBe(false);
    expect(reads).toHaveLength(0);
  });

  it('loads a partitioned page and its sourced relations from the release', async () => {
    const dossier = await firstValueFrom(
      TestBed.inject(IdeologyRepository).loadIdeology('marxismo'),
    );
    expect(dossier?.page.chapters).toHaveLength(12);
    expect(reads.some((key) => key.startsWith('c/'))).toBe(true);
  });

  it.each(['fascismo', 'slug-ausente', '__proto__', 'constructor'])(
    'resolves unknown or unpublished readings to null: %s',
    async (slug) => {
      await expect(
        firstValueFrom(TestBed.inject(IdeologyRepository).loadIdeology(slug)),
      ).resolves.toBeNull();
    },
  );
});
