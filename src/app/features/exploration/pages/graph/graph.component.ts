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
  relationNatureDefinition,
  searchNodes,
  shortestPath,
} from '@core/content/queries/knowledge-network';
import {
  LABEL_HEIGHT,
  type LabelCandidate,
  labelWidth,
  placeLabels,
} from '@core/content/queries/network-labels';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { AtlasKindIconComponent } from '@shared/ui/kind-icon/kind-icon.component';

import { shapePath } from './graph-shapes';

interface View {
  x: number;
  y: number;
  k: number;
}

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
  private readonly edgeIndex = new Map(this.network.edges.map((edge) => [edge.id, edge]));

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
  /** True while the view glides to a new place; labels wait until it settles. */
  readonly animating = signal(false);
  /** Edge under the pointer or focused in the detail list. */
  readonly hoveredEdgeId = signal<string | null>(null);
  /** Pointer position inside the stage, for the hover card. */
  readonly pointerAt = signal<{ x: number; y: number } | null>(null);
  /** Start of a path between two nodes; the end is the selected node. */
  readonly pathFromId = signal<string | null>(null);

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
  /** The node whose surroundings are lit: the one under the pointer, otherwise the selected one. */
  readonly activeId = computed(() => this.hoveredId() ?? this.selectedId());
  readonly activeLinks = computed(() => {
    const id = this.activeId();
    return id ? linksOf(id, this.visible().edges, this.nodeIndex) : [];
  });
  readonly neighbours = computed(() => new Set(this.activeLinks().map((link) => link.other.id)));
  readonly pathFrom = computed(() => {
    const id = this.pathFromId();
    return id ? (this.nodeIndex.get(id) ?? null) : null;
  });
  /** Steps from the path origin to the selected node; null when they are not connected. */
  readonly path = computed(() => {
    const from = this.pathFromId();
    const to = this.selectedId();
    if (!from || !to || from === to) return undefined;
    return shortestPath(from, to, this.visible().edges);
  });
  readonly pathSteps = computed(() =>
    (this.path() ?? []).map((step) => ({
      ...step,
      fromNode: this.nodeIndex.get(step.from)!,
      toNode: this.nodeIndex.get(step.to)!,
      nature: relationNatureDefinition(step.edge.nature),
      forward: step.edge.source === step.from,
    })),
  );
  private readonly pathEdgeIds = computed(
    () => new Set((this.path() ?? []).map((step) => step.edge.id)),
  );
  /** Nodes that stay lit: the path, or the active node with its neighbours; null when all are. */
  private readonly litNodes = computed<ReadonlySet<string> | null>(() => {
    const path = this.path();
    if (path?.length) return new Set(path.flatMap((step) => [step.from, step.to]));
    const active = this.activeId();
    return active ? new Set([active, ...this.neighbours()]) : null;
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
      return [
        {
          node,
          kind,
          r,
          x: point.x,
          y: point.y,
          path: shapePath(kind.shape, r),
          drift: driftOf(node.id),
        },
      ];
    });
  });
  readonly zoomK = computed(() => this.view().k);
  /** How much the nodes float: nothing zoomed out, where sub-pixel motion only shimmers. */
  readonly sway = computed(() => {
    const zoom = this.zoomK() / this.fitK();
    return Math.round(Math.min(1, Math.max(0, (zoom - 1.1) / 1.4)) * 20) / 20;
  });
  /** Close enough to read what each link says; farther away the lines alone are shown. */
  readonly near = computed(() => this.zoomK() / this.fitK() >= EDGE_LABEL_ZOOM);
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
          delay: (hash(edge.id) % 10) * 28,
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
  /**
   * Labels are placed in screen space so none covers another label or a node shape. Zoomed out
   * only the best connected nodes are named; each zoom step names more. While a node is lit,
   * only that node and its neighbours keep their names.
   */
  readonly labels = computed(() => {
    const nodes = this.drawnNodes();
    if (!nodes.length) return [];
    const k = this.zoomK();
    const scale = nodeScaleFor(k);
    const zoom = k / this.fitK();
    const lit = this.litNodes();
    const selectedId = this.selectedId();
    const activeId = this.activeId();
    const forced = new Set<string>([
      ...this.matchIds(),
      ...[selectedId, this.hoveredId(), this.focusId()].filter((id): id is string => !!id),
    ]);
    const minDegree = zoom < 1.6 ? 2 : zoom < 3.2 ? 1 : 0;
    const ranked = [...nodes].sort((a, b) => b.node.degree - a.node.degree);
    const candidates: LabelCandidate[] = [];
    ranked.forEach((item, rank) => {
      const id = item.node.id;
      if (lit && !lit.has(id)) return;
      const important = lit !== null || forced.has(id);
      if (!important && item.node.degree < minDegree) return;
      candidates.push({
        id,
        text: important ? item.node.title : shorten(item.node.title),
        x: item.x * k,
        y: item.y * k,
        radius: item.r * scale * k,
        priority: id === activeId ? -2 : important ? -1 : rank,
        forced: id === activeId || id === selectedId,
      });
    });
    const obstacles = nodes
      .filter((item) => !lit || lit.has(item.node.id))
      .map((item) => ({
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
    const limit = lit ? Infinity : Math.round(16 + 30 * zoom);
    const neighbours = this.neighbours();
    return placeLabels(candidates, obstacles, limit, bounds).flatMap((label, order) => {
      const item = byId.get(label.id);
      return item
        ? [
            {
              ...label,
              wx: item.x * k,
              wy: item.y * k,
              neighbour: neighbours.has(label.id),
              delay: Math.min(order, 14) * 24,
            },
          ]
        : [];
    });
  });
  /** Short phrases on the links of the lit node, placed at the middle of each link. */
  readonly edgeLabels = computed(() => {
    const active = this.activeId();
    const positions = this.positions();
    if (!active || !positions) return [];
    // Zoomed out the lines speak for themselves; the wording appears when the reader comes close.
    if (!this.near()) return [];
    const k = this.zoomK();
    const { x: vx, y: vy } = this.view();
    const taken = this.labels().map((label) => {
      const width = labelWidth(label.text);
      const x = vx + label.wx + label.dx;
      const y = vy + label.wy + label.dy;
      const left =
        label.anchor === 'start' ? x : label.anchor === 'end' ? x - width : x - width / 2;
      return { left, right: left + width, top: y - LABEL_HEIGHT / 2, bottom: y + LABEL_HEIGHT / 2 };
    });
    const placed: { id: string; text: string; x: number; y: number; delay: number }[] = [];
    for (const link of this.activeLinks().slice(0, 18)) {
      const from = positions.get(link.edge.source);
      const to = positions.get(link.edge.target);
      if (!from || !to) continue;
      const text = this.linkVerb(link);
      const x = ((from.x + to.x) / 2) * k + vx;
      const y = ((from.y + to.y) / 2) * k + vy;
      const width = labelWidth(text);
      const box = { left: x - width / 2, right: x + width / 2, top: y - 8, bottom: y + 8 };
      const clash = taken.some(
        (other) =>
          box.left < other.right &&
          box.right > other.left &&
          box.top < other.bottom &&
          box.bottom > other.top,
      );
      if (clash) continue;
      taken.push(box);
      placed.push({ id: link.edge.id, text, x, y, delay: 120 + placed.length * 30 });
    }
    return placed;
  });
  /** Overview of the whole map with the part on screen outlined. */
  readonly minimap = computed(() => {
    const world = this.world();
    if (!this.positions() || !world.width) return null;
    const width = 168;
    const height = Math.round(Math.max(60, Math.min(120, (width * world.height) / world.width)));
    const scale = Math.min(width / world.width, height / world.height);
    const { x, y, k } = this.view();
    const { width: sw, height: sh } = this.size();
    return {
      width,
      height,
      scale,
      dots: this.drawnNodes().map((item) => ({
        id: item.node.id,
        x: item.x * scale,
        y: item.y * scale,
        color: item.kind.color,
      })),
      box: { x: (-x / k) * scale, y: (-y / k) * scale, w: (sw / k) * scale, h: (sh / k) * scale },
    };
  });
  /** Card that follows the pointer: the node, or the link, under it. */
  readonly hoverCard = computed(() => {
    const at = this.pointerAt();
    if (!at || this.dragging()) return null;
    const { width, height } = this.size();
    const left = at.x > width - 340 ? at.x - 320 : at.x + 16;
    const top = Math.max(8, Math.min(at.y + 16, height - 200));
    const hoveredId = this.hoveredId();
    const edgeId = this.hoveredEdgeId();
    if (edgeId && !hoveredId && this.near()) {
      const edge = this.edgeIndex.get(edgeId);
      const source = edge && this.nodeIndex.get(edge.source);
      const target = edge && this.nodeIndex.get(edge.target);
      if (edge && source && target)
        return { left, top, relation: this.describeEdge(edge, source, target), node: null };
    }
    const node = hoveredId ? this.nodeIndex.get(hoveredId) : null;
    if (!node) return null;
    const links = this.activeLinks();
    return {
      left,
      top,
      relation: null,
      node: {
        title: node.title,
        kind: this.kindLabel(node),
        total: links.length,
        top: (this.near() ? links : [])
          .slice(0, 3)
          .map((link) => ({ verb: this.linkVerb(link), name: link.other.title })),
      },
    };
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
  private tweenToken = 0;
  private allK = 0.1;
  private cycleOrigin: string | null = null;

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
        // A hidden or collapsed stage reports no size; keep the last real one.
        if (!element?.clientWidth || !element.clientHeight) return;
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
      '+': () => this.zoomStep(1.25),
      '=': () => this.zoomStep(1.25),
      '-': () => this.zoomStep(0.8),
      _: () => this.zoomStep(0.8),
      '0': () => this.fit(true),
      Home: () => this.fit(true),
      c: () => this.togglePathStart(),
      C: () => this.togglePathStart(),
      Escape: () => {
        if (this.shortcutsOpen()) this.shortcutsOpen.set(false);
        else if (this.pathFromId()) this.pathFromId.set(null);
        else if (this.selectedId()) this.clearSelection();
        else if (this.controlsOpen() && !this.wide()) this.controlsOpen.set(false);
      },
    };
    // Letter shortcuts stay out of the way of links, buttons and menus, which keep their own keys.
    if (/^[a-z]$/i.test(event.key) && target?.closest('a, button, summary, [role="menuitem"]'))
      return;
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
    } else if (event.key === 'ArrowDown' && this.matches().length) {
      event.preventDefault();
      this.searchResult(event, 'first');
    }
  }
  /** Arrow keys walk through the search results; Escape returns to the field. */
  resultKey(event: KeyboardEvent): void {
    const key = event.key;
    if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    this.searchResult(
      event,
      key === 'ArrowDown' ? 'next' : key === 'ArrowUp' ? 'previous' : 'field',
    );
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
    const lit = this.litNodes();
    if (lit) return !lit.has(id);
    return this.query().trim() !== '' && !this.matchIds().has(id);
  }
  edgeDimmed(edge: NetworkEdge): boolean {
    const path = this.path();
    if (path?.length) return !this.pathEdgeIds().has(edge.id);
    const active = this.activeId();
    return !!active && edge.source !== active && edge.target !== active;
  }
  /**
   * Colour, dash and arrowhead tell the kind of link. Far away every link is the same plain line;
   * up close, or on the links of the selected node and of a path, the kind shows.
   */
  edgeDetailed(edge: NetworkEdge): boolean {
    if (this.near()) return true;
    const selected = this.selectedId();
    return (
      this.pathEdgeIds().has(edge.id) ||
      (!!selected && (edge.source === selected || edge.target === selected))
    );
  }
  edgeLit(edge: NetworkEdge): boolean {
    const active = this.activeId();
    return (
      this.pathEdgeIds().has(edge.id) ||
      edge.id === this.hoveredEdgeId() ||
      (!!active && (edge.source === active || edge.target === active))
    );
  }
  /** Invisible click target around an icon: never under 16 px on screen, whatever the zoom. */
  hitRadius(radius: number): number {
    const scale = this.nodeScale();
    return Math.max(radius * scale + 6 / this.zoomK(), 16 / this.zoomK());
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
  /** Reading of a link from the lit node's side: "influenciou" or "foi influenciado por". */
  linkVerb(link: { edge: NetworkEdge; outgoing: boolean }): string {
    return link.outgoing ? link.edge.phrase : link.edge.phraseReverse;
  }
  natureOf(edge: NetworkEdge) {
    return relationNatureDefinition(edge.nature);
  }
  /** Why the link exists, in a sentence the reader can check against the source. */
  reasonOf(edge: NetworkEdge): string {
    const nature = relationNatureDefinition(edge.nature);
    return edge.nature === 'stated' || edge.nature === 'editorial' ? edge.context : nature.note;
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
    if (event.key === ']' || event.key === '[') {
      event.preventDefault();
      event.stopPropagation();
      this.cycleNeighbour(id, event.key === ']' ? 1 : -1);
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
    this.focusNode(next);
  }

  // ---- relations: hover, path and neighbours ----

  hoverNode(id: string | null): void {
    this.hoveredId.set(id);
  }
  hoverEdge(id: string | null): void {
    this.hoveredEdgeId.set(id);
  }
  stagePointer(event: PointerEvent): void {
    if (event.pointerType === 'touch') return;
    const rect = this.stage()?.nativeElement.getBoundingClientRect();
    if (rect) this.pointerAt.set({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  }
  stageLeave(): void {
    this.pointerAt.set(null);
    this.hoveredId.set(null);
    this.hoveredEdgeId.set(null);
  }
  togglePathStart(): void {
    const id = this.selectedId();
    if (this.pathFromId()) this.pathFromId.set(null);
    else if (id) this.pathFromId.set(id);
  }
  clearPath(): void {
    this.pathFromId.set(null);
  }
  /** Moves selection or focus to the next (or previous) neighbour of a node. */
  cycleNeighbour(id: string, step: 1 | -1): void {
    const edges = this.visible().edges;
    let origin = this.cycleOrigin;
    if (
      !origin ||
      (id !== origin && !linksOf(origin, edges, this.nodeIndex).some((l) => l.other.id === id))
    )
      origin = id;
    this.cycleOrigin = origin;
    const links = linksOf(origin, edges, this.nodeIndex);
    if (!links.length) return;
    const at = links.findIndex((link) => link.other.id === id);
    const index =
      at === -1 ? (step > 0 ? 0 : links.length - 1) : (at + step + links.length) % links.length;
    const next = links[index].other.id;
    this.focusId.set(next);
    this.reveal(next);
    this.focusNode(next);
  }
  /** Click or key on the overview: centres the view on that spot. */
  minimapJump(event: MouseEvent): void {
    const map = this.minimap();
    if (!map) return;
    const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
    const wx = (event.clientX - rect.left) / map.scale;
    const wy = (event.clientY - rect.top) / map.scale;
    const { width, height } = this.size();
    const { k } = this.view();
    this.autoFit = false;
    this.glideTo({ k, x: width / 2 - wx * k, y: height / 2 - wy * k }, true);
  }

  // ---- view: zoom and pan ----

  fit(animate = false): void {
    const { width, height } = this.size();
    if (!width || !height) return;
    this.autoFit = true;
    const world = this.world();
    const inset = this.insets();
    const freeW = Math.max(120, width - inset.left - inset.right);
    const freeH = Math.max(120, height - inset.top - inset.bottom);
    const allK = Math.min(freeW / world.width, freeH / world.height) * 0.98;
    this.allK = allK;
    // The linked core fills the view; the ring of unlinked entries stays one zoom-out away.
    const positions = this.positions();
    const core = this.drawnNodes().filter((item) => item.node.degree > 0);
    const box =
      core.length >= 3 && positions
        ? core.reduce(
            (acc, item) => ({
              minX: Math.min(acc.minX, item.x - item.r * 2),
              maxX: Math.max(acc.maxX, item.x + item.r * 2),
              minY: Math.min(acc.minY, item.y - item.r * 2),
              maxY: Math.max(acc.maxY, item.y + item.r * 2),
            }),
            { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
          )
        : { minX: 0, maxX: world.width, minY: 0, maxY: world.height };
    const bw = Math.max(1, box.maxX - box.minX + 160);
    const bh = Math.max(1, box.maxY - box.minY + 120);
    const k = Math.max(allK, Math.min(freeW / bw, freeH / bh) * 0.98);
    this.fitK.set(k);
    this.glideTo(
      {
        k,
        x: inset.left + freeW / 2 - ((box.minX + box.maxX) / 2) * k,
        y: inset.top + freeH / 2 - ((box.minY + box.maxY) / 2) * k,
      },
      animate,
    );
  }
  zoomStep(factor: number): void {
    const { width, height } = this.size();
    const { x, y, k } = this.view();
    const next = Math.min(this.fitK() * 12, Math.max(this.minK(), k * factor));
    const ratio = next / k;
    this.autoFit = false;
    this.glideTo(
      { k: next, x: width / 2 - (width / 2 - x) * ratio, y: height / 2 - (height / 2 - y) * ratio },
      true,
    );
  }
  zoomBy(factor: number, around?: { x: number; y: number }): void {
    this.stopGlide();
    this.autoFit = false;
    const { width, height } = this.size();
    const point = around ?? { x: width / 2, y: height / 2 };
    this.view.update(({ x, y, k }) => {
      const next = Math.min(this.fitK() * 12, Math.max(this.minK(), k * factor));
      const ratio = next / k;
      return { k: next, x: point.x - (point.x - x) * ratio, y: point.y - (point.y - y) * ratio };
    });
  }
  panBy(dx: number, dy: number): void {
    this.stopGlide();
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
    this.stopGlide();
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
      const next = Math.min(this.fitK() * 12, Math.max(this.minK(), k * ratio));
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
    } else if ((event.target as Element).closest('[data-node], [data-hit]') === null) {
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
    const node = (event.target as Element).closest('[data-node], [data-hit]');
    const rect = this.stage()?.nativeElement.getBoundingClientRect();
    if (node) {
      const slug = this.nodeIndex.get(
        node.getAttribute('data-node') ?? node.getAttribute('data-hit') ?? '',
      )?.slug;
      if (slug) void this.router.navigate(['/verbete', slug]);
    } else if (rect) {
      this.zoomBy(1.7, { x: event.clientX - rect.left, y: event.clientY - rect.top });
    }
  }

  private searchResult(event: Event, move: 'first' | 'next' | 'previous' | 'field'): void {
    const form = (event.target as HTMLElement).closest('form');
    const buttons = [
      ...(form?.querySelectorAll<HTMLButtonElement>('.search__results button') ?? []),
    ];
    const input = form?.querySelector<HTMLInputElement>('input');
    const at = buttons.indexOf(event.target as HTMLButtonElement);
    if (move === 'first') buttons[0]?.focus();
    else if (move === 'next') buttons[Math.min(at + 1, buttons.length - 1)]?.focus();
    else if (move === 'previous') (at <= 0 ? input : buttons[at - 1])?.focus();
    else input?.focus();
  }

  private describeEdge(edge: NetworkEdge, source: NetworkNode, target: NetworkNode) {
    return {
      sentence: `${source.title} ${edge.phrase} ${target.title}`,
      nature: relationNatureDefinition(edge.nature),
      reason: this.reasonOf(edge),
      source: edge.sourceName,
    };
  }
  private minK(): number {
    return Math.min(this.allK * 0.9, this.fitK() * 0.5);
  }
  /** Moves the view; with animation it glides, unless the reader asked for reduced motion. */
  private glideTo(target: View, animate: boolean): void {
    const token = ++this.tweenToken;
    if (!animate || this.reducedMotion() || typeof requestAnimationFrame === 'undefined') {
      this.animating.set(false);
      this.view.set(target);
      return;
    }
    const from = this.view();
    const start = performance.now();
    const duration = 520;
    this.animating.set(true);
    const step = () => {
      if (token !== this.tweenToken) return;
      const t = Math.max(0, Math.min(1, (performance.now() - start) / duration));
      const e = easeInOut(t);
      this.view.set({
        k: from.k * (target.k / from.k) ** e,
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
      });
      if (t < 1) requestAnimationFrame(step);
      else {
        this.view.set(target);
        this.animating.set(false);
      }
    };
    requestAnimationFrame(step);
  }
  private stopGlide(): void {
    this.tweenToken++;
    this.animating.set(false);
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
    // The node and its neighbours frame the view, within a readable range of zoom.
    const positions = this.positions();
    const near = linksOf(id, this.visible().edges, this.nodeIndex)
      .map((link) => positions?.get(link.other.id))
      .filter((p): p is NetworkPoint => !!p);
    const xs = [point.x, ...near.map((p) => p.x)];
    const ys = [point.y, ...near.map((p) => p.y)];
    const box = {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
    // The detail panel opens on the right: aim at the middle of what stays free.
    const inset = this.insets();
    const right = this.wide() ? 23 * 16 + 32 : inset.right;
    const freeW = Math.max(120, width - inset.left - right);
    const freeH = Math.max(120, height - inset.top - inset.bottom);
    const fitted = Math.min(
      freeW / (box.maxX - box.minX + 220),
      freeH / (box.maxY - box.minY + 180),
    );
    const k = Math.min(this.fitK() * 4.5, Math.max(this.fitK() * 2, fitted));
    const cx = inset.left + freeW / 2;
    const cy = inset.top + freeH / 2;
    // Neighbours too far apart to frame together: stay on the node itself.
    const spread = fitted < this.fitK() * 2;
    const mx = spread ? point.x : (box.minX + box.maxX) / 2;
    const my = spread ? point.y : (box.minY + box.maxY) / 2;
    this.glideTo({ k, x: cx - mx * k, y: cy - my * k }, true);
  }

  private focusNode(id: string): void {
    queueMicrotask(() =>
      [...(this.stage()?.nativeElement.querySelectorAll<SVGElement>('[data-node]') ?? [])]
        .find((el) => el.getAttribute('data-node') === id)
        ?.focus({ preventScroll: true }),
    );
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

/** Zoom, relative to the first view, from which links show their wording. */
const EDGE_LABEL_ZOOM = 1.8;

function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}

/** Small, stable wander of a node: a few pixels, each node on its own rhythm. */
function driftOf(id: string): {
  ax: number;
  ay: number;
  durationX: number;
  durationY: number;
  delay: number;
} {
  const h = hash(id);
  const unit = (shift: number) => ((h >>> shift) & 255) / 255;
  return {
    ax: Math.round((2.6 + unit(0) * 2.4) * 10) / 10,
    ay: Math.round((2.6 + unit(8) * 2.4) * 10) / 10,
    durationX: Math.round(13 + unit(16) * 8),
    durationY: Math.round(17 + unit(24) * 9),
    delay: -Math.round(unit(12) * 30),
  };
}

/** Long titles are cut in the crowded view; the full name shows when the node is lit. */
function shorten(title: string, limit = 28): string {
  return title.length <= limit ? title : `${title.slice(0, limit - 1).trimEnd()}…`;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
