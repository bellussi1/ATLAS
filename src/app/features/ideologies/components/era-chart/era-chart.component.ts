import { Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import type { Entity } from '@core/content/models/content-schema';
import { type KnowledgeContext } from '@core/content/models/knowledge-context';
import { KnowledgeContextDirective } from '@shared/directives/knowledge-context/knowledge-context.directive';
import { AtlasRevealDirective } from '@shared/directives/reveal/reveal.directive';
import { RecordCardComponent } from '@shared/ui/record-card/record-card.component';

/** Cards shown per list before "Ver todas"; the rest stay one press away. */
export const ERA_LIST_LIMIT = 8;
/** Matches the collapse transition; the old body stays in the DOM until it ends. */
const LEAVE_MS = 280;

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
  /** The reader can close the open period; the first one opens on arrival without a selected id. */
  readonly closed = signal(false);
  /** Page-load rendering is immediate; only later open/close gets height motion. */
  readonly interacted = signal(false);
  /** The period collapsing under the new selection, kept on screen until the height ends. */
  readonly leavingId = signal<string | null>(null);
  /** Expansion state of the leaving body, so its height does not change while it collapses. */
  private readonly leavingExpanded = signal({ alive: false, dated: false });
  private leavingTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly destroyRef = inject(DestroyRef);

  readonly selected = computed(() => {
    if (this.closed()) return null;
    return (
      this.epochs().find((epoch) => epoch.id === this.selectedId()) ?? this.epochs()[0] ?? null
    );
  });
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
    return epoch ? this.aliveFor(epoch) : [];
  });
  readonly aliveExpanded = signal(false);
  readonly datedExpanded = signal(false);
  readonly limit = ERA_LIST_LIMIT;

  /** Dated records inside the selected epoch, so the markers have a readable list too. */
  readonly inEpoch = computed(() => {
    const epoch = this.selected();
    return epoch ? this.inEpochFor(epoch) : [];
  });
  /** Records left off the scale because a year is missing; said aloud, never guessed. */
  readonly undated = computed(
    () =>
      this.people().length - this.lives().length + (this.markers().length - this.dated().length),
  );

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.leavingTimer));
  }

  /** Body contents for the open period or the one collapsing, with its own expansion state. */
  epochView(epoch: EraChartEpoch) {
    if (this.selected()?.id === epoch.id)
      return {
        epoch,
        alive: this.alive(),
        dated: this.inEpoch(),
        aliveExpanded: this.aliveExpanded(),
        datedExpanded: this.datedExpanded(),
        interactive: true,
      };
    if (this.leavingId() === epoch.id)
      return {
        epoch,
        alive: this.aliveFor(epoch),
        dated: this.inEpochFor(epoch),
        aliveExpanded: this.leavingExpanded().alive,
        datedExpanded: this.leavingExpanded().dated,
        interactive: false,
      };
    return null;
  }

  select(id: string): void {
    this.interacted.set(true);
    if (this.selected()?.id === id) {
      this.closed.set(true);
      this.leave(id);
      return;
    }
    this.open(id);
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
    this.interacted.set(true);
    this.open(list[next].id);
    const buttons = (event.currentTarget as HTMLElement)
      .closest('.era-epochs')
      ?.querySelectorAll<HTMLButtonElement>('button.epoch-row');
    buttons?.[next]?.focus();
  }

  private aliveFor(epoch: EraChartEpoch) {
    const overlap = (life: { start: number; end: number }) =>
      Math.min(life.end, epoch.end) - Math.max(life.start, epoch.start);
    return this.lives()
      .filter((life) => life.start <= epoch.end && life.end >= epoch.start)
      .sort((a, b) => overlap(b) - overlap(a) || a.start - b.start);
  }

  private inEpochFor(epoch: EraChartEpoch) {
    return this.dated().filter((mark) => mark.year >= epoch.start && mark.year <= epoch.end);
  }

  private open(id: string): void {
    if (this.leavingId() === id) this.cancelLeaving();
    const current = this.selected();
    if (current && current.id !== id) this.leave(current.id);
    this.selectedId.set(id);
    this.closed.set(false);
    this.aliveExpanded.set(false);
    this.datedExpanded.set(false);
  }

  /** Keeps the old body in place while it collapses; the timer removes it after the transition. */
  private leave(id: string): void {
    clearTimeout(this.leavingTimer);
    this.leavingExpanded.set({ alive: this.aliveExpanded(), dated: this.datedExpanded() });
    this.leavingId.set(id);
    this.leavingTimer = setTimeout(() => {
      this.leavingId.set(null);
      this.leavingTimer = undefined;
    }, LEAVE_MS);
  }

  private cancelLeaving(): void {
    clearTimeout(this.leavingTimer);
    this.leavingTimer = undefined;
    this.leavingId.set(null);
  }
}
