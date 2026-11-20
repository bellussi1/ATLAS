import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { WorldMapFilteredTerritory } from '@core/content/queries/world-map';

import { MapStudyDeskComponent } from './map-study-desk.component';

const entry = {
  territory: {
    id: 'country-brazil',
    slug: 'brasil',
    title: 'Brasil',
    layer: 'country',
    summary: 'País da América do Sul.',
    temporalExtent: null,
  },
  activeRegimes: [],
  activeRecords: [],
  connectionCount: 3,
  activityCount: 3,
} as unknown as WorldMapFilteredTerritory;

function render(readings: { slug: string; title: string; path: string }[] = []) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(MapStudyDeskComponent);
  fixture.componentRef.setInput('territoryEntry', entry);
  fixture.componentRef.setInput('readings', readings);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('map study desk', () => {
  it('counts only what the territory has', () => {
    const counts = render().querySelector('.desk-counts-line')?.textContent ?? '';

    expect(counts).toContain('3 conexões');
    expect(counts).not.toContain('regime');
    expect(counts).not.toContain('registro');
  });

  it('offers related readings as stamped links right after the actions', () => {
    const host = render([
      { slug: 'trabalhismo', title: 'Trabalhismo', path: '/leitura/trabalhismo' },
    ]);
    const link = host.querySelector<HTMLAnchorElement>('a.desk-read');

    expect(link?.getAttribute('href')).toBe('/leitura/trabalhismo');
    expect(link?.querySelector('app-stamp')?.textContent).toContain('Trabalhismo');
    const actions = host.querySelector('.desk-actions');
    expect(actions?.nextElementSibling?.contains(link ?? null)).toBe(true);
  });
  it('leads with the active timeline marker: when, what and how it ties to the territory', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(MapStudyDeskComponent);
    fixture.componentRef.setInput('territoryEntry', {
      ...entry,
      activeRecords: [
        {
          id: 'event-golpe',
          slug: 'golpe-de-1964',
          title: 'Golpe de 1964',
          kind: 'event',
          summary: 'Rebelião militar que depôs João Goulart.',
          relationLabel: 'ocorreu em',
          temporalExtent: null,
        },
      ],
    });
    fixture.componentRef.setInput('activeHotpoint', {
      id: 'hp-golpe',
      slug: 'golpe-de-1964',
      title: 'Golpe de 1964',
      label: '1964',
      year: 1964,
    });
    fixture.detectChanges();
    const marco = (fixture.nativeElement as HTMLElement).querySelector('.desk-marco');

    expect(marco?.querySelector('h3 a')?.getAttribute('href')).toBe('/verbete/golpe-de-1964');
    expect(marco?.textContent).toContain('1964');
    expect(marco?.textContent).toContain('Rebelião militar');
    expect(marco?.querySelector('.desk-marco__where')?.textContent?.trim()).toBe(
      'Ocorreu em Brasil',
    );
  });
});
