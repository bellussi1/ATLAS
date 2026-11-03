export interface TimelineStop {
  id: string;
  year: number;
  /** Horizontal position in percent of the track. */
  left: number;
}

const EDGE = 6;
const MIN_GAP = 14;

/**
 * Places dated records on one track in proportion to their years, then pushes neighbours
 * apart so every marker keeps a touch target of its own. Order never changes; only the
 * spacing between close years is stretched.
 */
export function timelineStops(items: readonly { id: string; year: number }[]): TimelineStop[] {
  if (!items.length) return [];
  const sorted = [...items].sort((a, b) => a.year - b.year);
  const first = sorted[0].year;
  const span = sorted[sorted.length - 1].year - first;
  const room = 100 - 2 * EDGE;
  const lefts = sorted.map((item) => (span ? EDGE + (room * (item.year - first)) / span : 50));
  const gap = Math.min(MIN_GAP, sorted.length > 1 ? room / (sorted.length - 1) : MIN_GAP);
  for (let i = 1; i < lefts.length; i++) lefts[i] = Math.max(lefts[i], lefts[i - 1] + gap);
  const overflow = lefts[lefts.length - 1] - (100 - EDGE);
  if (overflow > 0) lefts[lefts.length - 1] -= overflow;
  for (let i = lefts.length - 2; i >= 0; i--) lefts[i] = Math.min(lefts[i], lefts[i + 1] - gap);
  return sorted.map((item, i) => ({ id: item.id, year: item.year, left: lefts[i] }));
}
