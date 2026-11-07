/** A straight edge in world coordinates, before it becomes SVG path data. */
export interface EdgeSegment {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  fade: number;
}

export interface EdgeBatch {
  key: string;
  d: string;
  opacity: number;
}

const round = (value: number): number => Math.round(value * 10) / 10;

/**
 * Joins edges that share a key and a fade bucket into one `<path>`. A map with hundreds of links
 * then paints a handful of elements instead of hundreds, which is what made the first render and
 * every pan expensive.
 */
export function batchEdgeSegments(segments: readonly EdgeSegment[], buckets = 5): EdgeBatch[] {
  const groups = new Map<string, { parts: string[]; fade: number }>();
  for (const segment of segments) {
    const bucket = Math.min(buckets, Math.max(1, Math.round(segment.fade * buckets)));
    const key = `${segment.key}|${bucket}`;
    const group = groups.get(key) ?? { parts: [], fade: bucket / buckets };
    group.parts.push(
      `M${round(segment.x1)} ${round(segment.y1)}L${round(segment.x2)} ${round(segment.y2)}`,
    );
    groups.set(key, group);
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b, 'en'))
    .map(([key, group]) => ({
      key,
      d: group.parts.join(''),
      opacity: Math.round(0.55 * group.fade * 100) / 100,
    }));
}
