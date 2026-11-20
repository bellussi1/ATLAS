import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  linkedSignal,
  PLATFORM_ID,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, type ParamMap, Router, RouterLink } from '@angular/router';
import { readerProse } from '@core/content/editorial/reader-voice';
import { entityMedia } from '@core/content/media/asset-license';
import type { NetworkGraph } from '@core/content/models/content-artifacts';
import type { KnowledgeGraph, TemporalExtent } from '@core/content/models/content-schema';
import { itinerariesForEntity, readingsForEntity } from '@core/content/queries/cross-links';
import {
  relationFamilies,
  type RelationFamilyDefinition,
  type RelationFamilyId,
} from '@core/content/queries/knowledge-network';
import {
  buildWorldMapModel,
  filterWorldMap,
  pickSurpriseCandidate,
  WORLD_MAP_ERA_PRESETS,
  type WorldMapConnection,
  type WorldMapFilteredTerritory,
  type WorldMapGeoFeature,
  type WorldMapHotpoint,
  type WorldMapLayerId,
  type WorldMapTerritory,
} from '@core/content/queries/world-map';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { AtlasIconComponent } from '@shared/ui/icon/icon.component';
import { AtlasSectionSwitcherComponent } from '@shared/ui/section-switcher/section-switcher.component';
import { MapStudyDeskComponent } from '@world-map/components/map-study-desk/map-study-desk.component';
import globeMapData from '@world-map/data/natural-earth-globe.json';
import {
  type GlobeHitConnection,
  hitTestConnectionArc,
  prepareGlobeAtlas,
  type RawGlobeCountry,
  renderGlobeFrame,
} from '@world-map/utils/globe-canvas';
import {
  clampLatitude,
  createGlobeCamera,
  type GlobeLabelPlacement,
  type GlobeRect,
  hitTestCountry,
  normalizeLongitude,
  placeGlobeLabels,
  projectPoint,
  slerpLonLat,
  toUnitVector,
  unprojectScreen,
  type Vec3,
} from '@world-map/utils/globe-projection';

import {
  MapStartComponent,
  type MapStartTerritory,
} from '../../components/map-start/map-start.component';

interface GlobeBaseMap {
  readonly attribution: {
    readonly source: string;
    readonly license: string;
    readonly url: string;
  };
  readonly countries: readonly RawGlobeCountry[];
}

interface SearchHit {
  readonly key: string;
  readonly title: string;
  readonly subtitle: string;
  readonly territoryId: string;
  readonly recordSlug: string | null;
}

interface StageLayout {
  readonly width: number;
  readonly height: number;
  readonly cx: number;
  readonly cy: number;
  readonly baseRadius: number;
  readonly forbiddenRects: readonly GlobeRect[];
}

interface VisibleMarkerItem {
  readonly territory: WorldMapTerritory;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly activityCount: number;
  readonly ariaLabel: string;
}

const LAYER_LABELS: Readonly<Record<WorldMapLayerId, string>> = {
  country: 'País atual',
  polity: 'Entidade histórica',
  locality: 'Cidade ou local',
};

const ALL_LAYERS: readonly {
  readonly id: WorldMapLayerId;
  readonly label: string;
}[] = [
  { id: 'country', label: 'Países atuais' },
  { id: 'polity', label: 'Entidades históricas' },
  { id: 'locality', label: 'Cidades e lugares' },
];

const FAMILY_COLOR_FALLBACKS: Readonly<Record<RelationFamilyId, string>> = {
  influenced: '#b81d16',
  rupture: '#9a4a0c',
  participation: '#164f60',
  creation: '#24563b',
  continuity: '#363a5f',
  affiliation: '#363a5f',
  location: '#777268',
};

const ALL_FAMILY_IDS = relationFamilies.map((family) => family.id);

function parseYearParam(raw: string | null): number | null {
  if (!raw || !/^-?\d{1,4}$/.test(raw.trim())) return null;
  const parsed = Number(raw.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSvgDash(dash: string): readonly number[] {
  if (!dash.trim()) return [];
  return dash
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);
}

/** Places to start from: Brazil, its region and the powers that recur across the periods. */
const START_TERRITORIES = [
  'Brasil',
  'Argentina',
  'Estados Unidos',
  'França',
  'União Soviética',
  'Índia',
  'África do Sul',
];

@Component({
  selector: 'app-world-map-page',
  imports: [
    AtlasIconComponent,
    AtlasSectionSwitcherComponent,
    RouterLink,
    MapStartComponent,
    MapStudyDeskComponent,
  ],
  templateUrl: './world-map-page.component.html',
  styleUrl: './world-map-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onGlobalKey($event)',
  },
})
export class WorldMapPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly repository = inject(ContentRepository);
  private readonly document = inject(DOCUMENT);
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly stageRef = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('globeCanvas');
  private readonly barRef = viewChild<ElementRef<HTMLElement>>('topBar');
  private readonly legendRef = viewChild<ElementRef<HTMLElement>>('legendPanel');
  private readonly deskRef = viewChild<ElementRef<HTMLElement>>('studyDesk');
  private readonly timelineDockRef = viewChild<ElementRef<HTMLElement>>('timelineDock');
  private readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  readonly baseMap: GlobeBaseMap = globeMapData as unknown as GlobeBaseMap;
  readonly eraPresets = WORLD_MAP_ERA_PRESETS;
  readonly families: readonly RelationFamilyDefinition[] = relationFamilies;
  readonly layers = ALL_LAYERS;
  readonly centuryTicks = [1750, 1800, 1850, 1900, 1950, 2000, 2026] as const;

  private readonly resolvedGraph: KnowledgeGraph | NetworkGraph =
    (this.route.snapshot.data['knowledge'] as KnowledgeGraph | NetworkGraph | undefined) ??
    this.repository.knowledgeGraph;

  private readonly geoFeatures: readonly WorldMapGeoFeature[] = this.baseMap.countries;
  readonly model = buildWorldMapModel(this.resolvedGraph, this.geoFeatures);
  private readonly globeAtlas = prepareGlobeAtlas(this.baseMap.countries);

  private readonly territoryById = new Map(this.model.territories.map((t) => [t.id, t]));
  private readonly territoryByIso = new Map(
    this.model.territories
      .filter((t) => t.isoNumeric && t.isoNumeric !== '000')
      .map((t) => [t.isoNumeric!, t]),
  );
  private readonly territoryBySlug = (() => {
    const map = new Map<string, WorldMapTerritory>();
    for (const territory of this.model.territories) {
      map.set(territory.slug, territory);
      for (const memberSlug of territory.memberSlugs) {
        if (!map.has(memberSlug)) map.set(memberSlug, territory);
      }
    }
    return map;
  })();
  private readonly familyById = new Map(this.families.map((family) => [family.id, family]));
  private readonly matchedGeoIsos = new Set(
    this.baseMap.countries
      .map((country) => country.isoNumeric)
      .filter((iso) => iso !== '000' && this.territoryByIso.has(iso)),
  );
  private readonly territoryUnitVecs = (() => {
    const map = new Map<string, Vec3>();
    for (const territory of this.model.territories) {
      if (territory.coordinates) {
        map.set(territory.id, toUnitVector(territory.coordinates.lat, territory.coordinates.lon));
      }
    }
    return map;
  })();

  private readonly familyDashMap: Readonly<Record<RelationFamilyId, readonly number[]>> = {
    influenced: parseSvgDash(this.familyById.get('influenced')?.dash ?? ''),
    rupture: parseSvgDash(this.familyById.get('rupture')?.dash ?? ''),
    participation: parseSvgDash(this.familyById.get('participation')?.dash ?? ''),
    creation: parseSvgDash(this.familyById.get('creation')?.dash ?? ''),
    continuity: parseSvgDash(this.familyById.get('continuity')?.dash ?? ''),
    affiliation: parseSvgDash(this.familyById.get('affiliation')?.dash ?? ''),
    location: parseSvgDash(this.familyById.get('location')?.dash ?? ''),
  };

  readonly familyColorMap =
    signal<Readonly<Record<RelationFamilyId, string>>>(FAMILY_COLOR_FALLBACKS);

  readonly yearFrom = signal<number | null>(null);
  readonly yearTo = signal<number | null>(null);
  readonly includeUndated = signal(false);
  readonly familiesOn = signal<ReadonlySet<RelationFamilyId>>(new Set(ALL_FAMILY_IDS));
  readonly layersOn = signal<ReadonlySet<WorldMapLayerId>>(
    new Set(['country', 'polity', 'locality']),
  );

  readonly selectedTerritoryId = signal<string | null>(null);
  readonly selectedConnectionId = signal<string | null>(null);
  readonly highlightedRecordSlug = signal<string | null>(null);
  readonly hoveredTerritoryId = signal<string | null>(null);
  readonly hoveredConnectionId = signal<string | null>(null);
  readonly hoveredFamilyId = signal<RelationFamilyId | null>(null);
  readonly activeHotpointId = signal<string | null>(null);
  readonly hoveredHotpointId = signal<string | null>(null);

  readonly searchQuery = signal('');
  readonly searchOpen = signal(false);

  readonly wide = signal(true);
  readonly legendOpen = signal<boolean | null>(null);
  readonly legendShown = computed(() => this.legendOpen() ?? this.wide());
  readonly detailsCollapsed = signal(false);
  readonly shortcutsOpen = signal(false);
  readonly tableOpen = signal(false);
  readonly tableTab = signal<'territories' | 'connections'>('territories');
  readonly tableQuery = signal('');
  readonly tableSort = signal<{
    key: 'title' | 'regimes' | 'records' | 'connections';
    desc: boolean;
  }>({
    key: 'records',
    desc: true,
  });

  readonly tableTerritories = computed(() => {
    const query = this.tableQuery().trim().toLocaleLowerCase('pt-BR');
    const { key, desc } = this.tableSort();
    const value = (item: WorldMapFilteredTerritory): number | string =>
      key === 'title'
        ? item.territory.title
        : key === 'regimes'
          ? item.activeRegimes.length
          : key === 'records'
            ? item.activeRecords.length
            : item.connectionCount;
    return this.filtered()
      .activeTerritories.filter(
        (item) => !query || item.territory.title.toLocaleLowerCase('pt-BR').includes(query),
      )
      .slice()
      .sort((a, b) => {
        const av = value(a);
        const bv = value(b);
        const order =
          typeof av === 'string'
            ? av.localeCompare(String(bv), 'pt-BR')
            : (av as number) - (bv as number);
        return desc ? -order : order;
      });
  });

  readonly tableConnections = computed(() => {
    const query = this.tableQuery().trim().toLocaleLowerCase('pt-BR');
    return this.filtered().activeConnections.filter(
      (conn) =>
        !query ||
        `${conn.fromTitle} ${conn.toTitle} ${conn.label}`
          .toLocaleLowerCase('pt-BR')
          .includes(query),
    );
  });

  readonly timelinePlaying = signal(false);

  readonly centerLon = signal(-20);
  readonly centerLat = signal(12);
  readonly zoomFactor = signal(1);
  readonly dragging = signal(false);
  readonly reducedMotion = signal(false);
  readonly canvasReady = signal(false);
  readonly pointerAt = signal<{ x: number; y: number } | null>(null);

  readonly stageLayout = signal<StageLayout>({
    width: 1200,
    height: 760,
    cx: 620,
    cy: 340,
    baseRadius: 235,
    forbiddenRects: [],
  });

  readonly hasSelection = computed(() =>
    Boolean(this.selectedConnectionId() || this.selectedTerritoryId()),
  );
  readonly deskShown = computed(() => this.hasSelection() && !this.detailsCollapsed());
  /** The reader closed the reading guide; it stays closed for this visit. */
  readonly startDismissed = signal(false);
  readonly startShown = computed(
    () => !this.hasSelection() && !this.startDismissed() && !this.tableOpen(),
  );
  /** Either the study desk or the reading guide occupies the side (or the bottom sheet). */
  readonly panelShown = computed(() => this.deskShown() || this.startShown());
  /** On a phone the desk opens as a short sheet over the globe; the reader can raise it to read. */
  readonly deskExpanded = linkedSignal({
    source: () => this.selectedTerritoryId() ?? this.selectedConnectionId(),
    computation: () => false,
  });
  readonly startTerritories = computed<readonly MapStartTerritory[]>(() =>
    START_TERRITORIES.flatMap((title) => {
      const territory = this.model.territories.find(
        (item) => item.title === title && item.layer !== 'locality',
      );
      return territory
        ? [{ id: territory.id, title: territory.title, kind: this.layerLabel(territory.layer) }]
        : [];
    }),
  );
  readonly startPresets = this.eraPresets.filter((preset) => preset.yearFrom !== null);
  readonly hasTemporalFilter = computed(() => this.yearFrom() !== null || this.yearTo() !== null);

  readonly filtered = computed(() =>
    filterWorldMap(this.model, {
      yearFrom: this.yearFrom(),
      yearTo: this.yearTo(),
      includeUndated: this.includeUndated(),
      families: this.familiesOn().size < this.families.length ? this.familiesOn() : null,
      layers: this.layersOn().size < this.layers.length ? this.layersOn() : null,
    }),
  );

  readonly camera = computed(() => {
    const layout = this.stageLayout();
    return createGlobeCamera(
      this.centerLon(),
      this.centerLat(),
      layout.cx,
      layout.cy,
      layout.baseRadius * this.zoomFactor(),
    );
  });

  readonly zoomPercent = computed(() => Math.round(this.zoomFactor() * 100));

  readonly sliderFrom = computed(() => this.yearFrom() ?? this.model.minYear);
  readonly sliderTo = computed(() => this.yearTo() ?? this.model.maxYear);

  readonly windowLeftPercent = computed(() => this.yearPercent(this.sliderFrom()));
  readonly windowWidthPercent = computed(() =>
    Math.max(1, this.yearPercent(this.sliderTo()) - this.yearPercent(this.sliderFrom())),
  );

  readonly periodLabel = computed(() => {
    const from = this.yearFrom();
    const to = this.yearTo();
    if (from === null && to === null) return 'Todo o acervo (1750–2026)';
    return `${from ?? this.model.minYear}–${to ?? this.model.maxYear}`;
  });

  readonly maxDecadeCount = computed(() =>
    Math.max(1, ...this.model.decadeBins.map((bin) => bin.count)),
  );

  readonly activePresetId = computed(() => {
    const from = this.yearFrom();
    const to = this.yearTo();
    const match = this.eraPresets.find(
      (preset) => preset.yearFrom === from && preset.yearTo === to,
    );
    return match?.id ?? null;
  });

  readonly activeFamilyHighlightSet = computed(() => {
    const family = this.hoveredFamilyId();
    if (!family) return null;
    const ids = new Set<string>();
    for (const conn of this.filtered().activeConnections) {
      if (conn.family === family) {
        ids.add(conn.fromTerritoryId);
        ids.add(conn.toTerritoryId);
      }
    }
    return ids;
  });

  readonly focusTerritoryId = computed(
    () => this.hoveredTerritoryId() ?? this.selectedTerritoryId(),
  );

  readonly neighborTerritoryIds = computed<ReadonlySet<string> | null>(() => {
    const focus = this.focusTerritoryId();
    if (!focus) return null;
    const ids = new Set<string>();
    for (const conn of this.filtered().activeConnections) {
      if (conn.fromTerritoryId === focus) ids.add(conn.toTerritoryId);
      else if (conn.toTerritoryId === focus) ids.add(conn.fromTerritoryId);
    }
    return ids.size > 0 ? ids : null;
  });

  readonly neighborIsos = computed<ReadonlySet<string> | null>(() => {
    const ids = this.neighborTerritoryIds();
    if (!ids) return null;
    const isos = new Set<string>();
    for (const tid of ids) {
      const iso = this.territoryById.get(tid)?.isoNumeric;
      if (iso && iso !== '000') isos.add(iso);
    }
    return isos.size > 0 ? isos : null;
  });

  readonly topActiveTerritories = computed(() => {
    const seen = new Set<string>();
    const items: WorldMapFilteredTerritory[] = [];
    for (const item of this.filtered().activeTerritories) {
      if (item.activityCount === 0) continue;
      const key = item.territory.title.trim().toLocaleLowerCase('pt-BR');
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
      if (items.length === 5) break;
    }
    return items;
  });

  readonly activeHotpoint = computed(() => {
    const id = this.activeHotpointId();
    return id ? (this.model.hotpoints.find((hp) => hp.id === id) ?? null) : null;
  });

  readonly previewHotpoint = computed(() => {
    const hoveredId = this.hoveredHotpointId();
    if (hoveredId) {
      return this.model.hotpoints.find((hp) => hp.id === hoveredId) ?? null;
    }
    return this.activeHotpoint();
  });

  readonly visibleMarkers = computed<readonly VisibleMarkerItem[]>(() => {
    const cam = this.camera();
    const items: VisibleMarkerItem[] = [];
    for (const entry of this.filtered().activeTerritories) {
      const vec = this.territoryUnitVecs.get(entry.territory.id);
      if (!vec) continue;
      const pt = projectPoint(vec, cam);
      if (!pt.visible || pt.z < 0.08) continue;
      if (
        entry.territory.layer !== 'country' ||
        !entry.territory.isoNumeric ||
        !this.matchedGeoIsos.has(entry.territory.isoNumeric)
      ) {
        items.push({
          territory: entry.territory,
          x: Math.round(pt.x * 10) / 10,
          y: Math.round(pt.y * 10) / 10,
          z: pt.z,
          activityCount: entry.activityCount,
          ariaLabel: `${entry.territory.title}, ${LAYER_LABELS[entry.territory.layer].toLowerCase()}, ${entry.activityCount} ${
            entry.activityCount === 1 ? 'registro no recorte' : 'registros no recorte'
          }`,
        });
      }
    }
    return items.slice(0, 80);
  });

  readonly placedLabels = computed<readonly GlobeLabelPlacement[]>(() => {
    const cam = this.camera();
    const layout = this.stageLayout();
    const highlighted = this.activeFamilyHighlightSet();
    const neighbors = this.neighborTerritoryIds();
    const selectedId = this.selectedTerritoryId();
    const hoveredId = this.hoveredTerritoryId();

    const candidates = [];
    for (const entry of this.filtered().activeTerritories) {
      const vec = this.territoryUnitVecs.get(entry.territory.id);
      if (!vec) continue;
      const pt = projectPoint(vec, cam);
      if (!pt.visible) continue;

      const isSelected = entry.territory.id === selectedId;
      const isHovered = entry.territory.id === hoveredId;
      const isNeighbor = neighbors?.has(entry.territory.id) ?? false;
      const isHighlighted = highlighted?.has(entry.territory.id) ?? false;
      if (!isSelected && !isHovered && !isNeighbor && !isHighlighted && entry.activityCount === 0) {
        continue;
      }

      const priority: 'selected' | 'hovered' | 'active' = isSelected
        ? 'selected'
        : isHovered
          ? 'hovered'
          : 'active';
      const score =
        (isSelected ? 100000 : 0) +
        (isHovered ? 50000 : 0) +
        (isHighlighted ? 5000 : 0) +
        (isNeighbor ? 2500 : 0) +
        entry.activityCount * 10 +
        (entry.territory.layer === 'country' ? 5 : 0);

      candidates.push({
        territoryId: entry.territory.id,
        title: entry.territory.title,
        screenX: pt.x,
        screenY: pt.y,
        z: pt.z,
        priority,
        score,
        layer: entry.territory.layer,
        neighbour: isNeighbor && !isSelected && !isHovered,
      });
    }

    return placeGlobeLabels(
      candidates,
      { left: 0, top: 0, right: layout.width, bottom: layout.height },
      layout.forbiddenRects,
      this.zoomFactor() > 1.7 ? 22 : 16,
    );
  });

  readonly selectedFilteredTerritory = computed<WorldMapFilteredTerritory | null>(() => {
    const id = this.selectedTerritoryId();
    if (!id) return null;
    const inFiltered = this.filtered().territoryMap.get(id);
    if (inFiltered) return inFiltered;
    const fallback = this.territoryById.get(id);
    if (!fallback) return null;
    return {
      territory: fallback,
      activeRegimes: fallback.regimes,
      activeRecords: [],
      connectionCount: 0,
      activityCount: 0,
    };
  });

  readonly selectedConnection = computed<WorldMapConnection | null>(() => {
    const id = this.selectedConnectionId();
    if (!id) return null;
    return this.filtered().activeConnections.find((conn) => conn.id === id) ?? null;
  });

  readonly selectedTerritoryConnections = computed(() => {
    const territory = this.selectedFilteredTerritory()?.territory;
    if (!territory) return [];
    return this.filtered().activeConnections.filter(
      (conn) => conn.fromTerritoryId === territory.id || conn.toTerritoryId === territory.id,
    );
  });

  readonly selectedReadings = computed(() => {
    const territory = this.selectedFilteredTerritory()?.territory;
    // Same rule as the graph: the territory's own links plus the reading of its collection.
    return territory
      ? readingsForEntity(territory.id, territory.slug, this.selectedAtlasId() ?? undefined)
      : [];
  });

  readonly selectedItineraries = computed(() => {
    const territory = this.selectedFilteredTerritory()?.territory;
    return territory
      ? itinerariesForEntity(territory.id, territory.slug, this.repository.bundledItineraries)
      : [];
  });

  readonly selectedMedia = computed(() => {
    const territory = this.selectedFilteredTerritory()?.territory;
    return territory
      ? entityMedia(this.repository.knowledgeGraph, { id: territory.id })
      : undefined;
  });

  readonly selectedAtlasId = computed(() => {
    const territory = this.selectedFilteredTerritory()?.territory;
    return territory ? (this.repository.atlasForEntity(territory.id)?.id ?? null) : null;
  });

  readonly hoverCard = computed(() => {
    if (this.dragging()) return null;
    const pointer = this.pointerAt();
    if (!pointer) return null;

    const layout = this.stageLayout();
    const left = Math.max(12, Math.min(layout.width - 280, pointer.x + 16));
    const top = Math.max(76, Math.min(layout.height - 200, pointer.y + 16));

    const connId = this.hoveredConnectionId();
    if (connId) {
      const conn = this.filtered().activeConnections.find((item) => item.id === connId);
      if (conn) {
        return {
          left,
          top,
          kind: this.familyLabel(conn.family),
          meta: this.formatExtent(conn.temporalExtent),
          title: `${conn.fromTitle} → ${conn.toTitle}`,
          note: conn.label,
        };
      }
    }

    const territoryId = this.hoveredTerritoryId();
    if (territoryId) {
      const entry = this.filtered().territoryMap.get(territoryId);
      if (entry) {
        const cleanSummary = readerProse(entry.territory.summary) ?? entry.territory.summary;
        return {
          left,
          top,
          kind: LAYER_LABELS[entry.territory.layer],
          meta: `${entry.activeRecords.length} registros`,
          title: entry.territory.title,
          note: entry.activeRegimes[0]?.title ?? cleanSummary,
        };
      }
    }
    return null;
  });

  readonly searchHits = computed<readonly SearchHit[]>(() => {
    const raw = this.searchQuery().trim().toLowerCase();
    if (raw.length < 2) return [];
    const results: SearchHit[] = [];
    const seen = new Set<string>();

    for (const territory of this.model.territories) {
      const hay =
        `${territory.title} ${territory.officialName ?? ''} ${territory.slug}`.toLowerCase();
      if (hay.includes(raw)) {
        const key = `t:${territory.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            key,
            title: territory.title,
            subtitle: `${LAYER_LABELS[territory.layer]} · ${territory.records.length} registros`,
            territoryId: territory.id,
            recordSlug: null,
          });
        }
      }
      if (results.length >= 10) break;
    }

    if (results.length < 10) {
      for (const territory of this.model.territories) {
        for (const record of territory.records) {
          if (record.title.toLowerCase().includes(raw) || record.slug.includes(raw)) {
            const key = `r:${territory.id}:${record.id}`;
            if (!seen.has(key)) {
              seen.add(key);
              results.push({
                key,
                title: record.title,
                subtitle: `${territory.title} · ${record.relationLabel}`,
                territoryId: territory.id,
                recordSlug: record.slug,
              });
            }
          }
          if (results.length >= 10) break;
        }
        if (results.length >= 10) break;
      }
    }

    return results;
  });

  private hitConnections: readonly GlobeHitConnection[] = [];
  private dragState: {
    pointerId: number;
    startX: number;
    startY: number;
    startLon: number;
    startLat: number;
    lastX: number;
    lastY: number;
    lastTime: number;
    vxLon: number;
    vyLat: number;
    moved: boolean;
  } | null = null;
  private windowDragState: {
    pointerId: number;
    startX: number;
    trackWidth: number;
    originFrom: number;
    originTo: number;
  } | null = null;
  private justDragged = false;
  private syncingFromQuery = false;
  private paintFrame = 0;
  private flyFrame = 0;
  private inertiaFrame = 0;
  private layoutFrame = 0;
  private playTimer: ReturnType<typeof setInterval> | undefined;
  private resizeObserver: ResizeObserver | undefined;
  private hoveredCountryIso: string | null = null;

  constructor() {
    afterNextRender(() => {
      if (!this.isBrowser) return;
      this.reducedMotion.set(
        typeof window.matchMedia === 'function'
          ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
          : false,
      );
      this.wide.set(
        typeof window.matchMedia === 'function'
          ? window.matchMedia('(min-width: 1180px)').matches
          : true,
      );
      this.resolveFamilyColors();
      this.measureStage();

      const stage = this.stageRef()?.nativeElement;
      if (stage && typeof ResizeObserver === 'function') {
        this.resizeObserver = new ResizeObserver(() => this.scheduleLayoutMeasure());
        this.resizeObserver.observe(stage);
      }
      this.repository.warmBundle(true);
      this.schedulePaint();
    });

    effect(() => {
      const params = this.queryParams();
      untracked(() => this.applyQueryParams(params));
    });

    effect(() => {
      // Re-measure free globe area whenever floating sidebars open/collapse.
      this.legendShown();
      this.panelShown();
      this.deskExpanded();
      this.hasTemporalFilter();
      if (this.isBrowser) this.scheduleLayoutMeasure();
    });

    effect(() => {
      this.camera();
      this.filtered();
      this.selectedTerritoryId();
      this.hoveredTerritoryId();
      this.selectedConnectionId();
      this.hoveredConnectionId();
      this.hoveredFamilyId();
      this.activeHotpointId();
      this.familyColorMap();
      if (this.isBrowser) this.schedulePaint();
    });

    this.destroyRef.onDestroy(() => {
      this.stopPlayback();
      this.cancelMotion();
      if (this.paintFrame) cancelAnimationFrame(this.paintFrame);
      if (this.layoutFrame) cancelAnimationFrame(this.layoutFrame);
      this.resizeObserver?.disconnect();
    });
  }

  yearPercent(year: number): number {
    const span = Math.max(1, this.model.maxYear - this.model.minYear);
    return Math.max(0, Math.min(100, ((year - this.model.minYear) / span) * 100));
  }

  toggleLegend(): void {
    this.legendOpen.set(!this.legendShown());
  }

  selectTerritory(id: string): void {
    if (this.justDragged) return;
    this.selectTerritoryInternal(id, true, null);
  }

  clearSelection(): void {
    this.selectedTerritoryId.set(null);
    this.selectedConnectionId.set(null);
    this.highlightedRecordSlug.set(null);
    this.detailsCollapsed.set(false);
    this.syncQueryParams();
  }

  selectConnection(id: string): void {
    this.selectedConnectionId.set(id);
    this.detailsCollapsed.set(false);
  }

  startFromPreset(preset: { yearFrom: number | null; yearTo: number | null }): void {
    this.applyPreset(preset.yearFrom, preset.yearTo);
    this.startDismissed.set(true);
  }

  applyPreset(yearFrom: number | null, yearTo: number | null): void {
    this.stopPlayback();
    this.activeHotpointId.set(null);
    this.yearFrom.set(yearFrom);
    this.yearTo.set(yearTo);
    this.syncQueryParams();
  }

  selectDecade(start: number, end: number): void {
    this.stopPlayback();
    this.activeHotpointId.set(null);
    if (this.yearFrom() === start && this.yearTo() === end) {
      this.clearTemporalFilter();
      return;
    }
    this.applyPreset(start, end);
  }

  decadeIsSelected(start: number, end: number): boolean {
    const from = this.yearFrom();
    const to = this.yearTo();
    if (from === null && to === null) return false;
    const effFrom = from ?? -100000;
    const effTo = to ?? 100000;
    return start <= effTo && end >= effFrom;
  }

  onRangeFromInput(raw: string): void {
    this.stopPlayback();
    this.activeHotpointId.set(null);
    const val = Number(raw);
    if (!Number.isFinite(val)) return;
    const clamped = Math.max(this.model.minYear, Math.min(this.sliderTo(), Math.round(val)));
    this.yearFrom.set(clamped);
    if (this.yearTo() === null) this.yearTo.set(this.model.maxYear);
  }

  onRangeToInput(raw: string): void {
    this.stopPlayback();
    this.activeHotpointId.set(null);
    const val = Number(raw);
    if (!Number.isFinite(val)) return;
    const clamped = Math.min(this.model.maxYear, Math.max(this.sliderFrom(), Math.round(val)));
    this.yearTo.set(clamped);
    if (this.yearFrom() === null) this.yearFrom.set(this.model.minYear);
  }

  commitTimelineQuery(): void {
    if (this.sliderFrom() === this.model.minYear && this.sliderTo() === this.model.maxYear) {
      this.yearFrom.set(null);
      this.yearTo.set(null);
    }
    this.syncQueryParams();
  }

  onWindowPointerDown(event: PointerEvent, trackEl: HTMLElement): void {
    if (event.button !== 0 || !this.hasTemporalFilter()) return;
    event.stopPropagation();
    this.stopPlayback();
    this.windowDragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      trackWidth: Math.max(80, trackEl.getBoundingClientRect().width),
      originFrom: this.sliderFrom(),
      originTo: this.sliderTo(),
    };
    (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
  }

  onWindowPointerMove(event: PointerEvent): void {
    if (!this.windowDragState || event.pointerId !== this.windowDragState.pointerId) return;
    const span = this.windowDragState.originTo - this.windowDragState.originFrom;
    const yearDelta = Math.round(
      ((event.clientX - this.windowDragState.startX) / this.windowDragState.trackWidth) *
        (this.model.maxYear - this.model.minYear),
    );
    let nextFrom = this.windowDragState.originFrom + yearDelta;
    if (nextFrom < this.model.minYear) nextFrom = this.model.minYear;
    if (nextFrom + span > this.model.maxYear) nextFrom = this.model.maxYear - span;
    this.activeHotpointId.set(null);
    this.yearFrom.set(nextFrom);
    this.yearTo.set(nextFrom + span);
  }

  onWindowPointerUp(event: PointerEvent): void {
    if (!this.windowDragState || event.pointerId !== this.windowDragState.pointerId) return;
    this.windowDragState = null;
    this.commitTimelineQuery();
  }

  activateHotpoint(hp: WorldMapHotpoint): void {
    this.stopPlayback();
    this.activeHotpointId.set(hp.id);
    this.yearFrom.set(hp.yearFrom);
    this.yearTo.set(hp.yearTo);

    const target = this.territoryById.get(hp.territoryId);
    if (target && !this.layersOn().has(target.layer)) {
      const next = new Set(this.layersOn());
      next.add(target.layer);
      this.layersOn.set(next);
    }

    this.selectedConnectionId.set(null);
    this.selectedTerritoryId.set(hp.territoryId);
    this.highlightedRecordSlug.set(hp.slug);
    this.detailsCollapsed.set(false);
    this.flyTo(hp.focusLon, hp.focusLat, Math.max(this.zoomFactor(), 1.55));
    this.syncQueryParams();
  }

  stepHotpoint(delta: -1 | 1): void {
    const hotpoints = this.model.hotpoints;
    if (hotpoints.length === 0) return;
    const currentId = this.activeHotpointId();
    const currentIndex = currentId ? hotpoints.findIndex((hp) => hp.id === currentId) : -1;
    let nextIndex: number;
    if (currentIndex < 0) {
      nextIndex = delta > 0 ? 0 : hotpoints.length - 1;
    } else {
      nextIndex = (currentIndex + delta + hotpoints.length) % hotpoints.length;
    }
    this.activateHotpoint(hotpoints[nextIndex]);
  }

  toggleTimelinePlay(): void {
    if (this.timelinePlaying()) {
      this.stopPlayback();
      return;
    }
    this.timelinePlaying.set(true);
    const stepWindow = 30;
    const startYear =
      this.yearFrom() !== null && this.sliderFrom() < this.model.maxYear - stepWindow
        ? this.sliderFrom()
        : this.model.minYear;
    this.activeHotpointId.set(null);
    this.yearFrom.set(startYear);
    this.yearTo.set(Math.min(this.model.maxYear, startYear + stepWindow));

    this.playTimer = setInterval(() => {
      const nextFrom = this.sliderFrom() + 15;
      if (nextFrom + stepWindow > this.model.maxYear) {
        this.yearFrom.set(this.model.maxYear - stepWindow);
        this.yearTo.set(this.model.maxYear);
        this.stopPlayback();
        this.syncQueryParams();
        return;
      }
      this.yearFrom.set(nextFrom);
      this.yearTo.set(nextFrom + stepWindow);
    }, 1300);
  }

  clearTemporalFilter(): void {
    this.stopPlayback();
    this.activeHotpointId.set(null);
    this.yearFrom.set(null);
    this.yearTo.set(null);
    this.syncQueryParams();
  }

  toggleIncludeUndated(): void {
    this.includeUndated.update((current) => !current);
    this.syncQueryParams();
  }

  toggleFamily(familyId: RelationFamilyId): void {
    const next = new Set(this.familiesOn());
    if (next.has(familyId)) next.delete(familyId);
    else next.add(familyId);
    this.familiesOn.set(next);
    this.syncQueryParams();
  }

  soloFamily(familyId: RelationFamilyId): void {
    const current = this.familiesOn();
    if (current.size === 1 && current.has(familyId)) {
      this.showAllFamilies();
      return;
    }
    this.familiesOn.set(new Set([familyId]));
    this.syncQueryParams();
  }

  showAllFamilies(): void {
    this.familiesOn.set(new Set(ALL_FAMILY_IDS));
    this.syncQueryParams();
  }

  toggleLayer(layerId: WorldMapLayerId): void {
    const next = new Set(this.layersOn());
    if (next.has(layerId)) next.delete(layerId);
    else next.add(layerId);
    this.layersOn.set(next);
  }

  pickSurprise(): void {
    this.stopPlayback();
    this.activeHotpointId.set(null);
    const pick = pickSurpriseCandidate(this.model, this.selectedTerritoryId());
    if (!pick) return;
    this.yearFrom.set(pick.yearFrom);
    this.yearTo.set(pick.yearTo);
    this.familiesOn.set(new Set(ALL_FAMILY_IDS));
    this.selectTerritoryInternal(pick.territoryId, true, null);
  }

  chooseSearchHit(hit: SearchHit): void {
    this.searchQuery.set(hit.title);
    this.searchOpen.set(false);
    this.selectTerritoryInternal(hit.territoryId, true, hit.recordSlug);
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchOpen.set(value.trim().length >= 2);
  }

  onSearchKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      const hits = this.searchHits();
      if (hits.length > 0) {
        event.preventDefault();
        this.chooseSearchHit(hits[0]);
      }
    } else if (event.key === 'Escape') {
      this.searchOpen.set(false);
    }
  }

  familyLabel(familyId: RelationFamilyId): string {
    return this.familyById.get(familyId)?.label ?? 'Conexão';
  }

  layerLabel(layer: WorldMapLayerId): string {
    return LAYER_LABELS[layer];
  }

  readableText(text: string | null | undefined): string {
    return readerProse(text) ?? text ?? '';
  }

  formatExtent(extent: TemporalExtent | null): string {
    if (!extent) return 'Sem datação estrita';
    if (extent.label) return extent.label;
    if (extent.startYear !== null && extent.endYear !== null) {
      return extent.startYear === extent.endYear
        ? String(extent.startYear)
        : `${extent.startYear}–${extent.endYear}`;
    }
    if (extent.startYear !== null) return `Desde ${extent.startYear}`;
    if (extent.endYear !== null) return `Até ${extent.endYear}`;
    return 'Sem datação estrita';
  }

  zoomStep(factor: number): void {
    this.zoomFactor.set(
      Math.round(Math.max(1, Math.min(4.5, this.zoomFactor() * factor)) * 100) / 100,
    );
  }

  resetZoom(): void {
    this.flyTo(-20, 12, 1);
  }

  onStagePointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    this.cancelMotion();
    this.dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLon: this.centerLon(),
      startLat: this.centerLat(),
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: performance.now(),
      vxLon: 0,
      vyLat: 0,
      moved: false,
    };
  }

  onStagePointerMove(event: PointerEvent): void {
    const stage = this.stageRef()?.nativeElement;
    const rect = stage?.getBoundingClientRect();
    const sx = rect ? event.clientX - rect.left : event.offsetX;
    const sy = rect ? event.clientY - rect.top : event.offsetY;
    this.pointerAt.set({ x: sx, y: sy });

    if (this.dragState && event.pointerId === this.dragState.pointerId) {
      const cam = this.camera();
      const degPerPx = 180 / (Math.PI * Math.max(40, cam.radius));
      const dx = event.clientX - this.dragState.startX;
      const dy = event.clientY - this.dragState.startY;
      if (!this.dragState.moved && Math.hypot(dx, dy) > 4) {
        this.dragState.moved = true;
        this.dragging.set(true);
        (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
      }
      if (this.dragState.moved) {
        const now = performance.now();
        const dt = Math.max(4, now - this.dragState.lastTime);
        const stepDx = event.clientX - this.dragState.lastX;
        const stepDy = event.clientY - this.dragState.lastY;
        this.dragState.vxLon = (-stepDx * degPerPx) / dt;
        this.dragState.vyLat = (stepDy * degPerPx) / dt;
        this.dragState.lastX = event.clientX;
        this.dragState.lastY = event.clientY;
        this.dragState.lastTime = now;

        this.centerLon.set(normalizeLongitude(this.dragState.startLon - dx * degPerPx));
        this.centerLat.set(clampLatitude(this.dragState.startLat + dy * degPerPx));
      }
      return;
    }

    this.updateHoverFromPoint(sx, sy);
  }

  onStagePointerUp(event: PointerEvent): void {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) return;
    const wasMoved = this.dragState.moved;
    const vx = this.dragState.vxLon;
    const vy = this.dragState.vyLat;
    this.dragState = null;
    this.dragging.set(false);

    if (wasMoved) {
      this.justDragged = true;
      setTimeout(() => {
        this.justDragged = false;
      }, 0);

      if (!this.reducedMotion() && (Math.abs(vx) > 0.04 || Math.abs(vy) > 0.04)) {
        this.startInertia(vx, vy);
      }
    }
  }

  onStagePointerLeave(): void {
    this.pointerAt.set(null);
    this.hoveredTerritoryId.set(null);
    this.hoveredConnectionId.set(null);
    this.hoveredCountryIso = null;
  }

  onStageClick(event: MouseEvent): void {
    if (this.justDragged) return;
    const stage = this.stageRef()?.nativeElement;
    const rect = stage?.getBoundingClientRect();
    const sx = rect ? event.clientX - rect.left : event.offsetX;
    const sy = rect ? event.clientY - rect.top : event.offsetY;

    const hit = this.pickAtStagePoint(sx, sy);
    if (hit?.kind === 'connection') {
      this.selectConnection(hit.id);
    } else if (hit?.kind === 'territory') {
      this.selectTerritory(hit.id);
    } else if (this.selectedConnectionId()) {
      this.selectedConnectionId.set(null);
    }
  }

  onStageWheel(event: WheelEvent): void {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.18 : 1 / 1.18;
    this.zoomStep(factor);
  }

  onStageKeyDown(event: KeyboardEvent): void {
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      this.zoomStep(1.2);
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      this.zoomStep(1 / 1.2);
    } else if (event.key === '0' || event.key === 'Home') {
      event.preventDefault();
      this.resetZoom();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.centerLon.set(normalizeLongitude(this.centerLon() - 14));
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.centerLon.set(normalizeLongitude(this.centerLon() + 14));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.centerLat.set(clampLatitude(this.centerLat() + 10));
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.centerLat.set(clampLatitude(this.centerLat() - 10));
    }
  }

  onMarkerKeyDown(event: KeyboardEvent, territoryId: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      this.selectTerritory(territoryId);
    }
  }

  sortTable(key: 'title' | 'regimes' | 'records' | 'connections'): void {
    this.tableSort.update((current) =>
      current.key === key ? { key, desc: !current.desc } : { key, desc: key !== 'title' },
    );
  }

  sortState(
    key: 'title' | 'regimes' | 'records' | 'connections',
  ): 'ascending' | 'descending' | null {
    const current = this.tableSort();
    return current.key === key ? (current.desc ? 'descending' : 'ascending') : null;
  }

  familyColor(familyId: RelationFamilyId): string {
    return `var(${this.familyById.get(familyId)?.color ?? '--color-border-strong'})`;
  }

  openAccessibleTable(): void {
    this.tableOpen.set(true);
    if (this.isBrowser) {
      requestAnimationFrame(() => {
        this.document.getElementById('lista-acessivel')?.focus({ preventScroll: true });
      });
    }
  }

  focusTerritoryFromTable(territoryId: string): void {
    this.tableOpen.set(false);
    this.selectTerritoryInternal(territoryId, true, null);
  }

  inspectConnectionFromTable(connId: string): void {
    this.tableOpen.set(false);
    this.selectConnection(connId);
  }

  onGlobalKey(event: KeyboardEvent): void {
    const activeTag = (this.document.activeElement as HTMLElement | null)?.tagName;
    const typing = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

    if (event.key === '/' && !typing) {
      event.preventDefault();
      this.searchInputRef()?.nativeElement.focus();
      return;
    }
    if (event.key === '?' && !typing) {
      event.preventDefault();
      this.shortcutsOpen.set(!this.shortcutsOpen());
      return;
    }
    if ((event.key === 'l' || event.key === 'L') && !typing) {
      event.preventDefault();
      this.toggleLegend();
      return;
    }
    if ((event.key === '[' || event.key === ']') && !typing && !this.tableOpen()) {
      event.preventDefault();
      this.stepHotpoint(event.key === ']' ? 1 : -1);
      return;
    }
    if ((event.key === 'p' || event.key === 'P') && !typing && !this.tableOpen()) {
      event.preventDefault();
      this.toggleTimelinePlay();
      return;
    }
    if (event.key === 'Escape') {
      if (this.shortcutsOpen()) {
        this.shortcutsOpen.set(false);
        return;
      }
      if (this.tableOpen()) {
        this.tableOpen.set(false);
        return;
      }
      if (this.searchOpen()) {
        this.searchOpen.set(false);
        return;
      }
      if (this.selectedConnectionId()) {
        this.selectedConnectionId.set(null);
        return;
      }
      if (this.selectedTerritoryId()) {
        this.clearSelection();
      }
    }
  }

  private resolveFamilyColors(): void {
    if (!this.isBrowser) return;
    const style = getComputedStyle(this.hostRef.nativeElement);
    const resolve = (cssVar: string, fallback: string) =>
      style.getPropertyValue(cssVar).trim() || fallback;

    this.familyColorMap.set({
      influenced: resolve('--color-accent', FAMILY_COLOR_FALLBACKS.influenced),
      rupture: resolve('--color-orange-strong', FAMILY_COLOR_FALLBACKS.rupture),
      participation: resolve('--color-info', FAMILY_COLOR_FALLBACKS.participation),
      creation: resolve('--color-success', FAMILY_COLOR_FALLBACKS.creation),
      continuity: resolve('--color-indigo', FAMILY_COLOR_FALLBACKS.continuity),
      affiliation: resolve('--color-indigo', FAMILY_COLOR_FALLBACKS.affiliation),
      location: resolve('--color-border-strong', FAMILY_COLOR_FALLBACKS.location),
    });
  }

  private scheduleLayoutMeasure(): void {
    if (this.layoutFrame) cancelAnimationFrame(this.layoutFrame);
    this.layoutFrame = requestAnimationFrame(() => {
      this.layoutFrame = 0;
      this.measureStage();
    });
  }

  private measureStage(): void {
    const stage = this.stageRef()?.nativeElement;
    if (!stage) return;
    const sr = stage.getBoundingClientRect();
    if (sr.width <= 0 || sr.height <= 0) return;

    const toLocal = (el: HTMLElement | undefined): GlobeRect | null => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return null;
      return {
        left: r.left - sr.left,
        top: r.top - sr.top,
        right: r.right - sr.left,
        bottom: r.bottom - sr.top,
      };
    };

    const barRect = toLocal(this.barRef()?.nativeElement);
    const legendRect = toLocal(this.legendRef()?.nativeElement);
    const deskRect = toLocal(this.deskRef()?.nativeElement);
    const timelineRect = toLocal(this.timelineDockRef()?.nativeElement);

    const forbiddenRects: GlobeRect[] = [];
    if (barRect) forbiddenRects.push(barRect);
    if (legendRect) forbiddenRects.push(legendRect);
    if (deskRect) forbiddenRects.push(deskRect);
    if (timelineRect) forbiddenRects.push(timelineRect);

    const isWideLayout = sr.width >= 992;
    const freeLeft = isWideLayout && legendRect ? legendRect.right + 12 : 12;
    const freeRight = isWideLayout && deskRect ? deskRect.left - 12 : sr.width - 12;
    const freeTop = barRect ? barRect.bottom + 8 : 68;
    // On a phone the study desk is a sheet over the bottom of the globe.
    const sheetTop = !isWideLayout && deskRect ? deskRect.top - 8 : sr.height;
    const freeBottom = Math.min(timelineRect ? timelineRect.top - 8 : sr.height - 150, sheetTop);

    const availW = Math.max(120, freeRight - freeLeft);
    const availH = Math.max(120, freeBottom - freeTop);
    const cx = freeLeft + availW / 2;
    const cy = freeTop + availH / 2;
    const baseRadius = Math.max(84, Math.min(availW * 0.41, availH * 0.41));

    this.stageLayout.set({
      width: sr.width,
      height: sr.height,
      cx,
      cy,
      baseRadius,
      forbiddenRects,
    });
  }

  private schedulePaint(): void {
    if (this.paintFrame) cancelAnimationFrame(this.paintFrame);
    this.paintFrame = requestAnimationFrame(() => {
      this.paintFrame = 0;
      this.paintGlobe();
    });
  }

  private paintGlobe(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const layout = this.stageLayout();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const targetW = Math.max(1, Math.round(layout.width * dpr));
    const targetH = Math.max(1, Math.round(layout.height * dpr));
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const filteredState = this.filtered();
    const interactableIsos = new Set<string>();
    const activeIsos = new Set<string>();
    const activityByIso = new Map<string, number>();

    for (const entry of filteredState.activeTerritories) {
      const iso = entry.territory.isoNumeric;
      if (!iso || iso === '000') continue;
      interactableIsos.add(iso);
      activityByIso.set(iso, entry.activityCount);
      if (entry.activityCount > 0) activeIsos.add(iso);
    }

    const markerTerritories = [];
    const matchedCountryDots = [];
    for (const entry of filteredState.activeTerritories) {
      const vec = this.territoryUnitVecs.get(entry.territory.id);
      if (!vec) continue;
      const item = {
        territory: entry.territory,
        active: entry.activityCount > 0,
        activityCount: entry.activityCount,
        unitVec: vec,
      };
      if (
        entry.territory.layer === 'country' &&
        entry.territory.isoNumeric &&
        this.matchedGeoIsos.has(entry.territory.isoNumeric)
      ) {
        if (entry.activityCount > 0) matchedCountryDots.push(item);
      } else {
        markerTerritories.push(item);
      }
    }

    const selectedTerritory = this.selectedFilteredTerritory()?.territory ?? null;
    const hoveredTerritory = this.hoveredTerritoryId()
      ? (this.territoryById.get(this.hoveredTerritoryId()!) ?? null)
      : null;
    const highlightedIds = this.activeFamilyHighlightSet();
    let highlightedIsos: Set<string> | null = null;
    if (highlightedIds) {
      highlightedIsos = new Set<string>();
      for (const tid of highlightedIds) {
        const iso = this.territoryById.get(tid)?.isoNumeric;
        if (iso && iso !== '000') highlightedIsos.add(iso);
      }
    }

    this.hitConnections = renderGlobeFrame(ctx, this.globeAtlas, {
      camera: this.camera(),
      width: layout.width,
      height: layout.height,
      zoomFactor: this.zoomFactor(),
      interactableIsos,
      activeIsos,
      activityByIso,
      selectedIso: selectedTerritory?.isoNumeric ?? null,
      hoveredIso: hoveredTerritory?.isoNumeric ?? this.hoveredCountryIso,
      highlightedTerritoryIds: highlightedIds,
      highlightedIsos,
      neighborTerritoryIds: this.neighborTerritoryIds(),
      neighborIsos: this.neighborIsos(),
      connections: filteredState.activeConnections,
      territoryById: this.territoryById,
      territoryUnitVecs: this.territoryUnitVecs,
      markerTerritories,
      matchedCountryDots,
      selectedTerritoryId: this.selectedTerritoryId(),
      hoveredTerritoryId: this.hoveredTerritoryId(),
      selectedConnectionId: this.selectedConnectionId(),
      hoveredConnectionId: this.hoveredConnectionId(),
      hoveredFamilyId: this.hoveredFamilyId(),
      familyColors: this.familyColorMap(),
      familyDash: this.familyDashMap,
    });

    ctx.restore();
    if (!this.canvasReady()) this.canvasReady.set(true);
  }

  private pickAtStagePoint(
    sx: number,
    sy: number,
  ): {
    readonly kind: 'territory' | 'connection';
    readonly id: string;
    readonly iso?: string;
  } | null {
    const cam = this.camera();
    let closestMarkerId: string | null = null;
    let closestDistSq = 12 * 12;

    for (const item of this.visibleMarkers()) {
      const dx = item.x - sx;
      const dy = item.y - sy;
      const dSq = dx * dx + dy * dy;
      if (dSq <= closestDistSq) {
        closestDistSq = dSq;
        closestMarkerId = item.territory.id;
      }
    }
    if (closestMarkerId) {
      return { kind: 'territory', id: closestMarkerId };
    }

    const hitConn = hitTestConnectionArc(sx, sy, this.hitConnections, 9);
    if (hitConn) {
      return { kind: 'connection', id: hitConn.id };
    }

    const geo = unprojectScreen(sx, sy, cam);
    if (!geo) return null;
    const iso = hitTestCountry(geo.lon, geo.lat, this.globeAtlas.hitPolygons);
    if (!iso || iso === '000') return null;

    const territory = this.territoryByIso.get(iso);
    if (!territory || !this.filtered().territoryMap.has(territory.id)) return null;
    return { kind: 'territory', id: territory.id, iso };
  }

  private updateHoverFromPoint(sx: number, sy: number): void {
    const hit = this.pickAtStagePoint(sx, sy);
    if (hit?.kind === 'connection') {
      this.hoveredConnectionId.set(hit.id);
      this.hoveredTerritoryId.set(null);
      this.hoveredCountryIso = null;
    } else if (hit?.kind === 'territory') {
      this.hoveredConnectionId.set(null);
      this.hoveredTerritoryId.set(hit.id);
      this.hoveredCountryIso = hit.iso ?? null;
    } else {
      this.hoveredConnectionId.set(null);
      this.hoveredTerritoryId.set(null);
      this.hoveredCountryIso = null;
    }
  }

  private flyTo(targetLon: number, targetLat: number, targetZoom?: number): void {
    this.cancelMotion();
    const clampedLat = clampLatitude(targetLat);
    const normLon = normalizeLongitude(targetLon);
    const nextZoom =
      targetZoom !== undefined ? Math.max(1, Math.min(4.5, targetZoom)) : this.zoomFactor();

    if (!this.isBrowser || this.reducedMotion()) {
      this.centerLon.set(normLon);
      this.centerLat.set(clampedLat);
      this.zoomFactor.set(Math.round(nextZoom * 100) / 100);
      return;
    }

    const startLon = this.centerLon();
    const startLat = this.centerLat();
    const startZoom = this.zoomFactor();
    const duration = 480;
    const startTime = performance.now();

    const step = (now: number) => {
      const rawT = Math.min(1, (now - startTime) / duration);
      const eased = 1 - (1 - rawT) ** 3;
      const pos = slerpLonLat(startLon, startLat, normLon, clampedLat, eased);
      this.centerLon.set(pos.lon);
      this.centerLat.set(pos.lat);
      this.zoomFactor.set(Math.round((startZoom + (nextZoom - startZoom) * eased) * 100) / 100);
      if (rawT < 1) {
        this.flyFrame = requestAnimationFrame(step);
      } else {
        this.flyFrame = 0;
      }
    };
    this.flyFrame = requestAnimationFrame(step);
  }

  private startInertia(vxLonPerMs: number, vyLatPerMs: number): void {
    let vx = vxLonPerMs * 16;
    let vy = vyLatPerMs * 16;
    const tick = () => {
      vx *= 0.91;
      vy *= 0.91;
      if (Math.hypot(vx, vy) < 0.08) {
        this.inertiaFrame = 0;
        return;
      }
      this.centerLon.set(normalizeLongitude(this.centerLon() + vx));
      this.centerLat.set(clampLatitude(this.centerLat() + vy));
      this.inertiaFrame = requestAnimationFrame(tick);
    };
    this.inertiaFrame = requestAnimationFrame(tick);
  }

  private cancelMotion(): void {
    if (this.flyFrame) {
      cancelAnimationFrame(this.flyFrame);
      this.flyFrame = 0;
    }
    if (this.inertiaFrame) {
      cancelAnimationFrame(this.inertiaFrame);
      this.inertiaFrame = 0;
    }
  }

  private stopPlayback(): void {
    if (this.playTimer !== undefined) {
      clearInterval(this.playTimer);
      this.playTimer = undefined;
    }
    this.timelinePlaying.set(false);
  }

  private applyQueryParams(params: ParamMap): void {
    this.syncingFromQuery = true;
    try {
      const ano = parseYearParam(params.get('ano'));
      const anoDe = parseYearParam(params.get('anoDe'));
      const anoAte = parseYearParam(params.get('anoAte'));

      if (anoDe !== null || anoAte !== null) {
        this.yearFrom.set(anoDe);
        this.yearTo.set(anoAte);
      } else if (ano !== null) {
        this.yearFrom.set(ano);
        this.yearTo.set(ano);
      } else {
        this.yearFrom.set(null);
        this.yearTo.set(null);
      }

      this.includeUndated.set(params.get('semData') === '1');

      const familia = params.get('familia') as RelationFamilyId | null;
      if (familia && this.familyById.has(familia)) {
        this.familiesOn.set(new Set([familia]));
      } else if (params.get('familia') === null) {
        this.familiesOn.set(new Set(ALL_FAMILY_IDS));
      }

      const paisSlug = params.get('pais');
      const entidadeSlug = params.get('entidade');
      // A timeline marker is shared as its record slug plus the marker's own period: restore it as active.
      const marco = entidadeSlug
        ? this.model.hotpoints.find(
            (hp) =>
              hp.slug === entidadeSlug &&
              hp.yearFrom === (anoDe ?? ano) &&
              hp.yearTo === (anoAte ?? ano),
          )
        : undefined;
      this.activeHotpointId.set(marco?.id ?? null);
      if (paisSlug) {
        const territory = this.territoryBySlug.get(paisSlug);
        if (territory) {
          this.selectTerritoryInternal(territory.id, false, null);
          return;
        }
      }
      if (entidadeSlug) {
        const direct = this.territoryBySlug.get(entidadeSlug);
        if (direct) {
          this.selectTerritoryInternal(direct.id, false, null);
          return;
        }
        for (const territory of this.model.territories) {
          if (territory.records.some((record) => record.slug === entidadeSlug)) {
            this.selectTerritoryInternal(territory.id, false, entidadeSlug);
            return;
          }
        }
      }
    } finally {
      this.syncingFromQuery = false;
    }
  }

  private syncQueryParams(): void {
    if (!this.isBrowser || this.syncingFromQuery) return;
    const territory = this.selectedFilteredTerritory()?.territory ?? null;
    const from = this.yearFrom();
    const to = this.yearTo();
    const fam = this.familiesOn();
    const singleFamily = fam.size === 1 ? [...fam][0] : null;
    const queryParams: Record<string, string | null> = {
      pais: territory && territory.layer !== 'locality' ? territory.slug : null,
      entidade:
        this.highlightedRecordSlug() ??
        (territory && territory.layer === 'locality' ? territory.slug : null),
      ano: from !== null && from === to ? String(from) : null,
      anoDe: from !== null && from !== to ? String(from) : null,
      anoAte: to !== null && from !== to ? String(to) : null,
      semData: this.includeUndated() ? '1' : null,
      familia: singleFamily,
    };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true,
    });
  }

  private selectTerritoryInternal(id: string, syncUrl: boolean, recordSlug: string | null): void {
    const territory = this.territoryById.get(id);
    if (!territory) return;
    this.selectedConnectionId.set(null);
    this.selectedTerritoryId.set(territory.id);
    this.highlightedRecordSlug.set(recordSlug);
    this.detailsCollapsed.set(false);
    if (territory.coordinates) {
      this.flyTo(
        territory.coordinates.lon,
        territory.coordinates.lat,
        Math.max(this.zoomFactor(), 1.45),
      );
    }
    if (syncUrl) this.syncQueryParams();
  }
}
