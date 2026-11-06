import { batchDots, batchEdgeSegments } from './graph-batching';

describe('graph batching', () => {
  it('joins edges by key and fade bucket, keeping the coordinates', () => {
    const batches = batchEdgeSegments([
      { key: 'a', x1: 0, y1: 0, x2: 10, y2: 10, fade: 1 },
      { key: 'a', x1: 20, y1: 0, x2: 30, y2: 10, fade: 0.98 },
      { key: 'b', x1: 5, y1: 5, x2: 6, y2: 6, fade: 0.2 },
    ]);
    expect(batches.map((batch) => batch.key)).toEqual(['a|5', 'b|1']);
    expect(batches[0].d).toBe('M0 0L10 10M20 0L30 10');
    expect(batches[0].opacity).toBeCloseTo(0.55);
    expect(batches[1].opacity).toBeCloseTo(0.11);
  });

  it('merges minimap dots of the same colour into one path', () => {
    const paths = batchDots([
      { x: 1, y: 2, color: 'red' },
      { x: 3, y: 4, color: 'blue' },
      { x: 5, y: 6, color: 'red' },
    ]);
    expect(paths).toEqual([
      { color: 'blue', d: 'M3 4h0' },
      { color: 'red', d: 'M1 2h0M5 6h0' },
    ]);
  });

  it('emits nothing for an empty map', () => {
    expect(batchEdgeSegments([])).toEqual([]);
    expect(batchDots([])).toEqual([]);
  });
});
