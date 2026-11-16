import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideContentFixture } from '@testing/content-fixture';

import { ItineraryRepository } from './itinerary-repository.service';

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
});
