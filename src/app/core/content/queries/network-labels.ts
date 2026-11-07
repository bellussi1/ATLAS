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

/** Semantic zoom levels: few reference names, more names, then local detail. */
export type LabelTier = 'global' | 'middle' | 'local';

const GLOBAL_TO_MIDDLE = 1.75;
const MIDDLE_TO_GLOBAL = 1.45;
const MIDDLE_TO_LOCAL = 3.5;
const LOCAL_TO_MIDDLE = 3.0;

export function labelTierFor(zoom: number): LabelTier {
  if (zoom < GLOBAL_TO_MIDDLE) return 'global';
  if (zoom < MIDDLE_TO_LOCAL) return 'middle';
  return 'local';
}

/**
 * Keeps the tier stable around its thresholds: once a level is chosen, it only changes after the
 * view crosses a wider margin. Panning and small wheel steps therefore do not reshuffle names.
 */
export function stableLabelTier(zoom: number, previous: LabelTier | null): LabelTier {
  if (!previous) return labelTierFor(zoom);
  if (previous === 'global') return zoom >= GLOBAL_TO_MIDDLE ? 'middle' : 'global';
  if (previous === 'middle')
    return zoom >= MIDDLE_TO_LOCAL ? 'local' : zoom < MIDDLE_TO_GLOBAL ? 'global' : 'middle';
  return zoom < LOCAL_TO_MIDDLE ? 'middle' : 'local';
}

/** Names allowed at each level. The global view is a legend of reference points, not a list. */
export function labelBudget(tier: LabelTier): number {
  return tier === 'global' ? 12 : tier === 'middle' ? 24 : 36;
}

/** Long titles are shortened by tier, always on a word boundary. */
export function labelTextLimit(tier: LabelTier): number {
  return tier === 'global' ? 30 : tier === 'middle' ? 36 : 44;
}

export function shortenLabel(text: string, limit: number): string {
  const clean = text.trim();
  if (clean.length <= limit) return clean;
  const slice = clean.slice(0, Math.max(1, limit - 1));
  const cut = slice.replace(/\s+\S*$/, '').trim();
  return `${cut || slice.trim()}…`;
}

export interface SpreadBox {
  width: number;
  height: number;
  columns?: number;
  rows?: number;
}

function cellOf(candidate: LabelCandidate, box: SpreadBox): string {
  const columns = box.columns ?? 4;
  const rows = box.rows ?? 3;
  const x = Math.min(
    columns - 1,
    Math.max(0, Math.floor((candidate.x / Math.max(1, box.width)) * columns)),
  );
  const y = Math.min(
    rows - 1,
    Math.max(0, Math.floor((candidate.y / Math.max(1, box.height)) * rows)),
  );
  return `${x}:${y}`;
}

/**
 * Picks a budget of candidates while keeping the map legible as a whole: the best candidate always
 * enters, then one per occupied area, then the rest by relevance under a per-area ceiling. Without
 * this, the highest-degree nodes of one community can fill every label slot.
 */
export function spreadCandidates(
  candidates: readonly LabelCandidate[],
  budget: number,
  box: SpreadBox,
): LabelCandidate[] {
  if (budget <= 0 || !candidates.length) return [];
  const byPriority = (a: LabelCandidate, b: LabelCandidate) =>
    a.priority - b.priority || a.id.localeCompare(b.id);
  const ordered = [...candidates].sort(byPriority);
  const cells = new Map<string, LabelCandidate[]>();
  for (const candidate of ordered) {
    const key = cellOf(candidate, box);
    const list = cells.get(key) ?? [];
    list.push(candidate);
    cells.set(key, list);
  }
  const cellOrder = [...cells.entries()]
    .map(([key, list]) => ({ key, list }))
    .sort((a, b) => byPriority(a.list[0], b.list[0]) || a.key.localeCompare(b.key));
  const chosen: LabelCandidate[] = [];
  const chosenIds = new Set<string>();
  const perCell = new Map<string, number>();
  const first = ordered[0];
  chosen.push(first);
  chosenIds.add(first.id);
  perCell.set(cellOf(first, box), 1);
  for (const cell of cellOrder) {
    if (chosen.length >= budget) break;
    const next = cell.list.find((candidate) => !chosenIds.has(candidate.id));
    if (!next) continue;
    chosen.push(next);
    chosenIds.add(next.id);
    perCell.set(cell.key, 1);
  }
  const columns = box.columns ?? 4;
  const rows = box.rows ?? 3;
  const cap = Math.max(1, Math.ceil(budget / (columns * rows)) + 1);
  for (const candidate of ordered) {
    if (chosen.length >= budget) break;
    if (chosenIds.has(candidate.id)) continue;
    const key = cellOf(candidate, box);
    if ((perCell.get(key) ?? 0) >= cap) continue;
    chosen.push(candidate);
    chosenIds.add(candidate.id);
    perCell.set(key, (perCell.get(key) ?? 0) + 1);
  }
  return chosen.sort(byPriority).map((candidate, index) => ({ ...candidate, priority: index }));
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
      {
        box: {
          left: x + radius + GAP,
          top: y + radius + GAP,
          right: x + radius + GAP + width,
          bottom: y + radius + GAP + LABEL_HEIGHT,
        },
        dx: radius + GAP + 3,
        dy: radius + GAP + LABEL_HEIGHT / 2,
        anchor: 'start',
      },
      {
        box: {
          left: x + radius + GAP,
          top: y - radius - GAP - LABEL_HEIGHT,
          right: x + radius + GAP + width,
          bottom: y - radius - GAP,
        },
        dx: radius + GAP + 3,
        dy: -(radius + GAP + LABEL_HEIGHT / 2),
        anchor: 'start',
      },
      {
        box: {
          left: x - radius - GAP - width,
          top: y + radius + GAP,
          right: x - radius - GAP,
          bottom: y + radius + GAP + LABEL_HEIGHT,
        },
        dx: -(radius + GAP + 3),
        dy: radius + GAP + LABEL_HEIGHT / 2,
        anchor: 'end',
      },
      {
        box: {
          left: x - radius - GAP - width,
          top: y - radius - GAP - LABEL_HEIGHT,
          right: x - radius - GAP,
          bottom: y - radius - GAP,
        },
        dx: -(radius + GAP + 3),
        dy: -(radius + GAP + LABEL_HEIGHT / 2),
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
