import type { NetworkShape } from '@core/content/queries/knowledge-network';

const round = (value: number) => Math.round(value * 100) / 100;

function polygon(points: readonly (readonly [number, number])[]): string {
  return points.map(([x, y], i) => `${i ? 'L' : 'M'}${round(x)} ${round(y)}`).join('') + 'Z';
}

function circle(r: number): string {
  return `M${-r} 0a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
}

/** SVG path of a node shape centred on the origin; `r` is the nominal radius. */
export function shapePath(shape: NetworkShape, r: number): string {
  switch (shape) {
    case 'circle':
      return circle(r);
    case 'ring':
      return circle(r) + circle(r * 0.42);
    case 'hexagon':
      return polygon(
        [0, 1, 2, 3, 4, 5].map((i) => {
          const angle = (Math.PI / 3) * i + Math.PI / 6;
          return [Math.cos(angle) * r * 1.1, Math.sin(angle) * r * 1.1] as const;
        }),
      );
    case 'square':
      return polygon([
        [-r * 0.9, -r * 0.9],
        [r * 0.9, -r * 0.9],
        [r * 0.9, r * 0.9],
        [-r * 0.9, r * 0.9],
      ]);
    case 'triangle':
      return polygon([
        [0, -r * 1.15],
        [r * 1.1, r * 0.85],
        [-r * 1.1, r * 0.85],
      ]);
    case 'bar':
      return polygon([
        [-r * 1.4, -r * 0.7],
        [r * 1.4, -r * 0.7],
        [r * 1.4, r * 0.7],
        [-r * 1.4, r * 0.7],
      ]);
    case 'pin':
      return polygon([
        [-r, -r * 0.8],
        [r, -r * 0.8],
        [r, r * 0.2],
        [0, r * 1.25],
        [-r, r * 0.2],
      ]);
    case 'shield':
      return polygon([
        [-r * 0.9, -r * 0.95],
        [r * 0.9, -r * 0.95],
        [r * 0.9, r * 0.1],
        [0, r * 1.2],
        [-r * 0.9, r * 0.1],
      ]);
    case 'cross':
      return polygon([
        [-r * 0.34, -r],
        [r * 0.34, -r],
        [r * 0.34, -r * 0.34],
        [r, -r * 0.34],
        [r, r * 0.34],
        [r * 0.34, r * 0.34],
        [r * 0.34, r],
        [-r * 0.34, r],
        [-r * 0.34, r * 0.34],
        [-r, r * 0.34],
        [-r, -r * 0.34],
        [-r * 0.34, -r * 0.34],
      ]);
    case 'diamond':
      return polygon([
        [0, -r * 1.25],
        [r * 1.25, 0],
        [0, r * 1.25],
        [-r * 1.25, 0],
      ]);
  }
}
