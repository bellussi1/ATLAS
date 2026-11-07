import { Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { type Entity, placeTypeOf } from '@core/content/models/content-schema';
import { type KnowledgeContext } from '@core/content/models/knowledge-context';
import {
  type ChronologyGroup,
  chronologyGroupOf,
  chronologyGroups,
  chronologyItemOf,
  entityKindLabel,
} from '@ideologies/utils/chronology-items';
import type { EraTemporalNote } from '@ideologies/utils/chronology-temporal-notes';
import { KnowledgeContextDirective } from '@shared/directives/knowledge-context/knowledge-context.directive';
import { AtlasRevealDirective } from '@shared/directives/reveal/reveal.directive';
import { RecordCardComponent } from '@shared/ui/record-card/record-card.component';

/** Cards shown per list before "Ver todas"; the rest stay one press away. */
export const ERA_LIST_LIMIT = 8;
/** Markers are curated, but a long epoch still keeps the reading short. */
export const ERA_MARKER_LIMIT = 6;
/** Matches the collapse transition; the old body stays in the DOM until it ends. */
const LEAVE_MS = 280;

export interface EraChartEpoch {
  id: string;
  title: string;
  kicker: string;
  summary: string;
  start: number;
  end: number;
  /** Editorial context; absent on a neutral century cut. */
  context?: KnowledgeContext;
}

interface PlacedLife {
  entity: Entity;
  start: number;
  end: number;
  approx: boolean;
}

interface PlacedRecord {
  entity: Entity;
  year: number;
  approx: boolean;
}

type Filter = 'all' | ChronologyGroup;

/**
 * Vertical chronology: epochs in year order, each opening onto the records that changed the
 * tradition, the other dated records and the people alive in it. Lives, dated works and
 * documented participation are separate lines; nothing here claims influence or causation.
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
  /** Why a curated marker matters; only these records are called transformative. */
  readonly markerNotes = input<ReadonlyMap<string, string>>(new Map());
  /** Dated works and documented participation, read from existing atlas relations. */
  readonly temporalNotes = input<ReadonlyMap<string, EraTemporalNote>>(new Map());
  /** Neutral century cut used when the reading has no editorial periodization. */
  readonly autoPeriods = input(false);
  readonly selectedId = signal<string | null>(null);
  /** The reader can close the open period; the first one opens on arrival without a selected id. */
  readonly closed = signal(false);
  /** Page-load rendering is immediate; only later open/close gets height motion. */
  readonly interacted = signal(false);
  /** The period collapsing under the new selection, kept on screen until the height ends. */
  readonly leavingId = signal<string | null>(null);
  /** Expansion state of the leaving body, so its height does not change while it collapses. */
  private readonly leavingExpanded = signal({
    alive: false,
    dated: false,
    markers: false,
  });
  private leavingTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly destroyRef = inject(DestroyRef);

  readonly groups = chronologyGroups;
  readonly typeFilter = signal<Filter>('all');
  readonly aliveExpanded = signal(false);
  readonly datedExpanded = signal(false);
  readonly markersExpanded = signal(false);
  readonly limit = ERA_LIST_LIMIT;
  readonly markerLimit = ERA_MARKER_LIMIT;

  readonly selected = computed(() => {
    if (this.closed()) return null;
    return (
      this.epochs().find((epoch) => epoch.id === this.selectedId()) ?? this.epochs()[0] ?? null
    );
  });
  /** Counts stay on the whole set so the filter says what it is hiding. */
  readonly filterCounts = computed(() => {
    const counts: Record<ChronologyGroup, number> = {
      people: 0,
      works: 0,
      events: 0,
      organizations: 0,
    };
    for (const entity of [...this.people(), ...this.markers()]) {
      counts[chronologyGroupOf(entity.kind)]++;
    }
    return counts;
  });
  readonly totalRecords = computed(() => this.people().length + this.markers().length);
  readonly lives = computed<PlacedLife[]>(() =>
    this.people()
      .flatMap((entity) => {
        const item = chronologyItemOf(entity);
        const extent = entity.temporalExtent;
        return item && extent?.startYear != null && extent.endYear != null
          ? [
              {
                entity,
                start: item.start,
                end: item.end,
                approx: item.approximate,
              },
            ]
          : [];
      })
      .sort((a, b) => a.start - b.start),
  );
  readonly dated = computed<PlacedRecord[]>(() =>
    this.markers()
      .flatMap((entity) => {
        const item = chronologyItemOf(entity);
        return item ? [{ entity, year: item.start, approx: item.approximate }] : [];
      })
      .sort((a, b) => a.year - b.year),
  );
  /** Everyone alive in the epoch, those present for most of it first. */
  readonly alive = computed(() => {
    const epoch = this.selected();
    return epoch ? this.filterPeople(this.aliveFor(epoch)) : [];
  });
  /** Dated records inside the selected epoch, so the markers have a readable list too. */
  readonly inEpoch = computed(() => {
    const epoch = this.selected();
    return epoch ? this.inEpochFor(epoch) : [];
  });
  readonly epochMarkers = computed(() =>
    this.inEpoch()
      .filter((mark) => this.markerNotes().has(mark.entity.id))
      .filter((mark) => this.matchesFilter(mark.entity)),
  );
  readonly otherDated = computed(() =>
    this.inEpoch()
      .filter((mark) => !this.markerNotes().has(mark.entity.id))
      .filter((mark) => this.matchesFilter(mark.entity)),
  );
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
        dated: this.otherDated(),
        markers: this.epochMarkers(),
        aliveExpanded: this.aliveExpanded(),
        datedExpanded: this.datedExpanded(),
        markersExpanded: this.markersExpanded(),
        interactive: true,
      };
    if (this.leavingId() === epoch.id)
      return {
        epoch,
        alive: this.filterPeople(this.aliveFor(epoch)),
        dated: this.inEpochFor(epoch).filter(
          (mark) => !this.markerNotes().has(mark.entity.id) && this.matchesFilter(mark.entity),
        ),
        markers: this.inEpochFor(epoch).filter(
          (mark) => this.markerNotes().has(mark.entity.id) && this.matchesFilter(mark.entity),
        ),
        aliveExpanded: this.leavingExpanded().alive,
        datedExpanded: this.leavingExpanded().dated,
        markersExpanded: this.leavingExpanded().markers,
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

  /** The filters only change what is listed; the epoch and its place in the page stay put. */
  setFilter(filter: Filter): void {
    if (this.typeFilter() === filter) return;
    this.typeFilter.set(filter);
    this.aliveExpanded.set(false);
    this.datedExpanded.set(false);
    this.markersExpanded.set(false);
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

  /** Position of an epoch on the common range, for the small band in its row. */
  bandFor(epoch: EraChartEpoch): { left: number; width: number } {
    const list = this.epochs();
    if (!list.length) return { left: 0, width: 100 };
    const from = Math.min(...list.map((item) => item.start));
    const to = Math.max(...list.map((item) => item.end));
    const span = Math.max(1, to - from);
    return {
      left: ((epoch.start - from) / span) * 100,
      width: Math.max(1.5, ((epoch.end - epoch.start) / span) * 100),
    };
  }

  /** Where a life sits inside the open epoch; clamped, because the epoch is the reading frame. */
  lifeBand(life: PlacedLife, epoch: EraChartEpoch): { left: number; width: number } | null {
    const span = Math.max(1, epoch.end - epoch.start);
    const start = Math.max(life.start, epoch.start);
    const end = Math.min(life.end, epoch.end);
    if (end < start) return null;
    return {
      left: ((start - epoch.start) / span) * 100,
      width: Math.max(1.5, ((end - start) / span) * 100),
    };
  }

  noteFor(entity: Entity): EraTemporalNote | undefined {
    return this.temporalNotes().get(entity.id);
  }

  markerNoteFor(entity: Entity): string | undefined {
    return this.markerNotes().get(entity.id);
  }

  kindLabel(entity: Entity): string {
    return entityKindLabel(entity.kind, placeTypeOf(entity));
  }

  activityLabel(note: EraTemporalNote): string {
    const activity = note.activity;
    if (!activity) return '';
    const years =
      activity.from === activity.to ? `${activity.from}` : `${activity.from}–${activity.to}`;
    return activity.titles.length === 1
      ? `Obra datada: ${activity.titles[0]} (${years})`
      : `Obras datadas: ${years} (${activity.titles.length})`;
  }

  participationLabel(note: EraTemporalNote): string {
    const events = note.participation;
    if (!events?.length) return '';
    const first = `${events[0]!.title} (${events[0]!.year})`;
    return events.length === 1
      ? `Participação documentada: ${first}`
      : `Participação documentada: ${first} e mais ${events.length - 1}`;
  }

  epochRecordCount(epoch: EraChartEpoch): number {
    return this.inEpochFor(epoch).length;
  }

  epochPeopleCount(epoch: EraChartEpoch): number {
    return this.aliveFor(epoch).length;
  }

  /** Filter label with the count, used on the chips and in the empty state. */
  filterLabel(filter: Filter): string {
    return filter === 'all'
      ? 'Tudo'
      : (this.groups.find((group) => group.key === filter)?.label ?? '');
  }

  private matchesFilter(entity: Entity): boolean {
    const filter = this.typeFilter();
    return filter === 'all' || chronologyGroupOf(entity.kind) === filter;
  }

  private filterPeople(lives: PlacedLife[]): PlacedLife[] {
    const filter = this.typeFilter();
    return filter === 'all' || filter === 'people' ? lives : [];
  }

  private aliveFor(epoch: EraChartEpoch): PlacedLife[] {
    const overlap = (life: { start: number; end: number }) =>
      Math.min(life.end, epoch.end) - Math.max(life.start, epoch.start);
    return this.lives()
      .filter((life) => life.start <= epoch.end && life.end >= epoch.start)
      .sort((a, b) => overlap(b) - overlap(a) || a.start - b.start);
  }

  private inEpochFor(epoch: EraChartEpoch): PlacedRecord[] {
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
    this.markersExpanded.set(false);
  }

  /** Keeps the old body in place while it collapses; the timer removes it after the transition. */
  private leave(id: string): void {
    clearTimeout(this.leavingTimer);
    this.leavingExpanded.set({
      alive: this.aliveExpanded(),
      dated: this.datedExpanded(),
      markers: this.markersExpanded(),
    });
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
