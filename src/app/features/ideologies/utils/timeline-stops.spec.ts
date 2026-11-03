import { timelineStops } from './timeline-stops';

describe('timelineStops', () => {
  it('keeps years in order, inside the track, in proportion when there is room', () => {
    const stops = timelineStops([
      { id: 'c', year: 1900 },
      { id: 'a', year: 1800 },
      { id: 'b', year: 1850 },
    ]);
    expect(stops.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(stops[0].left).toBe(6);
    expect(stops[1].left).toBe(50);
    expect(stops[2].left).toBe(94);
  });

  it('pushes close years apart so no two markers overlap', () => {
    const stops = timelineStops([
      { id: 'a', year: 1776 },
      { id: 'b', year: 1848 },
      { id: 'c', year: 1867 },
      { id: 'd', year: 1871 },
      { id: 'e', year: 1889 },
      { id: 'f', year: 1917 },
    ]);
    for (let i = 1; i < stops.length; i++) {
      expect(stops[i].left - stops[i - 1].left).toBeGreaterThanOrEqual(13.99);
    }
    expect(stops[0].left).toBeGreaterThanOrEqual(0);
    expect(stops[5].left).toBeLessThanOrEqual(100);
  });

  it('handles a single record and an empty list', () => {
    expect(timelineStops([])).toEqual([]);
    expect(timelineStops([{ id: 'a', year: 1900 }])[0].left).toBe(50);
  });
});
