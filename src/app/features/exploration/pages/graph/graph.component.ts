import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  type ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  buildKnowledgeNetwork,
  filterNetwork,
  layoutNetwork,
  linksOf,
  type NetworkEdge,
  networkKindDefinition,
  type NetworkKindId,
  networkKinds,
  type NetworkNode,
  type NetworkPoint,
  nodeRadius,
  nodeScaleFor,
  positionClaims,
  relationFamilies,
  relationFamilyDefinition,
  type RelationFamilyId,
  searchNodes,
} from '@core/content/queries/knowledge-network';
import { type LabelCandidate, placeLabels } from '@core/content/queries/network-labels';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { AtlasKindIconComponent } from '@shared/ui/kind-icon/kind-icon.component';

import { shapePath } from './graph-shapes';

interface View {
  x: number;
  y: number;
  k: number;
}

const reverseLabels: Record<RelationFamilyId, string> = {
  influenced: 'Foi influenciado por',
  participated: 'Teve a participação de',
  member: 'Teve como membro',
  founded: 'Foi fundado por',
  wrote: 'Foi escrito por',
  developed: 'Originou-se de',
  reacted: 'Foi alvo de reação de',
  succeeded: 'Foi sucedido por',
  governed: 'Foi governado por',
  occurred: 'Foi cenário de',
  associated: 'Associado a',
};

const classificationLabels: Record<string, string> = {
  'documented-fact': 'Fato documentado',
  'attributed-thesis': 'Tese atribuída',
  interpretation: 'Interpretação',
  hypothesis: 'Hipótese',
  inference: 'Inferência',
  'contested-claim': 'Afirmação contestada',
  unverified: 'Não verificado',
};

@Component({
  selector: 'app-graph',
  imports: [RouterLink, AtlasKindIconComponent],
  templateUrl: './graph.component.html',
  styleUrl: './graph.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'globalKey($event)' },
})
export class GraphComponent {
  private readonly repository = inject(ContentRepository);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly network = buildKnowledgeNetwork(this.repository.knowledgeGraph);
  private readonly nodeIndex = new Map(this.network.nodes.map((node) => [node.id, node]));

  readonly kinds = networkKinds;
  readonly families = relationFamilies;
  readonly collections = this.network.collections.filter((c) => c.count > 0);
  readonly shape = shapePath;
  readonly radius = nodeRadius;
  readonly world = signal({ width: 1600, height: 1000 });
  private readonly fitK = signal(1);

  readonly kindsOn = signal<ReadonlySet<NetworkKindId>>(new Set(networkKinds.map((k) => k.id)));
  readonly familiesOn = signal<ReadonlySet<RelationFamilyId>>(
    new Set(relationFamilies.map((f) => f.id)),
  );
  readonly collectionsOn = signal<ReadonlySet<string>>(new Set(this.collections.map((c) => c.id)));
  readonly onlyConnected = signal(false);
  readonly query = signal('');
  readonly selectedId = signal<string | null>(null);
  readonly hoveredId = signal<string | null>(null);
  readonly focusId = signal<string | null>(null);
  /** Explicit choice of the reader; until then the panel follows the screen size. */
  readonly controlsOpen = signal<boolean | null>(null);
  readonly wide = signal(false);
  readonly controlsShown = computed(() => this.controlsOpen() ?? this.wide());
  readonly shortcutsOpen = signal(false);
  readonly view = signal<View>({ x: 0, y: 0, k: 1 });
  readonly size = signal({ width: 0, height: 0 });
  readonly positions = signal<ReadonlyMap<string, NetworkPoint> | null>(null);
  readonly reducedMotion = signal(false);
  readonly dragging = signal(false);

  readonly total = this.network.nodes.length;
  readonly loading = computed(() => this.positions() === null && this.total > 0);
  readonly visible = computed(() =>
    filterNetwork(this.network, {
      kinds: this.kindsOn(),
      families: this.familiesOn(),
      collections: this.collectionsOn(),
      onlyConnected: this.onlyConnected(),
    }),
  );
  readonly visibleIds = computed(() => new Set(this.visible().nodes.map((node) => node.id)));
  readonly filtersActive = computed(
    () =>
      this.kindsOn().size < this.kinds.length ||
      this.familiesOn().size < this.families.length ||
      this.collectionsOn().size < this.collections.length ||
      this.onlyConnected(),
  );
  readonly matches = computed(() => searchNodes(this.visible().nodes, this.query()));
  readonly matchIds = computed(() => new Set(this.matches().map((node) => node.id)));
  readonly selected = computed(() => {
    const id = this.selectedId();
    return id ? (this.nodeIndex.get(id) ?? null) : null;
  });
  readonly selectedKind = computed(() => {
    const node = this.selected();
    return node ? networkKindDefinition(node.kind) : null;
  });
  readonly selectedLinks = computed(() => {
    const node = this.selected();
    return node ? linksOf(node.id, this.visible().edges, this.nodeIndex) : [];
  });
  readonly selectedClaims = computed(() => {
    const node = this.selected();
    return node ? positionClaims(node).slice(0, 3) : [];
  });
  /** The node whose surroundings are lit: the selected one, otherwise the one under the pointer. */
  readonly activeId = computed(() => this.selectedId() ?? this.hoveredId());
  readonly neighbours = computed(() => {
    const id = this.activeId();
    if (!id) return new Set<string>();
    return new Set(linksOf(id, this.visible().edges, this.nodeIndex).map((link) => link.other.id));
  });
  /** Free part of the stage, in pixels, between the floating panels. */
  readonly insets = computed(() => {
    const { width, height } = this.size();
    const rem = 16;
    const wide = this.wide();
    return {
      left: wide && this.controlsShown() ? 19 * rem + 32 : 12,
      right: wide && this.selected() ? 23 * rem + 32 : 12,
      top: wide ? 92 : 84,
      bottom: !wide && this.selected() ? Math.round(height * 0.5) : 64,
      width,
    };
  });
  readonly counts = computed(() => {
    const kinds = new Map<NetworkKindId, number>();
    for (const node of this.network.nodes) kinds.set(node.kind, (kinds.get(node.kind) ?? 0) + 1);
    const families = new Map<RelationFamilyId, number>();
    for (const edge of this.network.edges)
      families.set(edge.family, (families.get(edge.family) ?? 0) + 1);
    return { kinds, families };
  });

  readonly drawnNodes = computed(() => {
    const positions = this.positions();
    if (!positions) return [];
    return this.visible().nodes.flatMap((node) => {
      const point = positions.get(node.id);
      if (!point) return [];
      const kind = networkKindDefinition(node.kind);
      const r = nodeRadius(node.degree);
      return [{ node, kind, r, x: point.x, y: point.y, path: shapePath(kind.shape, r) }];
    });
  });
  readonly zoomK = computed(() => this.view().k);
  readonly drawnEdges = computed(() => {
    const positions = this.positions();
    if (!positions) return [];
    const scale = nodeScaleFor(this.zoomK());
    return this.visible().edges.flatMap((edge: NetworkEdge) => {
      const from = positions.get(edge.source);
      const to = positions.get(edge.target);
      const target = this.nodeIndex.get(edge.target);
      if (!from || !to || !target) return [];
      const family = relationFamilyDefinition(edge.family);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy) || 1;
      const pad = nodeRadius(target.degree) * scale + 3 / this.zoomK();
      return [
        {
          edge,
          family,
          x1: from.x,
          y1: from.y,
          x2: to.x - (dx / length) * pad,
          y2: to.y - (dy / length) * pad,
        },
      ];
    });
  });
  readonly transform = computed(() => {
    const { x, y, k } = this.view();
    return `translate(${x} ${y}) scale(${k})`;
  });
  /** Shapes keep a readable size on screen: larger when zoomed out, smaller when zoomed in. */
  readonly nodeScale = computed(() => Math.round(nodeScaleFor(this.zoomK()) * 100) / 100);
  /** Labels are placed in screen space so none covers another label or a node shape. */
  readonly labels = computed(() => {
    const nodes = this.drawnNodes();
    if (!nodes.length) return [];
    const k = this.zoomK();
    const scale = nodeScaleFor(k);
    const zoom = k / this.fitK();
    const forced = new Set<string>([
      ...this.neighbours(),
      ...this.matchIds(),
      ...[this.selectedId(), this.hoveredId(), this.focusId()].filter((id): id is string => !!id),
    ]);
    const ranked = [...nodes].sort((a, b) => b.node.degree - a.node.degree);
    const candidates: LabelCandidate[] = [];
    ranked.forEach((item, rank) => {
      const isForced = forced.has(item.node.id);
      candidates.push({
        id: item.node.id,
        text: item.node.title,
        x: item.x * k,
        y: item.y * k,
        radius: item.r * scale * k,
        priority: item.node.id === this.selectedId() ? -2 : isForced ? -1 : rank,
        forced: item.node.id === this.selectedId(),
      });
    });
    const obstacles = nodes.map((item) => ({
      id: item.node.id,
      x: item.x * k,
      y: item.y * k,
      radius: item.r * scale * k,
    }));
    const byId = new Map(nodes.map((item) => [item.node.id, item]));
    const { x: vx, y: vy } = this.view();
    const { width, height } = this.size();
    const inset = this.insets();
    const bounds = {
      left: inset.left - vx,
      top: inset.top - vy,
      right: width - inset.right - vx,
      bottom: height - inset.bottom - vy,
    };
    return placeLabels(candidates, obstacles, Math.round(10 + 14 * zoom), bounds).flatMap(
      (label) => {
        const item = byId.get(label.id);
        return item
          ? [{ ...label, wx: item.x * k, wy: item.y * k, dimmed: this.isDimmed(label.id) }]
          : [];
      },
    );
  });
  readonly zoomPercent = computed(() => Math.round((this.zoomK() / this.fitK()) * 100));
  readonly status = computed(() => {
    if (this.loading()) return 'Organizando o mapa…';
    const { nodes, edges } = this.visible();
    const selected = this.selected();
    return (
      `${nodes.length} de ${this.total} verbetes e ${edges.length} ligações no recorte.` +
      (selected ? ` Selecionado: ${selected.title}.` : '')
    );
  });

  private pointer: { id: number; x: number; y: number; origin: View; moved: boolean } | null = null;
  private suppressClick = false;
  private readonly touches = new Map<number, { x: number; y: number }>();
  private pinch: { distance: number; origin: View } | null = null;
  /** The view follows window resizes until the reader moves or zooms it. */
  private autoFit = true;

  constructor() {
    afterNextRender(() => {
      const element = this.stage()?.nativeElement;
      const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
      this.reducedMotion.set(media?.matches ?? false);
      const onMedia = (event: MediaQueryListEvent) => this.reducedMotion.set(event.matches);
      media?.addEventListener('change', onMedia);
      const wideMedia = window.matchMedia?.('(min-width: 62rem)');
      this.wide.set(wideMedia?.matches ?? false);
      const onWide = (event: MediaQueryListEvent) => {
        this.wide.set(event.matches);
        if (this.autoFit) this.fit();
      };
      wideMedia?.addEventListener('change', onWide);
      let fitted = false;
      const observer = new (globalThis.ResizeObserver ?? FallbackObserver)(() => {
        if (!element) return;
        this.size.set({ width: element.clientWidth, height: element.clientHeight });
        if (this.positions() && (!fitted || this.autoFit)) {
          fitted = true;
          this.fit();
        }
      });
      if (element) {
        observer.observe(element);
        this.size.set({ width: element.clientWidth, height: element.clientHeight });
      }
      // The layout runs after the first paint so the loading state is visible meanwhile.
      const timer = setTimeout(() => {
        const layout = layoutNetwork(this.network.nodes, this.network.edges);
        this.world.set({ width: layout.width, height: layout.height });
        this.positions.set(layout.positions);
        if (this.size().width && !fitted) {
          fitted = true;
          this.fit();
        }
      });
      this.destroyRef.onDestroy(() => {
        clearTimeout(timer);
        observer.disconnect();
        media?.removeEventListener('change', onMedia);
        wideMedia?.removeEventListener('change', onWide);
      });
    });
  }

  // ---- filters ----

  toggleKind(id: NetworkKindId): void {
    this.kindsOn.update((set) => toggled(set, id));
  }
  toggleFamily(id: RelationFamilyId): void {
    this.familiesOn.update((set) => toggled(set, id));
  }
  toggleCollection(id: string): void {
    this.collectionsOn.update((set) => toggled(set, id));
  }
  soloKind(id: NetworkKindId): void {
    this.kindsOn.set(new Set([id]));
  }
  resetFilters(): void {
    this.kindsOn.set(new Set(networkKinds.map((k) => k.id)));
    this.familiesOn.set(new Set(relationFamilies.map((f) => f.id)));
    this.collectionsOn.set(new Set(this.collections.map((c) => c.id)));
    this.onlyConnected.set(false);
    this.query.set('');
  }
  setQuery(value: string): void {
    this.query.set(value);
  }
  toggleControls(): void {
    this.controlsOpen.set(!this.controlsShown());
    if (this.autoFit) this.fit();
  }
  /** Shortcuts that work anywhere on the page, unless the reader is typing in a field. */
  globalKey(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable]')) return;
    const actions: Record<string, () => void> = {
      '/': () => this.stage()?.nativeElement.ownerDocument.getElementById('graph-search')?.focus(),
      '?': () => this.shortcutsOpen.update((open) => !open),
      l: () => this.toggleControls(),
      L: () => this.toggleControls(),
      o: () => this.openSelected(),
      O: () => this.openSelected(),
      '+': () => this.zoomBy(1.25),
      '=': () => this.zoomBy(1.25),
      '-': () => this.zoomBy(0.8),
      _: () => this.zoomBy(0.8),
      '0': () => this.fit(),
      Escape: () => {
        if (this.shortcutsOpen()) this.shortcutsOpen.set(false);
        else if (this.selectedId()) this.clearSelection();
        else if (this.controlsOpen() && !this.wide()) this.controlsOpen.set(false);
      },
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  }
  openSelected(): void {
    const node = this.selected();
    if (node) void this.router.navigate(['/verbete', node.slug]);
  }
  searchKey(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      const first = this.matches()[0];
      if (first) this.select(first.id);
      event.preventDefault();
    } else if (event.key === 'Escape') {
      this.query.set('');
    }
  }

  // ---- selection and focus ----

  select(id: string | null): void {
    this.selectedId.set(id);
    if (id) {
      this.focusId.set(id);
      this.center(id);
    }
  }
  clearSelection(): void {
    this.selectedId.set(null);
  }
  isDimmed(id: string): boolean {
    const active = this.activeId();
    if (active) return id !== active && !this.neighbours().has(id);
    const matches = this.matchIds();
    return this.query().trim() !== '' && !matches.has(id);
  }
  edgeDimmed(edge: NetworkEdge): boolean {
    const active = this.activeId();
    return !!active && edge.source !== active && edge.target !== active;
  }
  tabIndexFor(id: string): number {
    const roving = this.focusId() ?? this.drawnNodes()[0]?.node.id;
    return id === roving ? 0 : -1;
  }
  nodeLabel(node: NetworkNode): string {
    const kind = networkKindDefinition(node.kind).label;
    return `${node.title}, ${kind.toLowerCase()}, ${node.degree} ${node.degree === 1 ? 'ligação' : 'ligações'}`;
  }
  networkIcon(node: NetworkNode) {
    return networkKindDefinition(node.kind).icon;
  }
  kindLabel(node: NetworkNode): string {
    return networkKindDefinition(node.kind).label;
  }
  /** Reading of a link from the selected node's side: "Influenciou" or "Foi influenciado por". */
  linkVerb(edge: NetworkEdge): string {
    return relationFamilyDefinition(edge.family).label;
  }
  linkVerbReverse(edge: NetworkEdge): string {
    return reverseLabels[edge.family];
  }
  classificationLabel(value: string): string {
    return classificationLabels[value] ?? value;
  }

  nodeClick(id: string): void {
    if (this.suppressClick) return;
    this.select(id);
  }
  nodeKey(event: KeyboardEvent, id: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.select(id);
      return;
    }
    const direction = {
      ArrowRight: [1, 0],
      ArrowLeft: [-1, 0],
      ArrowDown: [0, 1],
      ArrowUp: [0, -1],
    }[event.key];
    if (!direction) return;
    event.preventDefault();
    event.stopPropagation();
    const next = this.nearestInDirection(id, direction[0], direction[1]);
    if (!next) return;
    this.focusId.set(next);
    this.reveal(next);
    queueMicrotask(() =>
      this.stage()
        ?.nativeElement.querySelector<SVGElement>(`[data-node="${CSS.escape(next)}"]`)
        ?.focus({ preventScroll: true }),
    );
  }

  // ---- view: zoom and pan ----

  fit(): void {
    const { width, height } = this.size();
    if (!width || !height) return;
    this.autoFit = true;
    const world = this.world();
    const inset = this.insets();
    const freeW = Math.max(120, width - inset.left - inset.right);
    const freeH = Math.max(120, height - inset.top - inset.bottom);
    const k = Math.min(freeW / world.width, freeH / world.height) * 0.98;
    this.fitK.set(k);
    this.view.set({
      k,
      x: inset.left + (freeW - world.width * k) / 2,
      y: inset.top + (freeH - world.height * k) / 2,
    });
  }
  zoomBy(factor: number, around?: { x: number; y: number }): void {
    this.autoFit = false;
    const { width, height } = this.size();
    const point = around ?? { x: width / 2, y: height / 2 };
    this.view.update(({ x, y, k }) => {
      const next = Math.min(this.fitK() * 12, Math.max(this.fitK() * 0.5, k * factor));
      const ratio = next / k;
      return { k: next, x: point.x - (point.x - x) * ratio, y: point.y - (point.y - y) * ratio };
    });
  }
  panBy(dx: number, dy: number): void {
    this.autoFit = false;
    this.view.update(({ x, y, k }) => ({ k, x: x + dx, y: y + dy }));
  }

  wheel(event: WheelEvent): void {
    event.preventDefault();
    const rect = this.stage()?.nativeElement.getBoundingClientRect();
    if (!rect) return;
    this.zoomBy(Math.exp(-event.deltaY * 0.0015), {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }
  pointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    this.suppressClick = false;
    this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.touches.size === 2) {
      const [a, b] = [...this.touches.values()];
      this.pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, origin: this.view() };
      this.pointer = null;
      this.dragging.set(true);
      return;
    }
    this.pointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      origin: this.view(),
      moved: false,
    };
  }
  pointerMove(event: PointerEvent): void {
    if (this.touches.has(event.pointerId))
      this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pinch && this.touches.size === 2) {
      const rect = this.stage()?.nativeElement.getBoundingClientRect();
      if (!rect) return;
      const [a, b] = [...this.touches.values()];
      const ratio = (Math.hypot(a.x - b.x, a.y - b.y) || 1) / this.pinch.distance;
      const { x, y, k } = this.pinch.origin;
      const next = Math.min(this.fitK() * 12, Math.max(this.fitK() * 0.5, k * ratio));
      const mid = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
      this.autoFit = false;
      this.view.set({
        k: next,
        x: mid.x - (mid.x - x) * (next / k),
        y: mid.y - (mid.y - y) * (next / k),
      });
      return;
    }
    const pointer = this.pointer;
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (!pointer.moved && Math.hypot(dx, dy) < 5) return;
    if (!pointer.moved) {
      pointer.moved = true;
      this.dragging.set(true);
      this.autoFit = false;
      (event.currentTarget as Element).setPointerCapture(event.pointerId);
    }
    this.view.set({ ...pointer.origin, x: pointer.origin.x + dx, y: pointer.origin.y + dy });
  }
  pointerUp(event: PointerEvent): void {
    this.touches.delete(event.pointerId);
    if (this.pinch) {
      if (this.touches.size < 2) {
        this.pinch = null;
        this.dragging.set(false);
        this.suppressClick = true;
        setTimeout(() => (this.suppressClick = false));
      }
      return;
    }
    const pointer = this.pointer;
    if (!pointer || pointer.id !== event.pointerId) return;
    if (pointer.moved) {
      this.suppressClick = true;
      // A drag ends with a click on whatever is under the pointer; let it pass first.
      setTimeout(() => (this.suppressClick = false));
    } else if ((event.target as Element).closest('[data-node]') === null) {
      this.clearSelection();
    }
    this.pointer = null;
    this.dragging.set(false);
  }
  canvasKey(event: KeyboardEvent): void {
    const step = event.shiftKey ? 240 : 60;
    const handlers: Record<string, () => void> = {
      ArrowLeft: () => this.panBy(step, 0),
      ArrowRight: () => this.panBy(-step, 0),
      ArrowUp: () => this.panBy(0, step),
      ArrowDown: () => this.panBy(0, -step),
    };
    const handler = handlers[event.key];
    if (!handler) return;
    event.preventDefault();
    handler();
  }
  canvasDoubleClick(event: MouseEvent): void {
    const node = (event.target as Element).closest('[data-node]');
    const rect = this.stage()?.nativeElement.getBoundingClientRect();
    if (node) {
      const slug = this.nodeIndex.get(node.getAttribute('data-node') ?? '')?.slug;
      if (slug) void this.router.navigate(['/verbete', slug]);
    } else if (rect) {
      this.zoomBy(1.7, { x: event.clientX - rect.left, y: event.clientY - rect.top });
    }
  }

  private nearestInDirection(id: string, dx: number, dy: number): string | null {
    const origin = this.positions()?.get(id);
    if (!origin) return null;
    let best: string | null = null;
    let bestScore = Infinity;
    for (const { node, x, y } of this.drawnNodes()) {
      if (node.id === id) continue;
      const vx = x - origin.x;
      const vy = y - origin.y;
      const along = vx * dx + vy * dy;
      if (along <= 0) continue;
      const across = Math.abs(vx * dy - vy * dx);
      const score = along + across * 2;
      if (score < bestScore) {
        bestScore = score;
        best = node.id;
      }
    }
    return best;
  }

  private center(id: string): void {
    const point = this.positions()?.get(id);
    const { width, height } = this.size();
    if (!point || !width) return;
    this.autoFit = false;
    const k = Math.max(this.view().k, this.fitK() * 3.5);
    // The detail panel opens on the right: aim at the middle of what stays free.
    const inset = this.insets();
    const right = this.wide() ? 23 * 16 + 32 : inset.right;
    const cx = inset.left + (width - inset.left - right) / 2;
    const cy = inset.top + (height - inset.top - inset.bottom) / 2;
    this.view.set({ k, x: cx - point.x * k, y: cy - point.y * k });
  }

  private reveal(id: string): void {
    const point = this.positions()?.get(id);
    const { width, height } = this.size();
    if (!point || !width) return;
    const { x, y, k } = this.view();
    const sx = point.x * k + x;
    const sy = point.y * k + y;
    const margin = 60;
    let dx = 0;
    let dy = 0;
    if (sx < margin) dx = margin - sx;
    else if (sx > width - margin) dx = width - margin - sx;
    if (sy < margin) dy = margin - sy;
    else if (sy > height - margin) dy = height - margin - sy;
    if (dx || dy) this.panBy(dx, dy);
  }
}

/** Environments without ResizeObserver keep the size measured at start. */
class FallbackObserver {
  observe(): void {
    /* no resize notifications available */
  }
  disconnect(): void {
    /* nothing to release */
  }
}

function toggled<T>(set: ReadonlySet<T>, value: T): ReadonlySet<T> {
  const next = new Set(set);
  if (!next.delete(value)) next.add(value);
  return next;
}
