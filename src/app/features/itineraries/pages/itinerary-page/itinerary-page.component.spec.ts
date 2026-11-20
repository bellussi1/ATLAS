import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import type { Itinerary } from '@itineraries/models/itinerary.schema';
import { ItineraryRepository } from '@itineraries/services/itinerary-repository.service';
import { provideContentFixture } from '@testing/content-fixture';
import { of } from 'rxjs';

import { ItineraryPageComponent } from './itinerary-page.component';

const fixtureItinerary: Itinerary = JSON.parse(
  readFileSync(
    join(process.cwd(), 'content/itineraries/examples/comparativo-liberdade.json'),
    'utf8',
  ),
);

describe('ItineraryPageComponent', () => {
  it('renders the route as a linear reading with an index, next-stop steps and an ending', async () => {
    await TestBed.configureTestingModule({
      imports: [ItineraryPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        ...provideContentFixture(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slug: 'comparativo-liberdade' })) },
        },
        {
          provide: ItineraryRepository,
          useValue: { bySlug: async () => fixtureItinerary, list: async () => [fixtureItinerary] },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ItineraryPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent).toContain(fixtureItinerary.title);
    expect(root.querySelectorAll('.stop').length).toBe(6);
    expect(root.querySelectorAll('.branch').length).toBe(2);
    expect(root.querySelectorAll('input[type="checkbox"]').length).toBe(0);
    // Index: one entry per stop plus the closing section, first stop current.
    expect(root.querySelectorAll('.itinerary-index__item').length).toBe(7);
    expect(root.querySelector('[aria-current="step"]')?.textContent).toContain(
      fixtureItinerary.stops[0].title,
    );
    // One step forward between stops, and a final step to what comes next.
    expect(root.querySelectorAll('.roadmap-connector:not(.roadmap-connector--end)').length).toBe(5);
    expect(root.querySelectorAll('.roadmap-connector--end').length).toBe(1);
    expect(root.querySelector('#depois-do-percurso h2')?.textContent).toContain(
      'Depois do percurso',
    );
    // Curated follow-ups carry a readable title, not only the destination kind.
    const connectionTitles = [...root.querySelectorAll('.connections a > span')].map((el) =>
      el.textContent?.trim(),
    );
    expect(connectionTitles.length).toBe(fixtureItinerary.connections.length);
    for (const title of connectionTitles) expect(title).not.toMatch(/^(Catálogo|Verbete) →$/);
  });

  it('shows the not-found message for an unknown itinerary slug', async () => {
    await TestBed.configureTestingModule({
      imports: [ItineraryPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        ...provideContentFixture(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slug: 'inexistente' })) },
        },
        {
          provide: ItineraryRepository,
          useValue: { bySlug: async () => null, list: async () => [] },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ItineraryPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-not-found-message')).not.toBeNull();
  });
});
