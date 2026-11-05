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
    const free = options.find(
      (option) =>
        (!bounds || insideBounds(option.box, bounds)) &&
        !taken.some((box) => boxesOverlap(option.box, box)) &&
        !obstacles.some((node) => node.id !== candidate.id && hitsCircle(option.box, node)),
    );
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
