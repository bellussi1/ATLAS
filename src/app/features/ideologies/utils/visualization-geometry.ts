import { scaleLinear } from 'd3-scale';
import { linkHorizontal } from 'd3-shape';

interface Point {
  x: number;
  y: number;
}

/** Pure geometry: Angular owns the SVG DOM on server and browser alike. */
export function graphGeometry(edges: readonly { from: string; to: string }[]) {
  const ids = [...new Set(edges.flatMap((edge) => [edge.from, edge.to]))];
  const nodes = ids.map((id, index) => ({
    id,
    x: index % 2 ? 700 : 190,
    y: 60 + Math.floor(index / 2) * 130,
  }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const link = linkHorizontal<unknown, Point>()
    .x((p) => p.x)
    .y((p) => p.y);
  return {
    nodes,
    height: Math.max(380, Math.ceil(nodes.length / 2) * 130),
    paths: edges.map((edge) => link({ source: byId.get(edge.from)!, target: byId.get(edge.to)! })!),
  };
}

/** Missing dates are excluded by the caller; the domain stays fixed across filters. */
export function temporalAxis(years: readonly number[]) {
  if (!years.length) return null;
  const first = Math.min(...years);
  const last = Math.max(...years);
  const scale = scaleLinear().domain([first, last]).range([40, 860]);
  const ticks = first === last ? [first] : scale.ticks(3);
  return {
    positions: years.map((year) => scale(year)),
    ticks: ticks.filter(Number.isInteger).map((year) => ({ year, x: scale(year) })),
  };
}
