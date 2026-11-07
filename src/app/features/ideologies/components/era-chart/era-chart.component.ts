import { Component, computed, input, signal } from '@angular/core';
import type { Entity } from '@core/content/models/content-schema';
import { type KnowledgeContext } from '@core/content/models/knowledge-context';
import { KnowledgeContextDirective } from '@shared/directives/knowledge-context/knowledge-context.directive';
import { AtlasRevealDirective } from '@shared/directives/reveal/reveal.directive';
import { RecordCardComponent } from '@shared/ui/record-card/record-card.component';

/** Cards shown per list before "Ver todas"; the rest stay one press away. */
export const ERA_LIST_LIMIT = 8;

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
 * Vertical timeline: epochs in chronological order, each opening onto the dated records and
 * the people alive in it. No horizontal plot, no overlapping labels, no zoom to decode.
 */
@Component({
  selector: 'app-era-chart',
  imports: [RecordCardComponent, KnowledgeContextDirective, AtlasRevealDirective],
  templateUrl: './era-chart.component.html',
  styleUrl: './era-chart.component.scss',
})
export class EraChartComponent {
  readonly epochs = input.required<EraChartEpoch[]>();
  readonly people = input.required<Entity[]>();
  readonly markers = input.required<Entity[]>();
  readonly selectedId = signal<string | null>(null);

  readonly selected = computed(
    () => this.epochs().find((epoch) => epoch.id === this.selectedId()) ?? this.epochs()[0],
  );
  readonly lives = computed(() =>
    this.people()
      .flatMap((entity) => {
        const extent = entity.temporalExtent;
        return extent?.startYear && extent.endYear
          ? [
              {
                entity,
                start: extent.startYear,
                end: extent.endYear,
                approx: extent.precision !== 'year',
              },
            ]
          : [];
      })
      .sort((a, b) => a.start - b.start),
  );
  readonly dated = computed(() =>
    this.markers()
      .flatMap((entity) => {
        const extent = entity.temporalExtent;
        return extent?.startYear
          ? [{ entity, year: extent.startYear, approx: extent.precision !== 'year' }]
          : [];
      })
      .sort((a, b) => a.year - b.year),
  );
  /** Everyone alive in the epoch, those present for most of it first. */
  readonly alive = computed(() => {
    const epoch = this.selected();
    if (!epoch) return [];
    const overlap = (life: { start: number; end: number }) =>
      Math.min(life.end, epoch.end) - Math.max(life.start, epoch.start);
    return this.lives()
      .filter((life) => life.start <= epoch.end && life.end >= epoch.start)
      .sort((a, b) => overlap(b) - overlap(a) || a.start - b.start);
  });
  readonly aliveExpanded = signal(false);
  readonly datedExpanded = signal(false);
  readonly limit = ERA_LIST_LIMIT;
  readonly aliveShown = computed(() =>
    this.aliveExpanded() ? this.alive() : this.alive().slice(0, ERA_LIST_LIMIT),
  );
  readonly datedShown = computed(() =>
    this.datedExpanded() ? this.inEpoch() : this.inEpoch().slice(0, ERA_LIST_LIMIT),
  );

  /** Dated records inside the selected epoch, so the markers have a readable list too. */
  readonly inEpoch = computed(() => {
    const epoch = this.selected();
    if (!epoch) return [];
    return this.dated().filter((mark) => mark.year >= epoch.start && mark.year <= epoch.end);
  });
  /** Records left off the scale because a year is missing; said aloud, never guessed. */
  readonly undated = computed(
    () =>
      this.people().length - this.lives().length + (this.markers().length - this.dated().length),
  );

  select(id: string): void {
    this.selectedId.set(id);
    this.aliveExpanded.set(false);
    this.datedExpanded.set(false);
  }

  /** The data kicker often repeats the years; the timeline already has its own year column. */
  kicker(epoch: EraChartEpoch): string {
    return epoch.kicker.replace(/^\d{3,4}(?:[–-]\d{3,4})?\s*·?\s*/, '');
  }

  /** Down/Right and Up/Left walk the epochs and keep focus on the chosen row. */
  step(event: KeyboardEvent, index: number): void {
    const delta =
      event.key === 'ArrowDown' || event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
          ? -1
          : 0;
    if (!delta) return;
    event.preventDefault();
    const list = this.epochs();
    const next = (index + delta + list.length) % list.length;
    this.select(list[next].id);
    const buttons = (event.currentTarget as HTMLElement)
      .closest('.era-epochs')
      ?.querySelectorAll<HTMLButtonElement>('button.epoch-row');
    buttons?.[next]?.focus();
  }
}
