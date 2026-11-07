import { TestBed } from '@angular/core/testing';
import type { Entity } from '@core/content/models/content-schema';
import { vi } from 'vitest';

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
      [...root.querySelectorAll('.era-epoch.is-selected .alive-list:not(.dated-list) button')].map(
        (b) => b.textContent!.trim(),
      );
    expect(names()).toEqual([expect.stringContaining('marx')]);
    const first = root.querySelector<HTMLButtonElement>('.era-epoch .epoch-row')!;
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();
    expect(root.querySelector('.era-epoch.is-selected .epoch-title')!.textContent).toBe('b');
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
      [...root.querySelectorAll('.era-epoch.is-selected .dated-list button')].map((b) =>
        b.textContent!.trim(),
      );
    expect(dated()).toEqual([expect.stringContaining('manifesto')]);
    expect(root.querySelector('.era-note')!.textContent).toContain('1 registro fica fora da lista');
  });

  it('marks approximate dates with "c." and a dashed outline', () => {
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
    expect(root.querySelectorAll('.dated-list li.is-approx')).toHaveLength(1);
    expect(root.querySelector('.dated-list li.is-approx button')!.textContent).toContain('c. 1845');
    expect(root.querySelector('.era-note')!.textContent).toContain('“c.” são aproximadas');
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
    const cards = () =>
      root.querySelectorAll('.era-epoch.is-selected .alive-list:not(.dated-list) button').length;
    const toggle = () =>
      root.querySelector<HTMLButtonElement>('.era-epoch.is-selected .list-toggle')!;
    expect(cards()).toBe(8);
    expect(toggle().textContent).toContain('Ver todas (12)');
    toggle().click();
    fixture.detectChanges();
    expect(cards()).toBe(12);
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(toggle().textContent).toContain('Mostrar menos');
    root.querySelectorAll<HTMLButtonElement>('.era-epoch .epoch-row')[1].click();
    fixture.detectChanges();
    expect(root.querySelector('.era-epoch.is-selected .list-toggle')).toBeNull();
  });

  it('opens the first period, keeps aria state and toggles it closed on a second press', () => {
    const fixture = TestBed.createComponent(EraChartComponent);
    fixture.componentRef.setInput('epochs', [epoch('a', 1800, 1900), epoch('b', 1901, 1950)]);
    fixture.componentRef.setInput('people', []);
    fixture.componentRef.setInput('markers', []);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const rows = () => [...root.querySelectorAll<HTMLButtonElement>('.era-epoch .epoch-row')];
    expect(rows()[0].getAttribute('aria-expanded')).toBe('true');
    expect(rows()[0].getAttribute('aria-controls')).toBe('epoch-a');
    expect(root.querySelector('#epoch-a')).not.toBeNull();

    rows()[0].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selected()).toBeNull();
    expect(rows()[0].getAttribute('aria-expanded')).toBe('false');
    expect(root.querySelectorAll('.era-epoch.is-selected')).toHaveLength(0);

    rows()[0].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selected()?.id).toBe('a');
    expect(rows()[0].getAttribute('aria-expanded')).toBe('true');
  });

  it('keeps the previous body while it collapses, then removes it', () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(EraChartComponent);
      fixture.componentRef.setInput('epochs', [epoch('a', 1800, 1900), epoch('b', 1901, 1950)]);
      fixture.componentRef.setInput('people', []);
      fixture.componentRef.setInput('markers', []);
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const rows = root.querySelectorAll<HTMLButtonElement>('.epoch-row');
      rows[1].click();
      fixture.detectChanges();
      expect(root.querySelectorAll('.epoch-body')).toHaveLength(2);
      const leaving = root.querySelector<HTMLElement>('#epoch-a')!;
      expect(leaving.classList.contains('is-leaving')).toBe(true);
      expect(leaving.hasAttribute('inert')).toBe(true);
      expect(leaving.querySelector('.epoch-summary')?.textContent).toBe('a');
      vi.advanceTimersByTime(300);
      fixture.detectChanges();
      expect(root.querySelectorAll('.epoch-body')).toHaveLength(1);
      expect(root.querySelector('#epoch-a')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps one expanded period after rapid switches and focuses the arrow-key target', () => {
    const fixture = TestBed.createComponent(EraChartComponent);
    fixture.componentRef.setInput('epochs', [
      epoch('a', 1800, 1850),
      epoch('b', 1851, 1900),
      epoch('c', 1901, 1950),
    ]);
    fixture.componentRef.setInput('people', []);
    fixture.componentRef.setInput('markers', []);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const rows = [...root.querySelectorAll<HTMLButtonElement>('.era-epoch .epoch-row')];
    rows[1].click();
    rows[2].click();
    rows[0].click();
    rows[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selected()?.id).toBe('b');
    expect(root.querySelectorAll('.era-epoch .epoch-row[aria-expanded="true"]')).toHaveLength(1);
    expect(root.querySelectorAll('.era-epoch.is-selected')).toHaveLength(1);
    expect(root.querySelector('.era-epoch.is-selected .epoch-title')?.textContent).toBe('b');

    rows[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.selected()?.id).toBe('c');
    expect(document.activeElement).toBe(rows[2]);
  });

  it('renders a vertical ordered list instead of an absolute plot', () => {
    const fixture = TestBed.createComponent(EraChartComponent);
    fixture.componentRef.setInput('epochs', [epoch('a', 1800, 1900), epoch('b', 1901, 1950)]);
    fixture.componentRef.setInput('people', []);
    fixture.componentRef.setInput('markers', []);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.plot')).toBeNull();
    expect(root.querySelector('.axis')).toBeNull();
    expect(root.querySelectorAll('.era-epochs > li')).toHaveLength(2);
    expect(root.querySelector('.era-epoch.is-selected .epoch-title')!.textContent).toBe('a');
  });
});
