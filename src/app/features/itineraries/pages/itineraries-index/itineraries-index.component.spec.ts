import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideContentFixture } from '@testing/content-fixture';
import { vi } from 'vitest';

import { ItineraryRepository } from '../../services/itinerary-repository.service';
import { ItinerariesIndexComponent } from './itineraries-index.component';

const sampleItinerary = JSON.parse(
  readFileSync(
    join(process.cwd(), 'content/itineraries/examples/comparativo-liberdade.json'),
    'utf8',
  ),
);

describe('ItinerariesIndexComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ItinerariesIndexComponent],
      providers: [provideRouter([]), provideHttpClient(), ...provideContentFixture()],
    });
  });

  it('shows an honest empty state when no verified itineraries exist yet', async () => {
    const fixture = TestBed.createComponent(ItinerariesIndexComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Itinerários');
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(root.querySelector('.itineraries__empty')?.textContent).toContain(
        'Nenhum itinerário verificado foi publicado ainda',
      );
      expect(root.querySelector('button.filter-chip--surprise')).toBeNull();
    });
  });

  it('navigates to an itinerary via Surpreenda-me when published items exist', async () => {
    TestBed.overrideProvider(ItineraryRepository, {
      useValue: { list: async () => [sampleItinerary] },
    });
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ItinerariesIndexComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    await vi.waitFor(() => {
      fixture.detectChanges();
      const surprise = root.querySelector<HTMLButtonElement>('button.filter-chip--surprise');
      expect(surprise?.disabled).toBe(false);
    });

    root.querySelector<HTMLButtonElement>('button.filter-chip--surprise')?.click();
    expect(navSpy).toHaveBeenCalledWith(['/itinerario', sampleItinerary.slug]);
  });
});
