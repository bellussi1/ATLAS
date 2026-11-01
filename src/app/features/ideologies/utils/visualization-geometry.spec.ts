import { graphGeometry, temporalAxis } from './visualization-geometry';

describe('Static visualization geometry', () => {
  it('keeps nodes inside the canvas as the collection grows', () => {
    const edges = Array.from({ length: 8 }, (_, i) => ({ from: `a${i}`, to: `b${i}` }));
    const graph = graphGeometry(edges);
    expect(graph.nodes).toHaveLength(16);
    expect(graph.nodes.every((n) => n.y > 0 && n.y < graph.height)).toBe(true);
    expect(graph.paths.every((p) => p.startsWith('M') && !p.includes('NaN'))).toBe(true);
    expect(graphGeometry(edges)).toEqual(graph);
  });

  it('places dates proportionally and handles empty and single-year collections', () => {
    expect(temporalAxis([])).toBeNull();
    const single = temporalAxis([1848, 1848])!;
    expect(single.positions).toEqual([450, 450]);
    const axis = temporalAxis([-100, 0, 100])!;
    expect(axis.positions).toEqual([40, 450, 860]);
    expect(axis.ticks.every((t) => Number.isInteger(t.year))).toBe(true);
  });
});
