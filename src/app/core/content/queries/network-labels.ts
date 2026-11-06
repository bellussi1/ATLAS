export interface LabelCandidate {
  id: string;
  text: string;
  /** Node centre and radius, in screen pixels. */
  x: number;
  y: number;
  radius: number;
  /** Lower places first. */
  priority: number;
  /** Always shown, even over lower priorities. */
  forced?: boolean;
}

export interface LabelObstacle {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface PlacedLabel {
  id: string;
  text: string;
  /** Anchor point relative to the node centre, in screen pixels. */
  dx: number;
  dy: number;
  anchor: 'start' | 'middle' | 'end';
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const LABEL_HEIGHT = 16;
const GAP = 4;
/** Side of the spatial bucket used to avoid testing every node for every label. */
const CELL = 64;

type ObstacleIndex = Map<string, LabelObstacle[]>;

const cellKey = (x: number, y: number): string => `${x}:${y}`;

/** Buckets each node circle into every cell it touches, so nearby labels test only that cell. */
function indexObstacles(obstacles: readonly LabelObstacle[]): ObstacleIndex {
  const cells: ObstacleIndex = new Map();
  for (const obstacle of obstacles) {
    const minX = Math.floor((obstacle.x - obstacle.radius) / CELL);
    const maxX = Math.floor((obstacle.x + obstacle.radius) / CELL);
    const minY = Math.floor((obstacle.y - obstacle.radius) / CELL);
    const maxY = Math.floor((obstacle.y + obstacle.radius) / CELL);
    for (let x = minX; x <= maxX; x++)
      for (let y = minY; y <= maxY; y++) {
        const key = cellKey(x, y);
        const list = cells.get(key) ?? [];
        list.push(obstacle);
        cells.set(key, list);
      }
  }
  return cells;
}

/** Obstacles whose circle can touch the box: only the cells the box overlaps. */
function nearbyObstacles(cells: ObstacleIndex, box: Box): Set<LabelObstacle> {
  const found = new Set<LabelObstacle>();
  for (let x = Math.floor(box.left / CELL); x <= Math.floor(box.right / CELL); x++)
    for (let y = Math.floor(box.top / CELL); y <= Math.floor(box.bottom / CELL); y++)
      for (const obstacle of cells.get(cellKey(x, y)) ?? []) found.add(obstacle);
  return found;
}

export function labelWidth(text: string): number {
  return text.length * 6.6 + 8;
}

function insideBounds(box: Box, bounds: Box): boolean {
  return (
    box.left >= bounds.left &&
    box.right <= bounds.right &&
    box.top >= bounds.top &&
    box.bottom <= bounds.bottom
  );
}

function boxesOverlap(a: Box, b: Box): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function hitsCircle(box: Box, circle: LabelObstacle): boolean {
  const nearestX = Math.max(box.left, Math.min(circle.x, box.right));
  const nearestY = Math.max(box.top, Math.min(circle.y, box.bottom));
  return Math.hypot(circle.x - nearestX, circle.y - nearestY) < circle.radius + 1;
}

/**
 * Greedy label placement: each label tries right, below, above and left of its node and takes
 * the first spot that covers no other label and no node shape. A label that fits nowhere is
 * dropped, except forced ones, which keep their first spot. With `bounds`, a label that would
 * leave the visible area tries another side first.
 */
export function placeLabels(
  candidates: readonly LabelCandidate[],
  obstacles: readonly LabelObstacle[],
  limit = Infinity,
  bounds?: Box,
): PlacedLabel[] {
  let optional = 0;
  const placed: PlacedLabel[] = [];
  const taken: Box[] = [];
  const cells = indexObstacles(obstacles);
  const ordered = [...candidates].sort(
    (a, b) => Number(!!b.forced) - Number(!!a.forced) || a.priority - b.priority,
  );
  for (const candidate of ordered) {
    if (!candidate.forced && candidate.priority >= 0 && optional >= limit) continue;
    const width = labelWidth(candidate.text);
    const { x, y, radius } = candidate;
    const options: { box: Box; dx: number; dy: number; anchor: PlacedLabel['anchor'] }[] = [
      {
        box: {
          left: x + radius + GAP,
          top: y - LABEL_HEIGHT / 2,
          right: x + radius + GAP + width,
          bottom: y + LABEL_HEIGHT / 2,
        },
        dx: radius + GAP + 3,
        dy: 0,
        anchor: 'start',
      },
      {
        box: {
          left: x - width / 2,
          top: y + radius + GAP,
          right: x + width / 2,
          bottom: y + radius + GAP + LABEL_HEIGHT,
        },
        dx: 0,
        dy: radius + GAP + LABEL_HEIGHT / 2,
        anchor: 'middle',
      },
      {
        box: {
          left: x - width / 2,
          top: y - radius - GAP - LABEL_HEIGHT,
          right: x + width / 2,
          bottom: y - radius - GAP,
        },
        dx: 0,
        dy: -(radius + GAP + LABEL_HEIGHT / 2),
        anchor: 'middle',
      },
      {
        box: {
          left: x - radius - GAP - width,
          top: y - LABEL_HEIGHT / 2,
          right: x - radius - GAP,
          bottom: y + LABEL_HEIGHT / 2,
        },
        dx: -(radius + GAP + 3),
        dy: 0,
        anchor: 'end',
      },
    ];
    const free = options.find((option) => {
      if (bounds && !insideBounds(option.box, bounds)) return false;
      if (taken.some((box) => boxesOverlap(option.box, box))) return false;
      for (const node of nearbyObstacles(cells, option.box))
        if (node.id !== candidate.id && hitsCircle(option.box, node)) return false;
      return true;
    });
    const choice = free ?? (candidate.forced ? options[0] : undefined);
    if (!choice) continue;
    if (!candidate.forced && candidate.priority >= 0) optional++;
    taken.push(choice.box);
    placed.push({
      id: candidate.id,
      text: candidate.text,
      dx: choice.dx,
      dy: choice.dy,
      anchor: choice.anchor,
    });
  }
  return placed;
}
