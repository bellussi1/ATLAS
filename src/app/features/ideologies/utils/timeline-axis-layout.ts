/** Tracks of the axis, in reading order. */
export type TimelineTrackKey = 'people' | 'works' | 'events' | 'organizations';

export const timelineTracks: readonly { key: TimelineTrackKey; label: string }[] = [
  { key: 'people', label: 'Pessoas' },
  { key: 'works', label: 'Obras' },
  { key: 'events', label: 'Acontecimentos' },
  { key: 'organizations', label: 'Organizações' },
];

/** The track of a record kind; anything that is not a person, work or event is an organization. */
export function trackOf(kind: string): TimelineTrackKey {
  if (kind === 'person') return 'people';
  if (kind === 'work' || kind === 'article') return 'works';
  if (kind === 'event') return 'events';
  return 'organizations';
}

export interface TimelineAxisItem {
  id: string;
  title: string;
  kind: string;
  /** Singular name of the kind, for lists and accessible names. */
  kindLabel: string;
  /** First recorded year; when only an end year exists both are the same. */
  start: number;
  end: number;
  approximate: boolean;
}

export interface TimelineAxisRange {
  from: number;
  to: number;
}

export interface PlacedItem {
  item: TimelineAxisItem;
  track: TimelineTrackKey;
  /** Row inside the track, 0 is the top one. */
  row: number;
  /** Box of the button, in px from the left of the axis. */
  left: number;
  width: number;
  /** Marker centre and life bar, in px from the left edge of the button. */
  markerX: number;
  barWidth: number;
  label: string;
}

export interface PlacedTrack {
  key: TimelineTrackKey;
  label: string;
  rows: number;
  items: PlacedItem[];
}

export const ROW_PX = 44;
const LABEL_CHAR_PX = 7.6;
const LABEL_PAD_PX = 14;
const LABEL_MAX_PX = 184;
const GAP_PX = 6;
const MARKER_PX = 16;

export function itemLabel(item: TimelineAxisItem): string {
  const year = item.start === item.end ? `${item.start}` : `${item.start}–${item.end}`;
  return `${item.approximate ? 'c. ' : ''}${year} · ${item.title}`;
}

/** Items whose life or date touches the range. */
export function itemsInRange(
  items: readonly TimelineAxisItem[],
  range: TimelineAxisRange,
): TimelineAxisItem[] {
  return items.filter((item) => item.start <= range.to && item.end >= range.from);
}

/** Range that holds every item, padded a little so edge markers are not cut. */
export function fullRange(items: readonly TimelineAxisItem[]): TimelineAxisRange {
  if (!items.length) return { from: 0, to: 1 };
  const from = Math.min(...items.map((i) => i.start));
  const to = Math.max(...items.map((i) => i.end));
  const pad = Math.max(2, Math.round((to - from) * 0.03));
  return { from: from - pad, to: to + pad };
}

/**
 * Lays dated records on one axis: x comes from the year, tracks split by kind, and each
 * label takes the first row where it does not run into an earlier one. Order of arrival
 * never matters: items are sorted by year and id first, so the result is deterministic.
 */
export function layoutTimeline(
  items: readonly TimelineAxisItem[],
  range: TimelineAxisRange,
  pxPerYear: number,
): { width: number; tracks: PlacedTrack[] } {
  const width = Math.max(1, Math.round((range.to - range.from) * pxPerYear));
  const x = (year: number) => Math.min(width, Math.max(0, (year - range.from) * pxPerYear));
  const sorted = [...items].sort(
    (a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id),
  );
  const tracks: PlacedTrack[] = [];
  for (const { key, label } of timelineTracks) {
    const own = sorted.filter((item) => trackOf(item.kind) === key);
    if (!own.length) continue;
    const taken: [number, number][][] = [];
    const placed: PlacedItem[] = [];
    for (const item of own) {
      const text = itemLabel(item);
      const labelWidth = Math.min(LABEL_MAX_PX, text.length * LABEL_CHAR_PX + LABEL_PAD_PX);
      const x1 = x(item.start);
      const bar = Math.max(0, x(item.end) - x1);
      const boxWidth = Math.max(MARKER_PX, labelWidth, bar + MARKER_PX);
      const left = Math.max(0, Math.min(x1 - MARKER_PX / 2, width - boxWidth));
      let row = 0;
      while (taken[row]?.some(([a, b]) => left < b + GAP_PX && left + boxWidth + GAP_PX > a)) row++;
      taken[row] = [...(taken[row] ?? []), [left, left + boxWidth]];
      placed.push({
        item,
        track: key,
        row,
        left,
        width: boxWidth,
        markerX: x1 - left,
        barWidth: bar,
        label: text,
      });
    }
    tracks.push({ key, label, rows: taken.length, items: placed });
  }
  return { width, tracks };
}

/** Year ticks with at least `minGap` px between labels, on round steps. */
export function axisTicks(range: TimelineAxisRange, pxPerYear: number, minGap = 64): number[] {
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500];
  const step = steps.find((s) => s * pxPerYear >= minGap) ?? 1000;
  const ticks: number[] = [];
  for (let year = Math.ceil(range.from / step) * step; year <= range.to; year += step)
    ticks.push(year);
  return ticks;
}

/** Records in chronological order across tracks, which is the order arrow keys follow. */
export function chronological(items: readonly TimelineAxisItem[]): TimelineAxisItem[] {
  return [...items].sort((a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id));
}

/** Neighbour in another track whose start is closest to the current one; null at the edge. */
export function neighbourTrack(
  items: readonly TimelineAxisItem[],
  currentId: string,
  direction: 1 | -1,
): TimelineAxisItem | null {
  const current = items.find((i) => i.id === currentId);
  if (!current) return null;
  const order = timelineTracks.map((t) => t.key);
  const present = order.filter((key) => items.some((i) => trackOf(i.kind) === key));
  const next = present[present.indexOf(trackOf(current.kind)) + direction];
  if (!next) return null;
  return (
    items
      .filter((i) => trackOf(i.kind) === next)
      .sort(
        (a, b) =>
          Math.abs(a.start - current.start) - Math.abs(b.start - current.start) ||
          a.id.localeCompare(b.id),
      )[0] ?? null
  );
}
