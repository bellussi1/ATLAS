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
  it('renders stops, reasons, questions and branches without progress checkboxes', async () => {
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
          useValue: { bySlug: async () => fixtureItinerary },
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
          useValue: { bySlug: async () => null },
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
