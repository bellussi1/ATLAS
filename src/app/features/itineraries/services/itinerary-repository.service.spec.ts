import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { CONTENT_INITIAL_PACKAGE } from '@core/content/repositories/content-assets';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { provideContentFixture } from '@testing/content-fixture';
import { throwError } from 'rxjs';

import { ItineraryRepository } from './itinerary-repository.service';

const sampleItinerary = JSON.parse(
  readFileSync(
    join(process.cwd(), 'content/itineraries/examples/comparativo-liberdade.json'),
    'utf8',
  ),
);

describe('ItineraryRepository', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), ...provideContentFixture()],
    });
  });

  it('returns an empty list when the release predates itineraries', async () => {
    const repo = TestBed.inject(ItineraryRepository);
    const items = await repo.list();
    expect(items).toEqual([]);
    expect(await repo.bySlug('comparativo-liberdade')).toBeNull();
  });

  it('loads individual itinerary resources without fetching the full bundle when published', async () => {
    const loadKnowledgeGraph = vi.fn(() => throwError(() => new Error('bundle unnecessary')));
    const verifiedResource = vi.fn(async () => sampleItinerary);
    TestBed.overrideProvider(CONTENT_INITIAL_PACKAGE, { useValue: null });
    TestBed.overrideProvider(ContentRepository, {
      useValue: {
        bundledItineraries: undefined,
        manifestSnapshot: async () => ({
          itineraries: [
            {
              id: sampleItinerary.id,
              slug: sampleItinerary.slug,
              file: 'itinerary-comparativo-liberdade.abc.json',
              sha256: 'a'.repeat(64),
              bytes: 123,
            },
          ],
        }),
        hasPublishedArtifacts: async () => true,
        verifiedResource,
        loadKnowledgeGraph,
      },
    });
    const repo = TestBed.inject(ItineraryRepository);
    const items = await repo.list();
    expect(items.map((item) => item.slug)).toEqual([sampleItinerary.slug]);
    expect(verifiedResource).toHaveBeenCalledTimes(1);
    expect(loadKnowledgeGraph).not.toHaveBeenCalled();
  });
});
