import { Component, computed, input, output, signal } from '@angular/core';
import { AtlasGeometricMosaicComponent } from '@shared/ui/geometric-mosaic/geometric-mosaic.component';

/** Destination previewed by the poster: each door draws its own figure over the mosaic. */
export type PosterLoomMode = 'acervo' | 'grafo' | 'mapa' | 'itinerarios';

interface Point {
  readonly x: number;
  readonly y: number;
}

const COLUMNS = 4;
const ROWS = 5;
const CELL = 100;
const centre = (column: number, row: number): Point => ({
  x: column * CELL + CELL / 2,
  y: row * CELL + CELL / 2,
});
const CENTRES: readonly Point[] = Array.from({ length: COLUMNS * ROWS }, (_, index) =>
  centre(index % COLUMNS, Math.floor(index / COLUMNS)),
);

/** Network preview: nodes on tile centres, edges between them. */
const GRAPH_NODES: readonly Point[] = [
  centre(0, 0),
  centre(3, 0),
  centre(2, 1),
  centre(1, 2),
  centre(3, 2),
  centre(0, 3),
  centre(2, 4),
];
const GRAPH_EDGES: readonly (readonly [number, number])[] = [
  [0, 2],
  [1, 2],
  [2, 3],
  [2, 4],
  [3, 5],
  [3, 6],
  [4, 6],
  [0, 3],
];

/** Itinerary preview: a path that stops on tiles. */
const ROUTE: readonly Point[] = [
  centre(0, 4),
  centre(0, 2),
  centre(1, 1),
  centre(2, 2),
  centre(3, 1),
  centre(3, 0),
];

/**
 * Hero poster: the seeded mosaic plus a drawing layer. Hovering or focusing a door draws
 * that destination's figure (index cards, network, globe, route); the pointer pulls threads
 * to the nearest tiles. Nothing moves on its own; reduced motion shows figures instantly.
 */
@Component({
  selector: 'app-poster-loom',
  imports: [AtlasGeometricMosaicComponent],
  templateUrl: './poster-loom.component.html',
  styleUrl: './poster-loom.component.scss',
  host: { '[attr.data-mode]': 'mode() ?? null' },
})
export class PosterLoomComponent {
  readonly seed = input(7);
  readonly mode = input<PosterLoomMode | null>(null);
  readonly recompose = output<void>();

  readonly viewBox = `0 0 ${COLUMNS * CELL} ${ROWS * CELL}`;
  readonly graphNodes = GRAPH_NODES;
  readonly graphEdges = GRAPH_EDGES.map(([a, b]) => ({ a: GRAPH_NODES[a], b: GRAPH_NODES[b] }));
  readonly route = ROUTE;
  readonly routePath = ROUTE.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  readonly cards = [0, 1, 2, 3];

  readonly pointer = signal<Point | null>(null);
  /** Threads from the pointer to the three nearest tile centres. */
  readonly threads = computed(() => {
    const at = this.pointer();
    if (!at || this.mode()) return [];
    return [...CENTRES]
      .map((point) => ({ point, distance: Math.hypot(point.x - at.x, point.y - at.y) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map(({ point }) => point);
  });

  private frame = 0;

  onPointerMove(event: PointerEvent, stage: HTMLElement): void {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    const { clientX, clientY } = event;
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      const box = stage.getBoundingClientRect();
      // The SVG uses `slice`, so map through the covering scale and its centred offset.
      const scale = Math.max(box.width / (COLUMNS * CELL), box.height / (ROWS * CELL));
      const offsetX = (box.width - COLUMNS * CELL * scale) / 2;
      const offsetY = (box.height - ROWS * CELL * scale) / 2;
      this.pointer.set({
        x: (clientX - box.left - offsetX) / scale,
        y: (clientY - box.top - offsetY) / scale,
      });
    });
  }

  onPointerLeave(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.pointer.set(null);
  }
}
