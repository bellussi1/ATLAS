import { Component, computed, input, signal } from '@angular/core';
import type { Entity } from '@core/content/models/content-schema';
import { type KnowledgeContext } from '@core/content/models/knowledge-context';
import { KnowledgeContextDirective } from '@shared/directives/knowledge-context/knowledge-context.directive';
import { AtlasRevealDirective } from '@shared/directives/reveal/reveal.directive';

export interface EraChartEpoch {
  id: string;
  title: string;
  kicker: string;
  summary: string;
  start: number;
  end: number;
  context: KnowledgeContext;
}

/**
 * Era chart: epochs as bands, registered lifespans as bars and dated records as
 * markers on one shared scale. Positions come only from recorded years.
 */
@Component({
  selector: 'app-era-chart',
  imports: [KnowledgeContextDirective, AtlasRevealDirective],
  templateUrl: './era-chart.component.html',
  styleUrl: './era-chart.component.scss',
})
export class EraChartComponent {
  readonly epochs = input.required<EraChartEpoch[]>();
  readonly people = input.required<Entity[]>();
  readonly markers = input.required<Entity[]>();
  readonly selectedId = signal<string | null>(null);

  readonly selected = computed(
    () => this.epochs().find((e) => e.id === this.selectedId()) ?? this.epochs()[0],
  );
  readonly range = computed(() => {
    const years = [
      ...this.epochs().flatMap((e) => [e.start, e.end]),
      ...this.lives().flatMap((p) => [p.start, p.end]),
    ];
    return {
      start: Math.floor(Math.min(...years) / 10) * 10,
      end: Math.ceil(Math.max(...years) / 10) * 10,
    };
  });
  readonly ticks = computed(() => {
    const { start, end } = this.range();
    const ticks: number[] = [];
    for (let year = Math.ceil(start / 25) * 25; year <= end; year += 25) ticks.push(year);
    return ticks;
  });
  readonly lives = computed(() =>
    this.people()
      .flatMap((entity) => {
        const t = entity.temporalExtent;
        return t?.startYear && t.endYear
          ? [{ entity, start: t.startYear, end: t.endYear, approx: t.precision !== 'year' }]
          : [];
      })
      .sort((a, b) => a.start - b.start),
  );
  readonly dated = computed(() =>
    this.markers()
      .flatMap((entity) => {
        const t = entity.temporalExtent;
        return t?.startYear ? [{ entity, year: t.startYear, approx: t.precision !== 'year' }] : [];
      })
      .sort((a, b) => a.year - b.year),
  );
  readonly alive = computed(() => {
    const epoch = this.selected();
    return this.lives().filter((life) => life.start <= epoch.end && life.end >= epoch.start);
  });

  /** Dated records inside the selected epoch, so the markers have a readable list too. */
  readonly inEpoch = computed(() => {
    const epoch = this.selected();
    return this.dated().filter((mark) => mark.year >= epoch.start && mark.year <= epoch.end);
  });
  /** Records left off the scale because a year is missing; said aloud, never guessed. */
  readonly undated = computed(
    () =>
      this.people().length - this.lives().length + (this.markers().length - this.dated().length),
  );

  x(year: number): string {
    const { start, end } = this.range();
    return `${((year - start) / (end - start)) * 100}%`;
  }
  span(from: number, to: number): string {
    const { start, end } = this.range();
    return `${((Math.max(to, from + 1) - from) / (end - start)) * 100}%`;
  }
  overlaps(start: number, end: number): boolean {
    const epoch = this.selected();
    return start <= epoch.end && end >= epoch.start;
  }
  select(id: string): void {
    this.selectedId.set(id);
  }
  step(event: KeyboardEvent, index: number): void {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const list = this.epochs();
    const next = list[(index + delta + list.length) % list.length];
    this.select(next.id);
    const buttons = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll('button');
    buttons?.[list.indexOf(next)]?.focus();
  }
}
