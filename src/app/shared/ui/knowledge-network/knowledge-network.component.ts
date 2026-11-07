import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { entityMedia } from '@core/content/media/asset-license';
import { ContentMediaPipe } from '@core/content/media/content-media.pipe';
import {
  buildKnowledgeNetwork,
  filterNetwork,
  labelRelevance,
  layoutNetwork,
  linksOf,
  type NetworkEdge,
  networkKindDefinition,
  networkKindGroups,
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
} from '@core/content/queries/knowledge-network';
import {
  LABEL_HEIGHT,
  labelBudget,
  type LabelCandidate,
  labelTextLimit,
  type LabelTier,
  labelWidth,
  type PlacedLabel,
  placeLabels,
  shortenLabel,
  spreadCandidates,
  stableLabelTier,
} from '@core/content/queries/network-labels';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { AtlasGeometricIllustrationComponent } from '@shared/ui/geometric-illustration/geometric-illustration.component';
import { illustrationPalette } from '@shared/ui/geometric-illustration/illustration';
import { AtlasKindIconComponent } from '@shared/ui/kind-icon/kind-icon.component';

import { batchDots, batchEdgeSegments, type EdgeSegment } from './network-batching';
import { shapePath } from './network-shapes';

interface LabelView extends PlacedLabel {
  wx: number;
  wy: number;
  neighbour: boolean;
  delay: number;
}

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

interface DrawnEdge {
  edge: NetworkEdge;
  family: ReturnType<typeof relationFamilyDefinition>;
  delay: number;
  fade: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

@Component({
  selector: 'app-knowledge-network',
  imports: [
    RouterLink,
    AtlasKindIconComponent,
    AtlasGeometricIllustrationComponent,
    ContentMediaPipe,
  ],
  templateUrl: './knowledge-network.component.html',
  styleUrl: './knowledge-network.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'globalKey($event)',
    '[class.is-embedded]': 'embedded()',
  },
})
export class KnowledgeNetworkComponent {
  private readonly repository = inject(ContentRepository);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly network = buildKnowledgeNetwork(this.repository.knowledgeGraph);
  private readonly nodeIndex = new Map(this.network.nodes.map((node) => [node.id, node]));
  private readonly edgeIndex = new Map(this.network.edges.map((edge) => [edge.id, edge]));

  /** In a chapter, the graph keeps its own toolbar but gives up the page chrome and detail panel. */
  readonly embedded = input(false);
  /** Atlas ids that bound the graph; when set, the reader cannot widen the scope from the legend. */
  readonly scope = input<readonly string[] | null>(null);
  /** Selected node, kept in step with the record shown under the graph. */
  readonly focus = input<string | null>(null);
  /** Node picked in the map, so the chapter can open its record in place. */
  readonly picked = output<string | null>();
  /** The reader asked to see the selected record under the map. */
  readonly inspect = output<string>();

  readonly kinds = networkKinds;
  readonly kindGroups = networkKindGroups.map((group) => ({
    ...group,
    kinds: networkKinds.filter((kind) => kind.group === group.id),
  }));
  readonly families = relationFamilies;
  private readonly familyById = new Map(this.families.map((family) => [family.id, family]));
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
  /** Atlas ids merged into the scope, or null when the reader can pick any collection. */
  readonly scopeIds = computed(() => {
    const scope = this.scope();
    return scope?.length ? new Set(scope) : null;
  });
  /** The collections actually filter the map: the fixed scope wins over the legend checkboxes. */
  readonly activeCollections = computed(() => this.scopeIds() ?? this.collectionsOn());
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
  private readonly wheeling = signal(false);
  private wheelTimer: ReturnType<typeof setTimeout> | undefined;
  /** Wheel events are coalesced into one view update per frame; trackpads emit dozens per frame. */
  private wheelFrame = 0;
  private wheelFactor = 1;
  private wheelAround: { x: number; y: number } | null = null;
  /** The view is moving (drag, pinch, wheel or glide): heavy parts of the drawing wait. */
  readonly busy = computed(() => this.dragging() || this.animating() || this.wheeling());
  private lastLabels: { k: number; items: readonly LabelView[] } = {
    k: 0,
    items: [],
  };
  /** Semantic zoom level kept between frames so thresholds do not flicker. */
  private lastTier: LabelTier | null = null;
  /** Names to draw: those placed for this zoom, never stretched across another one. */
  readonly shownLabels = computed(() => {
    const items = this.labels();
    return this.busy() && this.lastLabels.k !== this.zoomK() ? [] : items;
  });
  /** True while the view glides to a new place; labels wait until it settles. */
  readonly animating = signal(false);
  /** Edge under the pointer or focused in the detail list. */
  readonly hoveredEdgeId = signal<string | null>(null);
  /** Pointer position inside the stage, for the hover card. */
  readonly pointerAt = signal<{ x: number; y: number } | null>(null);

  readonly total = this.network.nodes.length;
  readonly loading = computed(() => this.positions() === null && this.total > 0);
  readonly visible = computed(() =>
    filterNetwork(this.network, {
      kinds: this.kindsOn(),
      families: this.familiesOn(),
      collections: this.activeCollections(),
      onlyConnected: this.onlyConnected(),
    }),
  );
  readonly visibleIds = computed(() => new Set(this.visible().nodes.map((node) => node.id)));
  readonly filtersActive = computed(
    () =>
      this.kindsOn().size < this.kinds.length ||
      this.familiesOn().size < this.families.length ||
      (!this.scopeIds() && this.collectionsOn().size < this.collections.length) ||
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
  /** Licensed image of the selected record, shown at the top of the detail card. */
  readonly selectedMedia = computed(() => {
    const node = this.selected();
    return node ? entityMedia(this.repository.knowledgeGraph, { id: node.id }) : undefined;
  });
  /** Geometric art keeps the card visual when the record has no licensed picture. */
  readonly selectedIllustration = computed(() => {
    const node = this.selected();
    if (!node || this.selectedMedia()) return null;
    const atlas = this.repository.atlasForEntity(node.id);
    return atlas ? { id: node.id, kind: node.kind, palette: illustrationPalette(atlas.id) } : null;
  });
  readonly selectedLinks = computed(() => {
    const node = this.selected();
    return node ? linksOf(node.id, this.visible().edges, this.nodeIndex) : [];
  });
  readonly selectedClaims = computed(() => {
    const node = this.selected();
    return node ? positionClaims(node).slice(0, 3) : [];
  });
  /**
   * The node whose surroundings are lit while the reader hovers it. A selection is a permanent
   * mark, not a filter: dimming every other node would erase the map around the selected one.
   */
  readonly activeId = computed(() => this.hoveredId());
  readonly activeLinks = computed(() => {
    const id = this.activeId();
    return id ? linksOf(id, this.visible().edges, this.nodeIndex) : [];
  });
  readonly neighbours = computed(() => new Set(this.activeLinks().map((link) => link.other.id)));
  /** Nodes that stay lit: the hovered node with its neighbours; null when all are. */
  private readonly litNodes = computed<ReadonlySet<string> | null>(() => {
    const active = this.activeId();
    if (!active) return null;
    return new Set([active, ...this.neighbours()]);
  });
  /** Free part of the stage, in pixels, between the floating panels. */
  readonly insets = computed(() => {
    const { width, height } = this.size();
    const rem = 16;
    const wide = this.wide();
    return {
      left: wide && this.controlsShown() ? 19 * rem + 32 : 12,
      right: wide && !this.embedded() && this.selected() ? 23 * rem + 32 : 12,
      top: wide ? 92 : 84,
      // On a phone the pill and the zoom stack over the bottom of the map; keep labels clear.
      bottom:
        !wide && this.embedded() && this.selectedVisible()
          ? 172
          : !wide && !this.embedded() && this.selected()
            ? Math.round(height * 0.5)
            : 64,
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

  /**
   * Visible part of the world, in content coordinates, with a screen margin. Off-screen records are
   * not rendered: at high zoom they are most of the map and repainting them is what made zoom slow.
   * Null before the stage is measured, when every record is drawn.
   */
  private readonly contentBounds = computed(() => {
    const { x, y, k } = this.view();
    const { width, height } = this.size();
    if (!width || !height) return null;
    const inset = this.insets();
    const margin = 96 / k;
    return {
      left: (inset.left - x) / k - margin,
      top: (inset.top - y) / k - margin,
      right: (width - inset.right - x) / k + margin,
      bottom: (height - inset.bottom - y) / k + margin,
    };
  });
  readonly drawnNodes = computed(() => {
    const positions = this.positions();
    if (!positions) return [];
    const bounds = this.contentBounds();
    const kept = new Set(
      [this.selectedId(), this.hoveredId(), this.focusId()].filter((id): id is string => !!id),
    );
    return this.visible().nodes.flatMap((node) => {
      const point = positions.get(node.id);
      if (!point) return [];
      if (
        bounds &&
        !kept.has(node.id) &&
        (point.x < bounds.left ||
          point.x > bounds.right ||
          point.y < bounds.top ||
          point.y > bounds.bottom)
      )
        return [];
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
        },
      ];
    });
  });
  readonly zoomK = computed(() => this.view().k);
  /** Close enough to read what each link says; farther away the lines alone are shown. */
  readonly near = computed(() => this.zoomK() / this.fitK() >= EDGE_LABEL_ZOOM);
  /** Zoom in quarter-octave steps: what depends on it is redrawn per step, not per frame. */
  private readonly zoomStep4 = computed(() => Math.round(Math.log2(this.zoomK()) * 4));
  private readonly steppedK = computed(() => 2 ** (this.zoomStep4() / 4));
  /** Halos sit behind every well-connected node; keeping them apart lets a node be one path. */
  readonly haloNodes = computed(() => this.drawnNodes().filter((item) => item.node.degree >= 6));
  /** The selected node pulses above the map. */
  readonly pulseNodes = computed(() => {
    const id = this.selectedId();
    return id ? this.drawnNodes().filter((item) => item.node.id === id) : [];
  });
  /** A persistent ring around the selected node, independent of the pulse animation. */
  readonly selectionNodes = computed(() => {
    const id = this.selectedId();
    return id ? this.drawnNodes().filter((item) => item.node.id === id) : [];
  });
  /** True when the selected record is one of the shapes drawn in this cut of the map. */
  readonly selectedVisible = computed(() => {
    const id = this.selectedId();
    return !!id && this.visible().nodes.some((node) => node.id === id);
  });
  readonly drawnEdges = computed(() => {
    const positions = this.positions();
    if (!positions) return [];
    const scale = this.nodeScale();
    const { width, height } = this.world();
    const bounds = this.contentBounds();
    const spacing = Math.sqrt((width * height) / Math.max(1, this.total));
    return this.visible().edges.flatMap((edge: NetworkEdge) => {
      const from = positions.get(edge.source);
      const to = positions.get(edge.target);
      const target = this.nodeIndex.get(edge.target);
      if (!from || !to || !target) return [];
      if (
        bounds &&
        (Math.max(from.x, to.x) < bounds.left ||
          Math.min(from.x, to.x) > bounds.right ||
          Math.max(from.y, to.y) < bounds.top ||
          Math.min(from.y, to.y) > bounds.bottom)
      )
        return [];
      const family = relationFamilyDefinition(edge.family);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy) || 1;
      const pad = nodeRadius(target.degree) * scale + 3 / this.steppedK();
      // Long links between far regions fade, so the map reads as areas, not a tangle.
      const fade = Math.max(0.08, 1 - length / (4 * spacing));
      return [
        {
          edge,
          family,
          delay: (hash(edge.id) % 10) * 28,
          fade,
          x1: from.x,
          y1: from.y,
          x2: to.x - (dx / length) * pad,
          y2: to.y - (dy / length) * pad,
        },
      ];
    });
  });
  /** Edges collapse into a few paths; only lit links stay individual so their animation survives. */
  readonly edgeBatches = computed(() => {
    const plain: EdgeSegment[] = [];
    const detailed = new Map<RelationFamilyId, EdgeSegment[]>();
    const lit: DrawnEdge[] = [];
    for (const item of this.drawnEdges()) {
      const segment: EdgeSegment = {
        key: 'plain',
        x1: item.x1,
        y1: item.y1,
        x2: item.x2,
        y2: item.y2,
        fade: item.fade,
      };
      if (this.edgeLit(item.edge)) {
        lit.push(item);
      } else if (this.edgeDetailed(item.edge)) {
        const list = detailed.get(item.family.id) ?? [];
        list.push({ ...segment, key: item.family.id });
        detailed.set(item.family.id, list);
      } else {
        plain.push(segment);
      }
    }
    return {
      plain: batchEdgeSegments(plain),
      detailed: [...detailed].flatMap(([familyId, segments]) =>
        batchEdgeSegments(segments).map((batch) => ({
          ...batch,
          family: this.familyById.get(familyId),
        })),
      ),
      lit,
    };
  });
  readonly transform = computed(() => {
    const { x, y, k } = this.view();
    return `translate(${x} ${y}) scale(${k})`;
  });
  /** Shapes keep a readable size on screen: larger when zoomed out, smaller when zoomed in. */
  readonly nodeScale = computed(() => Math.round(nodeScaleFor(this.steppedK()) * 20) / 20);
  /**
   * Labels are placed in screen space so none covers another label or a node shape. Zoomed out
   * only the best connected nodes are named; each zoom step names more. While a node is lit,
   * only that node and its neighbours keep their names.
   */
  readonly labels = computed(() => {
    // While the view moves, names wait: placing hundreds of them every frame is what stutters.
    if (this.busy()) return this.lastLabels.items;
    const nodes = this.drawnNodes();
    if (!nodes.length) return [];
    const k = this.zoomK();
    const scale = nodeScaleFor(k);
    const zoom = k / this.fitK();
    const lit = this.litNodes();
    const selectedId = this.selectedId();
    const activeId = this.activeId();
    const matched = new Set(this.matchIds());
    const forced = new Set<string>([
      ...matched,
      ...[selectedId, this.hoveredId(), this.focusId()].filter((id): id is string => !!id),
    ]);
    const tier = stableLabelTier(zoom, this.lastTier);
    this.lastTier = tier;
    const { x: vx, y: vy } = this.view();
    const { width, height } = this.size();
    const inset = this.insets();
    const bounds = {
      left: inset.left - vx,
      top: inset.top - vy,
      right: width - inset.right - vx,
      bottom: height - inset.bottom - vy,
    };
    const margin = 40;
    const visible = nodes.filter((item) => {
      const x = item.x * k;
      const y = item.y * k;
      return (
        x >= bounds.left - margin &&
        x <= bounds.right + margin &&
        y >= bounds.top - margin &&
        y <= bounds.bottom + margin
      );
    });
    // A name that was already on the map keeps a small edge, so thresholds do not make it blink.
    const previous = new Set(this.lastLabels.items.map((item) => item.id));
    const forcedItems = nodes.filter((item) => forced.has(item.node.id));
    const pool = [...visible];
    const poolIds = new Set(pool.map((item) => item.node.id));
    for (const item of forcedItems) if (!poolIds.has(item.node.id)) pool.push(item);
    const scored = pool
      .filter((item) => !lit || lit.has(item.node.id))
      .map((item) => ({
        item,
        score: labelRelevance(item.node) + (previous.has(item.node.id) ? 0.6 : 0),
      }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.item.node.title.localeCompare(b.item.node.title, 'pt-BR') ||
          a.item.node.id.localeCompare(b.item.node.id),
      );
    const candidates: LabelCandidate[] = [];
    const optional: LabelCandidate[] = [];
    scored.forEach(({ item, score }, rank) => {
      const id = item.node.id;
      const important = lit !== null || forced.has(id);
      // Isolated records only enter the close view; global and middle names need some connection.
      if (!important && tier !== 'local' && (item.node.degree === 0 || score <= 0)) return;
      const candidate: LabelCandidate = {
        id,
        text: important ? item.node.title : shortenLabel(item.node.title, labelTextLimit(tier)),
        x: item.x * k,
        y: item.y * k,
        radius: item.r * scale * k,
        priority: important ? -1 : rank,
        forced: id === activeId || id === selectedId || matched.has(id),
      };
      if (important) candidates.push(candidate);
      else optional.push(candidate);
    });
    const obstacles = visible
      .filter((item) => !lit || lit.has(item.node.id))
      // Minor, unlabeled dots may pass under a name; large or well-connected shapes never do.
      .filter((item) => item.node.degree >= 8 || item.r * scale * k >= 10)
      .map((item) => ({
        id: item.node.id,
        x: item.x * k,
        y: item.y * k,
        radius: item.r * scale * k,
      }));
    const byId = new Map(nodes.map((item) => [item.node.id, item]));
    const budget = lit ? Infinity : labelBudget(tier);
    const selected = Number.isFinite(budget)
      ? spreadCandidates(optional, budget, { width, height })
      : optional;
    const neighbours = this.neighbours();
    const placed = placeLabels([...candidates, ...selected], obstacles, Infinity, bounds).flatMap(
      (label, order) => {
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
      },
    );
    this.lastLabels = { k: this.zoomK(), items: placed };
    return placed;
  });
  /** Short phrases on the links of the lit node, placed at the middle of each link. */
  readonly edgeLabels = computed(() => {
    if (this.busy()) return [];
    const active = this.hoveredId() ?? this.selectedId();
    const positions = this.positions();
    if (!active || !positions) return [];
    // Zoomed out the lines speak for themselves; the wording appears when the reader comes close.
    if (!this.near()) return [];
    const links = this.hoveredId() ? this.activeLinks() : this.selectedLinks();
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
    for (const link of links.slice(0, 18)) {
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
  private readonly minimapBase = computed(() => {
    const world = this.world();
    const positions = this.positions();
    if (!positions || !world.width) return null;
    const width = 168;
    const height = Math.round(Math.max(60, Math.min(120, (width * world.height) / world.width)));
    const scale = Math.min(width / world.width, height / world.height);
    const dots = this.visible().nodes.flatMap((node) => {
      const point = positions.get(node.id);
      return point
        ? [
            {
              x: point.x * scale,
              y: point.y * scale,
              color: networkKindDefinition(node.kind).color,
            },
          ]
        : [];
    });
    return { width, height, scale, dotPaths: batchDots(dots) };
  });
  readonly minimap = computed(() => {
    const base = this.minimapBase();
    if (!base) return null;
    const { x, y, k } = this.view();
    const { width: sw, height: sh } = this.size();
    return {
      ...base,
      box: {
        x: (-x / k) * base.scale,
        y: (-y / k) * base.scale,
        w: (sw / k) * base.scale,
        h: (sh / k) * base.scale,
      },
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
  private pointerFrame = 0;
  private lastPointer: { x: number; y: number } | null = null;
  private tweenToken = 0;
  private allK = 0.1;
  private cycleOrigin: string | null = null;
  /** Last selection received from the chapter, so the graph does not echo it back. */
  private lastFocus: string | null = null;

  constructor() {
    // The chapter owns the record panel; the map only mirrors the record it is showing.
    effect(() => {
      const id = this.focus();
      if (id === this.lastFocus) return;
      this.lastFocus = id;
      untracked(() => {
        if (!id || id === this.selectedId()) return;
        this.selectedId.set(id);
        this.focusId.set(id);
        if (this.positions()) this.reveal(id);
      });
    });
    // In a chapter the legend starts folded: the map should read as a map, not as a dashboard.
    effect(() => {
      if (this.embedded() && this.controlsOpen() === null) this.controlsOpen.set(false);
    });
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
        const compiled = this.repository.layouts.network;
        const layout = compiled
          ? { ...compiled, positions: new Map(Object.entries(compiled.positions)) }
          : layoutNetwork(this.network.nodes, this.network.edges);
        this.world.set({ width: layout.width, height: layout.height });
        this.positions.set(layout.positions);
        const selected = this.focus();
        if (selected) {
          this.selectedId.set(selected);
          this.focusId.set(selected);
        }
        if (this.size().width && !fitted) {
          fitted = true;
          this.fit();
        }
      });
      this.destroyRef.onDestroy(() => {
        clearTimeout(timer);
        clearTimeout(this.wheelTimer);
        if (this.wheelFrame) cancelAnimationFrame(this.wheelFrame);
        if (this.pointerFrame) cancelAnimationFrame(this.pointerFrame);
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
    if (this.scopeIds()) return;
    this.collectionsOn.update((set) => toggled(set, id));
  }
  soloKind(id: NetworkKindId): void {
    this.kindsOn.set(new Set([id]));
  }
  resetFilters(): void {
    this.kindsOn.set(new Set(networkKinds.map((k) => k.id)));
    this.familiesOn.set(new Set(relationFamilies.map((f) => f.id)));
    if (!this.scopeIds()) this.collectionsOn.set(new Set(this.collections.map((c) => c.id)));
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
    // Embedded in a reading page, the map listens only while the reader is inside it.
    if (this.embedded() && (!target || !this.host.nativeElement.contains(target))) return;
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
      Escape: () => {
        if (this.shortcutsOpen()) this.shortcutsOpen.set(false);
        else if (this.selectedId() && !this.embedded()) this.clearSelection();
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
      if (first) this.select(first.id, true);
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

  /**
   * Marks a node as selected. Clicking a node that is already on screen keeps the view still; only
   * a deliberate reveal, such as a search result, moves the map to the node.
   */
  select(id: string | null, reveal = false): void {
    this.selectedId.set(id);
    if (id) {
      this.focusId.set(id);
      if (reveal) {
        // Choosing a result closes the results list; the map returns to the whole cut.
        this.query.set('');
        if (this.embedded()) this.reveal(id);
        else this.center(id);
      }
    }
    this.picked.emit(id);
  }
  /** Brings the record of the selected node into view under the map. */
  inspectSelected(): void {
    const node = this.selected();
    if (node) this.inspect.emit(node.id);
  }
  clearSelection(): void {
    this.selectedId.set(null);
    this.picked.emit(null);
  }
  isDimmed(id: string): boolean {
    const lit = this.litNodes();
    if (lit) return !lit.has(id);
    return this.query().trim() !== '' && !this.matchIds().has(id);
  }
  edgeDimmed(edge: NetworkEdge): boolean {
    const active = this.activeId();
    return !!active && edge.source !== active && edge.target !== active;
  }
  /**
   * Colour, dash and arrowhead tell the kind of link. Far away every link is the same plain line;
   * up close, or on the links of the selected node, the kind shows.
   */
  edgeDetailed(edge: NetworkEdge): boolean {
    if (this.near()) return true;
    const selected = this.selectedId();
    return !!selected && (edge.source === selected || edge.target === selected);
  }
  edgeLit(edge: NetworkEdge): boolean {
    const active = this.activeId();
    const selected = this.selectedId();
    return (
      edge.id === this.hoveredEdgeId() ||
      (!!active && (edge.source === active || edge.target === active)) ||
      (!!selected && (edge.source === selected || edge.target === selected))
    );
  }
  /** Selection ring keeps the same screen gap from the shape at every zoom. */
  selectionRadius(radius: number): number {
    return radius * this.nodeScale() + 9 / this.steppedK();
  }
  /** Pulse starts just outside the shape, also measured on screen. */
  pulseRadius(radius: number): number {
    return radius * this.nodeScale() + 4 / this.steppedK();
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

  /** A click selects the node whose icon is under the pointer; pointer up clears the background. */
  canvasClick(event: MouseEvent): void {
    if (this.suppressClick) return;
    const rect = this.stage()?.nativeElement.getBoundingClientRect();
    if (!rect) return;
    const node = this.nodeAt({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    if (node) this.select(node.id);
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
    if (id) this.schedulePointer();
  }
  hoverEdge(id: string | null): void {
    this.hoveredEdgeId.set(id);
  }
  stagePointer(event: PointerEvent): void {
    if (event.pointerType === 'touch' || this.dragging()) return;
    const rect = this.stage()?.nativeElement.getBoundingClientRect();
    if (!rect) return;
    const at = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    this.lastPointer = at;
    const node = this.nodeAt(at);
    if (node?.id !== this.hoveredId()) this.hoverNode(node?.id ?? null);
    // The card only exists over a node (or a lit link up close); elsewhere no signal is written.
    if (!node && !this.hoveredEdgeId() && !this.near()) return;
    this.schedulePointer();
  }
  stageLeave(): void {
    if (this.pointerFrame) cancelAnimationFrame(this.pointerFrame);
    this.pointerFrame = 0;
    this.lastPointer = null;
    this.pointerAt.set(null);
    this.hoveredId.set(null);
    this.hoveredEdgeId.set(null);
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
    if (this.embedded() && this.scopeIds()) {
      this.fitScope(animate);
      return;
    }
    this.fitWhole(animate);
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
    this.wheeling.set(true);
    clearTimeout(this.wheelTimer);
    this.wheelTimer = setTimeout(() => this.wheeling.set(false), 160);
    this.wheelFactor *= Math.exp(-event.deltaY * 0.0015);
    this.wheelAround = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    if (this.wheelFrame) return;
    this.wheelFrame = requestAnimationFrame(() => {
      this.wheelFrame = 0;
      const factor = this.wheelFactor;
      const around = this.wheelAround;
      this.wheelFactor = 1;
      this.wheelAround = null;
      if (around) this.zoomBy(factor, around);
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
    } else if (!this.embedded() && (event.target as Element).closest('[data-node]') === null) {
      // In a chapter the selection mirrors the record below: there is no empty state to clear to.
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
    const rect = this.stage()?.nativeElement.getBoundingClientRect();
    const node = rect
      ? this.nodeAt({ x: event.clientX - rect.left, y: event.clientY - rect.top })
      : null;
    if (node) {
      void this.router.navigate(['/verbete', node.slug]);
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
  private schedulePointer(): void {
    if (this.pointerFrame || !this.lastPointer || typeof requestAnimationFrame !== 'function')
      return;
    this.pointerFrame = requestAnimationFrame(() => {
      this.pointerFrame = 0;
      if (this.lastPointer && !this.dragging()) this.pointerAt.set(this.lastPointer);
    });
  }
  /** The whole map is the 100% mark of the page view. */
  private fitWhole(animate: boolean): void {
    const { width, height } = this.size();
    const world = this.world();
    const inset = this.insets();
    const freeW = Math.max(120, width - inset.left - inset.right);
    const freeH = Math.max(120, height - inset.top - inset.bottom);
    const k = Math.min(freeW / world.width, freeH / world.height) * 0.98;
    this.allK = k;
    this.fitK.set(k);
    this.glideTo(
      {
        k,
        x: inset.left + freeW / 2 - (world.width / 2) * k,
        y: inset.top + freeH / 2 - (world.height / 2) * k,
      },
      animate,
    );
  }
  /** In a chapter, the 100% mark is the atlas it shows, not the whole archive. */
  private fitScope(animate: boolean): void {
    const positions = this.positions();
    const nodes = this.visible().nodes;
    if (!positions || !nodes.length) {
      this.fitWhole(animate);
      return;
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const node of nodes) {
      const point = positions.get(node.id);
      if (!point) continue;
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
      this.fitWhole(animate);
      return;
    }
    const inset = this.insets();
    const freeW = Math.max(120, this.size().width - inset.left - inset.right);
    const freeH = Math.max(120, this.size().height - inset.top - inset.bottom);
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const padX = Math.max(48, spanX * 0.08);
    const padY = Math.max(48, spanY * 0.08);
    const k = Math.min(freeW / (spanX + padX * 2), freeH / (spanY + padY * 2)) * 0.98;
    this.allK = k;
    this.fitK.set(k);
    this.glideTo(
      {
        k,
        x: inset.left + freeW / 2 - ((minX + maxX) / 2) * k,
        y: inset.top + freeH / 2 - ((minY + maxY) / 2) * k,
      },
      animate,
    );
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

  /**
   * Nearest drawn node to a point inside the stage. Resolving by distance keeps hover and click on
   * the icon the reader is pointing at, even when two nodes overlap in a dense map; the reach is
   * never under 16 px on screen, whatever the zoom, so a click just beside an icon still lands.
   */
  private nodeAt(point: { x: number; y: number }): NetworkNode | null {
    const { k, x: vx, y: vy } = this.view();
    const scale = this.nodeScale();
    let best: { node: NetworkNode; distance: number } | null = null;
    for (const item of this.drawnNodes()) {
      const x = item.x * k + vx;
      const y = item.y * k + vy;
      const reach = Math.max(item.r * scale * k + 6, 16);
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance > reach) continue;
      if (!best || distance < best.distance) best = { node: item.node, distance };
    }
    return best?.node ?? null;
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
    const right = this.wide() && !this.embedded() ? 23 * 16 + 32 : inset.right;
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

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
