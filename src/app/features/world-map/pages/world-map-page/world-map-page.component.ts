import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  type ElementRef,
  inject,
  PLATFORM_ID,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, type ParamMap, Router, RouterLink } from '@angular/router';
import { readerProse } from '@core/content/editorial/reader-voice';
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
  placeMapLabels,
  WORLD_MAP_ERA_PRESETS,
  WORLD_MAP_HEIGHT,
  WORLD_MAP_WIDTH,
  type WorldMapConnection,
  type WorldMapFilteredTerritory,
  type WorldMapGeoFeature,
  type WorldMapLayerId,
  type WorldMapTerritory,
} from '@core/content/queries/world-map';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { AtlasChevronComponent } from '@shared/ui/chevron/chevron.component';
import baseMapData from '@world-map/data/natural-earth-110m.json';

interface NaturalEarthBaseMap {
  readonly width: number;
  readonly height: number;
  readonly attribution: {
    readonly source: string;
    readonly license: string;
    readonly url: string;
  };
  readonly spherePath: string;
  readonly graticulePath: string;
  readonly equatorPath: string;
  readonly countries: readonly (WorldMapGeoFeature & {
    readonly path: string;
    readonly bbox: readonly [number, number, number, number];
  })[];
}

interface SearchHit {
  readonly key: string;
  readonly title: string;
  readonly subtitle: string;
  readonly territoryId: string;
  readonly recordSlug: string | null;
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

const ALL_FAMILY_IDS = relationFamilies.map((family) => family.id);

function parseYearParam(raw: string | null): number | null {
  if (!raw || !/^-?\d{1,4}$/.test(raw.trim())) return null;
  const parsed = Number(raw.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

@Component({
  selector: 'app-world-map-page',
  imports: [RouterLink, AtlasChevronComponent],
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly svgElement = viewChild<ElementRef<SVGSVGElement>>('mapSvg');
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  readonly baseMap: NaturalEarthBaseMap = baseMapData as unknown as NaturalEarthBaseMap;
  readonly width = WORLD_MAP_WIDTH;
  readonly height = WORLD_MAP_HEIGHT;
  readonly eraPresets = WORLD_MAP_ERA_PRESETS;
  readonly families: readonly RelationFamilyDefinition[] = relationFamilies;
  readonly layers = ALL_LAYERS;

  private readonly resolvedGraph: KnowledgeGraph | NetworkGraph =
    (this.route.snapshot.data['knowledge'] as KnowledgeGraph | NetworkGraph | undefined) ??
    this.repository.knowledgeGraph;

  readonly model = buildWorldMapModel(this.resolvedGraph, this.baseMap.countries);
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

  readonly searchQuery = signal('');
  readonly searchOpen = signal(false);
  readonly showAllRecords = signal(false);

  readonly view = signal<{ x: number; y: number; k: number }>({ x: 0, y: 0, k: 1 });
  readonly dragging = signal(false);
  readonly reducedMotion = signal(false);

  private dragState: {
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null = null;
  private justDragged = false;
  private syncingFromQuery = false;

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

  readonly placedLabels = computed(() =>
    placeMapLabels(this.filtered().activeTerritories, {
      selectedTerritoryId: this.selectedTerritoryId(),
      hoveredTerritoryId: this.hoveredTerritoryId(),
      highlightedIds: this.activeFamilyHighlightSet(),
      view: this.view(),
      width: this.width,
      height: this.height,
      maxLabels: this.view().k > 2 ? 24 : 18,
    }),
  );

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
    return territory ? readingsForEntity(territory.id, territory.slug) : [];
  });

  readonly selectedItineraries = computed(() => {
    const territory = this.selectedFilteredTerritory()?.territory;
    return territory
      ? itinerariesForEntity(territory.id, territory.slug, this.repository.bundledItineraries)
      : [];
  });

  readonly visibleRecords = computed(() => {
    const records = this.selectedFilteredTerritory()?.activeRecords ?? [];
    return this.showAllRecords() ? records : records.slice(0, 12);
  });

  readonly markerTerritories = computed(() => {
    const items = this.filtered().activeTerritories;
    return items.filter(
      (entry) =>
        entry.territory.layer !== 'country' ||
        !entry.territory.isoNumeric ||
        !this.matchedGeoIsos.has(entry.territory.isoNumeric),
    );
  });

  readonly matchedCountryOverlays = computed(() =>
    this.filtered().activeTerritories.filter(
      (entry) =>
        entry.territory.layer === 'country' &&
        Boolean(entry.territory.isoNumeric) &&
        this.matchedGeoIsos.has(entry.territory.isoNumeric!) &&
        entry.activityCount > 0,
    ),
  );

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
                subtitle: `Em ${territory.title} · ${record.relationLabel}`,
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

  readonly topActiveTerritories = computed(() =>
    this.filtered()
      .activeTerritories.filter((item) => item.activityCount > 0)
      .slice(0, 12),
  );

  readonly zoomPercent = computed(() => Math.round(this.view().k * 100));

  constructor() {
    afterNextRender(() => {
      if (!this.isBrowser) return;
      this.reducedMotion.set(
        typeof window.matchMedia === 'function'
          ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
          : false,
      );
      this.repository.warmBundle(true);
    });

    effect(() => {
      const params = this.queryParams();
      untracked(() => this.applyQueryParams(params));
    });

    this.destroyRef.onDestroy(() => {
      this.dragState = null;
    });
  }

  selectTerritory(id: string): void {
    if (this.justDragged) return;
    this.selectTerritoryInternal(id, true, null);
  }

  selectCountryFeature(isoNumeric: string): void {
    if (this.justDragged || isoNumeric === '000') return;
    const territory = this.territoryByIso.get(isoNumeric);
    if (!territory || !this.filtered().territoryMap.has(territory.id)) return;
    this.selectTerritory(territory.id);
  }

  hoverCountryFeature(isoNumeric: string | null): void {
    if (!isoNumeric || isoNumeric === '000') {
      this.hoveredTerritoryId.set(null);
      return;
    }
    const territory = this.territoryByIso.get(isoNumeric);
    this.hoveredTerritoryId.set(
      territory && this.filtered().territoryMap.has(territory.id) ? territory.id : null,
    );
  }

  countryIsActive(isoNumeric: string): boolean {
    if (isoNumeric === '000') return false;
    const territory = this.territoryByIso.get(isoNumeric);
    if (!territory) return false;
    const entry = this.filtered().territoryMap.get(territory.id);
    return Boolean(entry && entry.activityCount > 0);
  }

  countryIsInteractable(isoNumeric: string): boolean {
    if (isoNumeric === '000') return false;
    const territory = this.territoryByIso.get(isoNumeric);
    return Boolean(territory && this.filtered().territoryMap.has(territory.id));
  }

  countryIsSelected(isoNumeric: string): boolean {
    if (isoNumeric === '000') return false;
    const territory = this.territoryByIso.get(isoNumeric);
    return Boolean(territory && territory.id === this.selectedTerritoryId());
  }

  countryIsHovered(isoNumeric: string): boolean {
    if (isoNumeric === '000') return false;
    const territory = this.territoryByIso.get(isoNumeric);
    return Boolean(territory && territory.id === this.hoveredTerritoryId());
  }

  countryAriaLabel(geo: WorldMapGeoFeature): string {
    const territory =
      geo.isoNumeric !== '000' ? this.territoryByIso.get(geo.isoNumeric) : undefined;
    if (!territory) return geo.name;
    const filtered = this.filtered().territoryMap.get(territory.id);
    const total = filtered?.activityCount ?? territory.records.length;
    return `${territory.title}, ${LAYER_LABELS[territory.layer].toLowerCase()}, ${total} ${
      total === 1 ? 'registro no recorte' : 'registros no recorte'
    }`;
  }

  countryOpacity(isoNumeric: string): number {
    const highlighted = this.activeFamilyHighlightSet();
    if (!highlighted) return 1;
    const territory = isoNumeric !== '000' ? this.territoryByIso.get(isoNumeric) : undefined;
    if (!territory) return 0.45;
    return highlighted.has(territory.id) ? 1 : 0.28;
  }

  markerOpacity(territoryId: string): number {
    const highlighted = this.activeFamilyHighlightSet();
    if (!highlighted) return 1;
    return highlighted.has(territoryId) ? 1 : 0.16;
  }

  connectionOpacity(conn: WorldMapConnection): number {
    if (this.selectedConnectionId() === conn.id || this.hoveredConnectionId() === conn.id) {
      return 1;
    }
    const familyHighlight = this.hoveredFamilyId();
    if (familyHighlight) {
      return conn.family === familyHighlight ? 1 : 0.12;
    }
    const selectedId = this.selectedTerritoryId();
    if (selectedId) {
      return conn.fromTerritoryId === selectedId || conn.toTerritoryId === selectedId ? 0.95 : 0.18;
    }
    return 0.72;
  }

  familyStrokeColor(familyId: RelationFamilyId): string {
    return `var(${this.familyById.get(familyId)?.color ?? '--color-border-strong'})`;
  }

  familyDash(familyId: RelationFamilyId): string | null {
    return this.familyById.get(familyId)?.dash || null;
  }

  familyLabel(familyId: RelationFamilyId): string {
    return this.familyById.get(familyId)?.label ?? 'Conexão';
  }

  layerLabel(layer: WorldMapLayerId): string {
    return LAYER_LABELS[layer];
  }

  clearSelection(): void {
    this.selectedTerritoryId.set(null);
    this.selectedConnectionId.set(null);
    this.highlightedRecordSlug.set(null);
    this.syncQueryParams();
  }

  selectConnection(id: string): void {
    this.selectedConnectionId.set(id);
  }

  applyPreset(yearFrom: number | null, yearTo: number | null): void {
    this.yearFrom.set(yearFrom);
    this.yearTo.set(yearTo);
    this.syncQueryParams();
  }

  selectDecade(start: number, end: number): void {
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

  onYearFromInput(raw: string): void {
    const val = raw.trim() === '' ? null : Number(raw);
    this.yearFrom.set(val !== null && Number.isFinite(val) ? val : null);
    this.syncQueryParams();
  }

  onYearToInput(raw: string): void {
    const val = raw.trim() === '' ? null : Number(raw);
    this.yearTo.set(val !== null && Number.isFinite(val) ? val : null);
    this.syncQueryParams();
  }

  clearTemporalFilter(): void {
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
    }
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
    const current = this.view();
    const nextK = Math.max(1, Math.min(8, current.k * factor));
    const cx = this.width / 2;
    const cy = this.height / 2;
    const worldX = (cx - current.x) / current.k;
    const worldY = (cy - current.y) / current.k;
    this.setClampedView(cx - worldX * nextK, cy - worldY * nextK, nextK);
  }

  resetZoom(): void {
    this.view.set({ x: 0, y: 0, k: 1 });
  }

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    const current = this.view();
    this.dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: current.x,
      originY: current.y,
      moved: false,
    };
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) return;
    const svg = this.svgElement()?.nativeElement;
    const rect = svg?.getBoundingClientRect();
    const scaleX = rect && rect.width > 0 ? this.width / rect.width : 1;
    const scaleY = rect && rect.height > 0 ? this.height / rect.height : 1;
    const dx = (event.clientX - this.dragState.startX) * scaleX;
    const dy = (event.clientY - this.dragState.startY) * scaleY;
    if (!this.dragState.moved && Math.hypot(dx, dy) > 4) {
      this.dragState.moved = true;
      this.dragging.set(true);
    }
    if (this.dragState.moved) {
      this.setClampedView(this.dragState.originX + dx, this.dragState.originY + dy, this.view().k);
    }
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) return;
    if (this.dragState.moved) {
      this.justDragged = true;
      setTimeout(() => {
        this.justDragged = false;
      }, 0);
    }
    this.dragState = null;
    this.dragging.set(false);
  }

  onSvgClick(event: MouseEvent): void {
    if (this.justDragged) return;
    const target = event.target as Element | null;
    const arc = target?.closest?.('[data-conn-id]');
    const connId = arc?.getAttribute('data-conn-id');
    if (connId) {
      event.stopPropagation();
      this.selectConnection(connId);
    }
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.25 : 1 / 1.25;
    this.zoomStep(factor);
  }

  onSvgKeyDown(event: KeyboardEvent): void {
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      this.zoomStep(1.25);
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      this.zoomStep(1 / 1.25);
    } else if (event.key === '0' || event.key === 'Home') {
      event.preventDefault();
      this.resetZoom();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.setClampedView(this.view().x + 48, this.view().y, this.view().k);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.setClampedView(this.view().x - 48, this.view().y, this.view().k);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.setClampedView(this.view().x, this.view().y + 36, this.view().k);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.setClampedView(this.view().x, this.view().y - 36, this.view().k);
    }
  }

  onCountryKeyDown(event: KeyboardEvent, isoNumeric: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      this.selectCountryFeature(isoNumeric);
    }
  }

  onMarkerKeyDown(event: KeyboardEvent, territoryId: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      this.selectTerritory(territoryId);
    }
  }

  onGlobalKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
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

  focusTerritoryFromTable(territoryId: string): void {
    this.selectTerritory(territoryId);
    if (this.isBrowser) {
      this.document.getElementById('map-study-desk')?.scrollIntoView({
        behavior: this.reducedMotion() ? 'auto' : 'smooth',
        block: 'nearest',
      });
    }
  }

  inspectConnectionFromTable(connId: string): void {
    this.selectConnection(connId);
    if (this.isBrowser) {
      this.document.getElementById('map-study-desk')?.scrollIntoView({
        behavior: this.reducedMotion() ? 'auto' : 'smooth',
        block: 'nearest',
      });
    }
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
    this.showAllRecords.set(false);
    this.focusPoint(territory.point.x, territory.point.y, Math.max(this.view().k, 1.9));
    if (syncUrl) this.syncQueryParams();
  }

  private focusPoint(px: number, py: number, targetK: number): void {
    const k = Math.max(1, Math.min(8, targetK));
    const x = this.width / 2 - px * k;
    const y = this.height / 2 - py * k;
    this.setClampedView(x, y, k);
  }

  private setClampedView(x: number, y: number, k: number): void {
    if (k <= 1.01) {
      this.view.set({ x: 0, y: 0, k: 1 });
      return;
    }
    const minX = this.width * (1 - k) - 24;
    const minY = this.height * (1 - k) - 24;
    const clampedX = Math.max(minX, Math.min(24, x));
    const clampedY = Math.max(minY, Math.min(24, y));
    this.view.set({
      x: Math.round(clampedX * 10) / 10,
      y: Math.round(clampedY * 10) / 10,
      k: Math.round(k * 100) / 100,
    });
  }
}
