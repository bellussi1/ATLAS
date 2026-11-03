import {
  axisTicks,
  fullRange,
  itemsInRange,
  layoutTimeline,
  neighbourTrack,
  ROW_PX,
  type TimelineAxisItem,
  trackOf,
} from './timeline-axis-layout';

const item = (
  id: string,
  kind: string,
  start: number,
  end = start,
  approximate = false,
  title = id,
): TimelineAxisItem => ({ id, kind, kindLabel: kind, start, end, approximate, title });

describe('timeline axis layout', () => {
  it('sends each kind to its own track', () => {
    expect(trackOf('person')).toBe('people');
    expect(trackOf('work')).toBe('works');
    expect(trackOf('event')).toBe('events');
    expect(trackOf('party')).toBe('organizations');
  });

  it('never overlaps labels in a track, even with many records in the same year', () => {
    const items = Array.from({ length: 30 }, (_, i) => item(`e${i}`, 'event', 1848));
    const { tracks } = layoutTimeline(items, fullRange(items), 20);
    const placed = tracks[0]!.items;
    expect(placed).toHaveLength(30);
    for (const a of placed)
      for (const b of placed) {
        if (a === b || a.row !== b.row) continue;
        expect(a.left + a.width <= b.left || b.left + b.width <= a.left).toBe(true);
      }
    expect(tracks[0]!.rows).toBe(new Set(placed.map((p) => p.row)).size);
  });

  it('gives the same layout whatever the input order', () => {
    const items = [
      item('b', 'person', 1820, 1895),
      item('a', 'person', 1818, 1883),
      item('c', 'work', 1848),
    ];
    const range = fullRange(items);
    expect(layoutTimeline([...items].reverse(), range, 5)).toEqual(layoutTimeline(items, range, 5));
  });

  it('draws lives as bars proportional to the years and dates as points', () => {
    const items = [item('life', 'person', 1800, 1900), item('date', 'event', 1850)];
    const { tracks } = layoutTimeline(items, { from: 1800, to: 1900 }, 10);
    expect(tracks.find((t) => t.key === 'people')!.items[0]!.barWidth).toBe(1000);
    expect(tracks.find((t) => t.key === 'events')!.items[0]!.barWidth).toBe(0);
  });

  it('keeps long names short with the full text left for the accessible name', () => {
    const long = item('x', 'work', 1900, 1900, true, 'Um título extremamente longo '.repeat(8));
    const [only] = layoutTimeline([long], { from: 1890, to: 1910 }, 30).tracks[0]!.items;
    expect(only!.width).toBeLessThanOrEqual(184);
    expect(only!.label.startsWith('c. 1900')).toBe(true);
  });

  it('handles a range from 1776 to 2000, one record and none', () => {
    const wide = [item('a', 'event', 1776), item('b', 'event', 2000)];
    const { width, tracks } = layoutTimeline(wide, fullRange(wide), 1.5);
    expect(width).toBeGreaterThan(300);
    expect(tracks[0]!.items.every((p) => p.left >= 0 && p.left + p.width <= width)).toBe(true);
    const single = [item('only', 'person', 1900)];
    expect(fullRange(single).to).toBeGreaterThan(fullRange(single).from);
    expect(layoutTimeline([], fullRange([]), 5).tracks).toEqual([]);
    expect(ROW_PX).toBe(44);
  });

  it('filters by range overlap and picks round tick steps', () => {
    const items = [item('life', 'person', 1800, 1900), item('out', 'event', 1700)];
    expect(itemsInRange(items, { from: 1850, to: 1860 }).map((i) => i.id)).toEqual(['life']);
    const ticks = axisTicks({ from: 1776, to: 2000 }, 1.5);
    expect(ticks[1]! - ticks[0]!).toBeGreaterThanOrEqual(25);
  });

  it('moves between tracks to the record closest in time', () => {
    const items = [item('p', 'person', 1850), item('w1', 'work', 1700), item('w2', 'work', 1845)];
    expect(neighbourTrack(items, 'p', 1)?.id).toBe('w2');
    expect(neighbourTrack(items, 'p', -1)).toBeNull();
  });
});
