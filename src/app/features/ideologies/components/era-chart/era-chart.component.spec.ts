import { TestBed } from '@angular/core/testing';
import type { Entity } from '@core/content/models/content-schema';

import { EraChartComponent, type EraChartEpoch } from './era-chart.component';

const person = (id: string, startYear: number, endYear: number) =>
  ({
    id,
    title: id,
    temporalExtent: { startYear, endYear, precision: 'year', label: null },
  }) as Entity;
const epoch = (id: string, start: number, end: number): EraChartEpoch => ({
  id,
  title: id,
  kicker: id,
  summary: id,
  start,
  end,
  context: { title: id, kind: id, summary: id, paragraphs: [id], sources: [], connections: [] },
});

describe('EraChartComponent', () => {
  it('lists only people alive during the selected epoch and switches by arrow key', () => {
    const fixture = TestBed.createComponent(EraChartComponent);
    fixture.componentRef.setInput('epochs', [epoch('a', 1840, 1848), epoch('b', 1917, 1943)]);
    fixture.componentRef.setInput('people', [
      person('marx', 1818, 1883),
      person('gramsci', 1891, 1937),
    ]);
    fixture.componentRef.setInput('markers', []);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const names = () =>
      [...root.querySelectorAll('.alive-list:not(.dated-list) button')].map((b) =>
        b.textContent!.trim(),
      );
    expect(names()).toEqual([expect.stringContaining('marx')]);
    const first = root.querySelector<HTMLButtonElement>('.epoch-picker button.carousel-item')!;
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();
    expect(root.querySelector('.epoch-detail h4')!.textContent).toBe('b');
    expect(names()).toEqual([expect.stringContaining('gramsci')]);
  });

  it('lists dated records of the selected epoch and says how many lack a date', () => {
    const fixture = TestBed.createComponent(EraChartComponent);
    const record = (id: string, startYear: number | null) =>
      ({
        id,
        title: id,
        temporalExtent: startYear
          ? { startYear, endYear: null, precision: 'year', label: null }
          : undefined,
      }) as unknown as Entity;
    fixture.componentRef.setInput('epochs', [epoch('a', 1840, 1850), epoch('b', 1900, 1920)]);
    fixture.componentRef.setInput('people', [person('marx', 1818, 1883)]);
    fixture.componentRef.setInput('markers', [
      record('manifesto', 1848),
      record('revolution', 1917),
      record('undated', null),
    ]);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const dated = () =>
      [...root.querySelectorAll('.dated-list button')].map((b) => b.textContent!.trim());
    expect(dated()).toEqual([expect.stringContaining('manifesto')]);
    expect(root.querySelector('.era-note')!.textContent).toContain(
      '1 registro fica fora da escala',
    );
  });

  it('marks approximate dates with "c." and a dashed border', () => {
    const fixture = TestBed.createComponent(EraChartComponent);
    const record = (id: string, precision: 'year' | 'approximate') =>
      ({
        id,
        title: id,
        temporalExtent: { startYear: 1845, endYear: null, precision, label: null },
      }) as unknown as Entity;
    fixture.componentRef.setInput('epochs', [epoch('a', 1840, 1850)]);
    fixture.componentRef.setInput('people', []);
    fixture.componentRef.setInput('markers', [
      record('exact', 'year'),
      record('circa', 'approximate'),
    ]);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.marker.is-approx')).toHaveLength(1);
    expect(root.querySelector('.marker.is-approx > span')!.textContent).toContain('c. 1845');
    expect(root.querySelector('.era-note')!.textContent).toContain('bordas tracejadas');
  });

  it('shows the eight people closest to the epoch and expands on demand', () => {
    const fixture = TestBed.createComponent(EraChartComponent);
    fixture.componentRef.setInput('epochs', [epoch('a', 1800, 1900), epoch('b', 1950, 1960)]);
    fixture.componentRef.setInput(
      'people',
      Array.from({ length: 12 }, (_, i) => person(`p${i}`, 1810 + i, 1850 + i)),
    );
    fixture.componentRef.setInput('markers', []);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const cards = () => root.querySelectorAll('.alive-list:not(.dated-list) button').length;
    const toggle = () => root.querySelector<HTMLButtonElement>('.list-toggle')!;
    expect(cards()).toBe(8);
    expect(toggle().textContent).toContain('Ver todas (12)');
    toggle().click();
    fixture.detectChanges();
    expect(cards()).toBe(12);
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(toggle().textContent).toContain('Mostrar menos');
    root.querySelectorAll<HTMLButtonElement>('.epoch-picker button.carousel-item')[1].click();
    fixture.detectChanges();
    expect(root.querySelector('.list-toggle')).toBeNull();
  });

  it('puts close marker labels on different rows', () => {
    const fixture = TestBed.createComponent(EraChartComponent);
    const record = (id: string, startYear: number) =>
      ({
        id,
        title: id,
        temporalExtent: { startYear, endYear: null, precision: 'year', label: null },
      }) as unknown as Entity;
    fixture.componentRef.setInput('epochs', [epoch('a', 1800, 1900)]);
    fixture.componentRef.setInput('people', [person('marx', 1818, 1883)]);
    fixture.componentRef.setInput('markers', [record('um', 1848), record('dois', 1849)]);
    fixture.detectChanges();
    expect(fixture.componentInstance.markerRows()).toEqual([0, 1]);
  });
});
