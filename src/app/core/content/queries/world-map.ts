import type { NetworkGraph } from '@core/content/models/content-artifacts';
import type {
  EntityKind,
  KnowledgeGraph,
  TemporalExtent,
} from '@core/content/models/content-schema';

import {
  type NetworkKindId,
  networkKindOfEntity,
  relationFamilies,
  type RelationFamilyId,
} from './knowledge-network';
import { classifyRelation } from './relation-category';
import { WORLD_MAP_ERA_PRESETS, type WorldMapEraPreset } from './world-map-eras';

export { WORLD_MAP_ERA_PRESETS, type WorldMapEraPreset };

export type WorldMapLayerId = 'country' | 'polity' | 'locality';

export interface WorldMapGeoFeature {
  readonly isoNumeric: string;
  readonly name: string;
  readonly cx: number;
  readonly cy: number;
  readonly lat?: number;
  readonly lon?: number;
}

export interface WorldMapPoint {
  readonly x: number;
  readonly y: number;
}

export interface WorldMapRegime {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly periodNote: string;
  readonly temporalExtent: TemporalExtent | null;
  readonly openEnded: boolean;
  readonly classifications: readonly {
    readonly label: string;
    readonly attribution: string;
    readonly edition: string;
    readonly limits: string;
  }[];
}

export interface WorldMapRecord {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly kind: EntityKind;
  readonly networkKind: NetworkKindId;
  readonly summary: string;
  readonly relationLabel: string;
  readonly relationFamily: RelationFamilyId;
  readonly temporalExtent: TemporalExtent | null;
  readonly startYear: number | null;
  readonly endYear: number | null;
  readonly dated: boolean;
}

export interface WorldMapTerritory {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly officialName: string | null;
  readonly territorialScope: string | null;
  readonly identityNote: string | null;
  readonly summary: string;
  readonly layer: WorldMapLayerId;
  readonly isoAlpha2: string | null;
  readonly isoNumeric: string | null;
  readonly coordinates: { readonly lat: number; readonly lon: number } | null;
  readonly point: WorldMapPoint;
  readonly memberEntityIds: readonly string[];
  readonly memberSlugs: readonly string[];
  readonly temporalExtent: TemporalExtent | null;
  readonly regimes: readonly WorldMapRegime[];
  readonly records: readonly WorldMapRecord[];
}

export interface WorldMapConnection {
  readonly id: string;
  readonly fromTerritoryId: string;
  readonly toTerritoryId: string;
  readonly fromSlug: string;
  readonly toSlug: string;
  readonly fromTitle: string;
  readonly toTitle: string;
  readonly family: RelationFamilyId;
  readonly directed: boolean;
  readonly label: string;
  readonly context: string;
  readonly viaEntity: {
    readonly id: string;
    readonly slug: string;
    readonly title: string;
    readonly kind: EntityKind;
  } | null;
  readonly temporalExtent: TemporalExtent | null;
  readonly dated: boolean;
  readonly path: string;
}

export interface WorldMapDecadeBin {
  readonly start: number;
  readonly end: number;
  readonly label: string;
  readonly count: number;
}

export interface WorldMapHotpoint {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly year: number;
  readonly yearFrom: number;
  readonly yearTo: number;
  readonly label: string;
  readonly territoryId: string;
  readonly territoryTitle: string;
  readonly focusLat: number;
  readonly focusLon: number;
  readonly weight: number;
}

export interface WorldMapModel {
  readonly width: number;
  readonly height: number;
  readonly territories: readonly WorldMapTerritory[];
  readonly connections: readonly WorldMapConnection[];
  readonly decadeBins: readonly WorldMapDecadeBin[];
  readonly hotpoints: readonly WorldMapHotpoint[];
  readonly minYear: number;
  readonly maxYear: number;
}

export interface WorldMapFilter {
  readonly yearFrom: number | null;
  readonly yearTo: number | null;
  readonly includeUndated: boolean;
  readonly families: ReadonlySet<RelationFamilyId> | null;
  readonly layers: ReadonlySet<WorldMapLayerId> | null;
}

export interface WorldMapFilteredTerritory {
  readonly territory: WorldMapTerritory;
  readonly activeRegimes: readonly WorldMapRegime[];
  readonly activeRecords: readonly WorldMapRecord[];
  readonly connectionCount: number;
  readonly activityCount: number;
}

export interface WorldMapFilteredState {
  readonly activeTerritories: readonly WorldMapFilteredTerritory[];
  readonly territoryMap: ReadonlyMap<string, WorldMapFilteredTerritory>;
  readonly activeConnections: readonly WorldMapConnection[];
  readonly familyCounts: Readonly<Record<RelationFamilyId, number>>;
  readonly layerCounts: Readonly<Record<WorldMapLayerId, number>>;
  readonly excludedUndatedRecords: number;
  readonly excludedUndatedConnections: number;
}

export interface WorldMapLabelPlacement {
  readonly territoryId: string;
  readonly title: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly priority: 'selected' | 'hovered' | 'active';
}

export const WORLD_MAP_WIDTH = 960;
export const WORLD_MAP_HEIGHT = 500;
const MAP_MARGIN = 14;
const MAX_NE_X = Math.PI * 0.8707;
const MAX_NE_Y = 1.422390506730596;

const round1 = (value: number): number => Math.round(value * 10) / 10;

/** Projects WGS84 coordinates into static SVG space with the Natural Earth I polynomial. */
export function projectNaturalEarth(
  lat: number,
  lon: number,
  width = WORLD_MAP_WIDTH,
  height = WORLD_MAP_HEIGHT,
): WorldMapPoint {
  const scale = Math.min(
    (width - 2 * MAP_MARGIN) / (2 * MAX_NE_X),
    (height - 2 * MAP_MARGIN) / (2 * MAX_NE_Y),
  );
  const clampedLat = Math.max(-89.9, Math.min(89.9, lat));
  const clampedLon = Math.max(-180, Math.min(180, lon));
  const lam = (clampedLon * Math.PI) / 180;
  const phi = (clampedLat * Math.PI) / 180;
  const phi2 = phi * phi;
  const phi4 = phi2 * phi2;
  const x =
    lam *
    (0.8707 + phi2 * (-0.131979 + phi2 * (-0.013791 + phi4 * phi2 * (0.003971 - 0.001529 * phi2))));
  const y =
    phi * (1.007226 + phi2 * (0.015085 + phi4 * (-0.044475 + phi2 * (0.028874 - 0.005916 * phi2))));
  return {
    x: round1(width / 2 + x * scale),
    y: round1(height / 2 - y * scale),
  };
}

/** Builds an arched quadratic Bézier SVG path between two projected points. */
export function buildWorldMapArc(
  from: WorldMapPoint,
  to: WorldMapPoint,
  height = WORLD_MAP_HEIGHT,
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return '';
  const lift = Math.min(82, Math.max(12, dist * 0.18));
  let nx = -dy / dist;
  let ny = dx / dist;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const cx = round1((from.x + to.x) / 2 + nx * lift);
  const cy = round1(Math.max(10, Math.min(height - 10, (from.y + to.y) / 2 + ny * lift)));
  return `M${from.x} ${from.y}Q${cx} ${cy} ${to.x} ${to.y}`;
}

function hasStrictYear(
  extent: { startYear: number | null; endYear: number | null } | null,
): boolean {
  return Boolean(extent && (extent.startYear !== null || extent.endYear !== null));
}

export function matchesTemporalExtent(
  extent: { readonly startYear: number | null; readonly endYear: number | null } | null,
  yearFrom: number | null,
  yearTo: number | null,
  options: { readonly includeUndated: boolean; readonly openEndedRegime?: boolean },
): { readonly matched: boolean; readonly excludedUndated: boolean } {
  if (yearFrom === null && yearTo === null) {
    return { matched: true, excludedUndated: false };
  }
  if (!extent || (extent.startYear === null && extent.endYear === null)) {
    return { matched: options.includeUndated, excludedUndated: !options.includeUndated };
  }
  const effectiveFrom = yearFrom ?? -100000;
  const effectiveTo = yearTo ?? 100000;
  const { startYear, endYear } = extent;
  if (startYear !== null && endYear !== null) {
    return {
      matched: startYear <= effectiveTo && endYear >= effectiveFrom,
      excludedUndated: false,
    };
  }
  if (startYear !== null && endYear === null) {
    const matched = options.openEndedRegime
      ? startYear <= effectiveTo
      : startYear >= effectiveFrom && startYear <= effectiveTo;
    return { matched, excludedUndated: false };
  }
  const singleEnd = endYear ?? 0;
  return {
    matched: singleEnd >= effectiveFrom && singleEnd <= effectiveTo,
    excludedUndated: false,
  };
}

function isNavigationRelation(type: string): boolean {
  return type === 'encyclopedic-link' || type === 'editorial-link';
}

function layerForPlace(entity: {
  id: string;
  kind: EntityKind;
  placeType?: 'place' | 'country' | 'regime';
  placeCategory?: string;
  isoNumeric?: string;
  coordinates?: { lat: number; lon: number };
  discoveryMetadata?: { description: string | null };
}): WorldMapLayerId | null {
  if (entity.kind !== 'place' || entity.placeType === 'regime') return null;
  if (entity.placeCategory === 'continent') return null;
  if (entity.isoNumeric) return 'country';
  const networkKind = networkKindOfEntity({
    id: entity.id,
    kind: entity.kind,
    placeType: entity.placeType,
    placeCategory: entity.placeCategory as
      'country' | 'state' | 'city' | 'region' | 'continent' | 'site' | 'other' | undefined,
    description: entity.discoveryMetadata?.description ?? undefined,
  });
  if (networkKind === 'polity' || entity.placeCategory === 'country') {
    return entity.coordinates ? 'polity' : null;
  }
  return entity.coordinates ? 'locality' : null;
}

/**
 * Compiles territories, constitutional regimes, anchored entities, and cross-border relations
 * from either the full KnowledgeGraph or the slim NetworkGraph used by `/grafos` and `/mapa`.
 */
export function buildWorldMapModel(
  graph: KnowledgeGraph | NetworkGraph,
  geoCountries: readonly WorldMapGeoFeature[] = [],
): WorldMapModel {
  const geoByIso = new Map(geoCountries.map((country) => [country.isoNumeric, country]));
  const allEntities = graph.atlases.flatMap((atlas) =>
    atlas.entities.filter(
      (entity) => entity.editorialStatus !== 'draft' && entity.scope !== 'fora',
    ),
  );
  const allRelations = graph.atlases.flatMap((atlas) => atlas.relations);
  const entityById = new Map(allEntities.map((entity) => [entity.id, entity]));

  const regimesByCountryEntityId = new Map<string, WorldMapRegime[]>();
  for (const entity of allEntities) {
    if (entity.kind !== 'place' || entity.placeType !== 'regime' || !entity.regimeProfile) continue;
    const regime: WorldMapRegime = {
      id: entity.id,
      slug: entity.slug,
      title: entity.title,
      periodNote: entity.regimeProfile.periodNote,
      temporalExtent: entity.temporalExtent,
      openEnded:
        entity.temporalExtent !== null &&
        entity.temporalExtent.startYear !== null &&
        entity.temporalExtent.endYear === null,
      classifications: entity.regimeProfile.classifications.map((item) => ({
        label: item.label,
        attribution: item.attribution,
        edition: item.edition,
        limits: item.limits,
      })),
    };
    for (const countryId of entity.regimeProfile.countryIds) {
      const list = regimesByCountryEntityId.get(countryId) ?? [];
      list.push(regime);
      regimesByCountryEntityId.set(countryId, list);
    }
  }

  interface TerritoryBucket {
    id: string;
    slug: string;
    title: string;
    officialName: string | null;
    territorialScope: string | null;
    identityNote: string | null;
    summary: string;
    layer: WorldMapLayerId;
    isoAlpha2: string | null;
    isoNumeric: string | null;
    coordinates: { lat: number; lon: number } | null;
    point: WorldMapPoint;
    memberEntityIds: string[];
    memberSlugs: string[];
    temporalExtent: TemporalExtent | null;
    regimes: WorldMapRegime[];
    recordMap: Map<string, WorldMapRecord>;
  }

  const bucketsByKey = new Map<string, TerritoryBucket>();
  const territoryKeyByEntityId = new Map<string, string>();

  const orderedPlaceEntities = [
    ...allEntities.filter((entity) => entity.kind === 'place' && Boolean(entity.isoNumeric)),
    ...allEntities.filter((entity) => entity.kind === 'place' && !entity.isoNumeric),
  ];

  for (const entity of orderedPlaceEntities) {
    if (entity.kind !== 'place') continue;
    const layer = layerForPlace(entity);
    if (!layer) continue;

    const isoNumeric = entity.isoNumeric ?? null;
    const geo = isoNumeric ? geoByIso.get(isoNumeric) : undefined;
    const explicitCoords = entity.coordinates ?? null;
    const geoCoords =
      geo?.lat !== undefined && geo?.lon !== undefined ? { lat: geo.lat, lon: geo.lon } : null;
    const coords = explicitCoords ?? geoCoords;
    const point = geo
      ? { x: round1(geo.cx), y: round1(geo.cy) }
      : explicitCoords
        ? projectNaturalEarth(explicitCoords.lat, explicitCoords.lon)
        : null;
    if (!point) continue;

    // O grafo mantém um só registro por país; só entidades com o mesmo ISO se unem.
    const key = isoNumeric ? `iso:${isoNumeric}` : `entity:${entity.id}`;
    territoryKeyByEntityId.set(entity.id, key);
    const attachedRegimes = regimesByCountryEntityId.get(entity.id) ?? [];

    const existing = bucketsByKey.get(key);
    if (existing) {
      existing.memberEntityIds.push(entity.id);
      existing.memberSlugs.push(entity.slug);
      if (entity.countryProfile && !existing.officialName) {
        existing.officialName = entity.countryProfile.officialName;
        existing.territorialScope = entity.countryProfile.territorialScope;
        existing.identityNote = entity.countryProfile.identityNote;
      }
      if (entity.summary.length > existing.summary.length) existing.summary = entity.summary;
      if (entity.isoAlpha2 && !existing.isoAlpha2) existing.isoAlpha2 = entity.isoAlpha2;
      if (explicitCoords || (coords && !existing.coordinates)) existing.coordinates = coords;
      for (const regime of attachedRegimes) {
        if (!existing.regimes.some((item) => item.id === regime.id)) existing.regimes.push(regime);
      }
      continue;
    }

    bucketsByKey.set(key, {
      id: entity.id,
      slug: entity.slug,
      title: entity.title,
      officialName: entity.countryProfile?.officialName ?? null,
      territorialScope: entity.countryProfile?.territorialScope ?? null,
      identityNote: entity.countryProfile?.identityNote ?? null,
      summary: entity.summary,
      layer,
      isoAlpha2: entity.isoAlpha2 ?? null,
      isoNumeric,
      coordinates: coords,
      point,
      memberEntityIds: [entity.id],
      memberSlugs: [entity.slug],
      temporalExtent: entity.temporalExtent,
      regimes: [...attachedRegimes],
      recordMap: new Map(),
    });
  }

  const bucketByTerritoryId = new Map<string, TerritoryBucket>();
  const territoryIdByEntityId = new Map<string, string>();
  for (const bucket of bucketsByKey.values()) {
    bucketByTerritoryId.set(bucket.id, bucket);
    for (const memberId of bucket.memberEntityIds) {
      territoryIdByEntityId.set(memberId, bucket.id);
    }
  }

  // Anchor non-place records to territories via semantic relations.
  const entityTerritoryAnchors = new Map<string, string[]>();
  const semanticRelations: {
    relation: (typeof allRelations)[number];
    family: RelationFamilyId;
    fromId: string;
    toId: string;
  }[] = [];

  for (const relation of allRelations) {
    if (isNavigationRelation(relation.type)) continue;
    const fromEntity = entityById.get(relation.fromEntityId);
    const toEntity = entityById.get(relation.toEntityId);
    if (!fromEntity || !toEntity) continue;

    const category = classifyRelation(relation);
    // Records stay anchored to their territory even when the edge itself is omitted.
    const family: RelationFamilyId = category?.family ?? 'location';
    if (category) {
      const effectiveFromId = category.reverse ? relation.toEntityId : relation.fromEntityId;
      const effectiveToId = category.reverse ? relation.fromEntityId : relation.toEntityId;
      semanticRelations.push({ relation, family, fromId: effectiveFromId, toId: effectiveToId });
    }

    const fromTerritoryId = territoryIdByEntityId.get(relation.fromEntityId);
    const toTerritoryId = territoryIdByEntityId.get(relation.toEntityId);

    const anchorRecord = (
      territoryId: string,
      otherEntity: (typeof allEntities)[number],
      relationLabel: string,
    ) => {
      if (otherEntity.kind === 'place') return;
      const bucket = bucketByTerritoryId.get(territoryId);
      if (!bucket) return;
      if (!bucket.recordMap.has(otherEntity.id)) {
        const networkKind = networkKindOfEntity({
          id: otherEntity.id,
          kind: otherEntity.kind,
          description: otherEntity.discoveryMetadata?.description ?? undefined,
        });
        const ext = relation.temporalExtent ?? otherEntity.temporalExtent ?? null;
        bucket.recordMap.set(otherEntity.id, {
          id: otherEntity.id,
          slug: otherEntity.slug,
          title: otherEntity.title,
          kind: otherEntity.kind,
          networkKind,
          summary: otherEntity.summary,
          relationLabel,
          relationFamily: family,
          temporalExtent: ext,
          startYear: ext?.startYear ?? null,
          endYear: ext?.endYear ?? null,
          dated: hasStrictYear(ext),
        });
      }
      const list = entityTerritoryAnchors.get(otherEntity.id) ?? [];
      if (!list.includes(territoryId)) {
        list.push(territoryId);
        entityTerritoryAnchors.set(otherEntity.id, list);
      }
    };

    if (fromTerritoryId && !toTerritoryId) {
      anchorRecord(fromTerritoryId, toEntity, relation.reverseLabel);
    } else if (toTerritoryId && !fromTerritoryId) {
      anchorRecord(toTerritoryId, fromEntity, relation.label);
    }
  }

  const connectionByKey = new Map<string, WorldMapConnection>();

  const registerConnection = (entry: {
    id: string;
    fromTerritoryId: string;
    toTerritoryId: string;
    family: RelationFamilyId;
    directed: boolean;
    label: string;
    context: string;
    viaEntity: { id: string; slug: string; title: string; kind: EntityKind } | null;
    temporalExtent: TemporalExtent | null;
  }) => {
    if (entry.fromTerritoryId === entry.toTerritoryId) return;
    const fromBucket = bucketByTerritoryId.get(entry.fromTerritoryId);
    const toBucket = bucketByTerritoryId.get(entry.toTerritoryId);
    if (!fromBucket || !toBucket) return;

    const path = buildWorldMapArc(fromBucket.point, toBucket.point);
    if (!path) return;
    const pairKey = [
      entry.fromTerritoryId,
      entry.toTerritoryId,
      entry.family,
      entry.viaEntity?.id ?? entry.label,
    ].join('|');
    if (connectionByKey.has(pairKey)) return;

    connectionByKey.set(pairKey, {
      id: entry.id,
      fromTerritoryId: fromBucket.id,
      toTerritoryId: toBucket.id,
      fromSlug: fromBucket.slug,
      toSlug: toBucket.slug,
      fromTitle: fromBucket.title,
      toTitle: toBucket.title,
      family: entry.family,
      directed: entry.directed,
      label: entry.label,
      context: entry.context,
      viaEntity: entry.viaEntity,
      temporalExtent: entry.temporalExtent,
      dated: hasStrictYear(entry.temporalExtent),
      path,
    });
  };

  const directedFamilySet = new Set(
    relationFamilies.filter((item) => item.directed).map((item) => item.id),
  );

  // 1) Direct territory <-> territory relations
  for (const { relation, family, fromId, toId } of semanticRelations) {
    const fromTerritoryId = territoryIdByEntityId.get(fromId);
    const toTerritoryId = territoryIdByEntityId.get(toId);
    if (!fromTerritoryId || !toTerritoryId || fromTerritoryId === toTerritoryId) continue;
    registerConnection({
      id: relation.id,
      fromTerritoryId,
      toTerritoryId,
      family,
      directed: directedFamilySet.has(family),
      label: relation.label,
      context: relation.context,
      viaEntity: null,
      temporalExtent: relation.temporalExtent ?? null,
    });
  }

  // 2) Cross-territory 1-hop entity relations (A anchored in T1 -> B anchored in T2)
  for (const { relation, family, fromId, toId } of semanticRelations) {
    const fromTerritoryDirect = territoryIdByEntityId.get(fromId);
    const toTerritoryDirect = territoryIdByEntityId.get(toId);
    if (fromTerritoryDirect || toTerritoryDirect) continue;
    const anchorsA = entityTerritoryAnchors.get(fromId) ?? [];
    const anchorsB = entityTerritoryAnchors.get(toId) ?? [];
    if (anchorsA.length !== 1 || anchorsB.length !== 1 || anchorsA[0] === anchorsB[0]) continue;
    const fromEntity = entityById.get(fromId);
    const toEntity = entityById.get(toId);
    if (!fromEntity || !toEntity) continue;
    registerConnection({
      id: `bridge-${relation.id}`,
      fromTerritoryId: anchorsA[0],
      toTerritoryId: anchorsB[0],
      family,
      directed: directedFamilySet.has(family),
      label: `${fromEntity.title} ${relation.label} ${toEntity.title}`,
      context: relation.context,
      viaEntity: {
        id: fromEntity.id,
        slug: fromEntity.slug,
        title: fromEntity.title,
        kind: fromEntity.kind,
      },
      temporalExtent:
        relation.temporalExtent ?? fromEntity.temporalExtent ?? toEntity.temporalExtent ?? null,
    });
  }

  // 3) Shared historical events / institutions / parties spanning 2..6 territories (avoid global hub explosion)
  const hubKinds = new Set<EntityKind>(['event', 'party', 'institution', 'ideology']);
  for (const [entityId, anchoredTerritories] of entityTerritoryAnchors.entries()) {
    const hub = entityById.get(entityId);
    if (!hub || !hubKinds.has(hub.kind)) continue;
    if (anchoredTerritories.length < 2 || anchoredTerritories.length > 6) continue;
    for (let i = 0; i < anchoredTerritories.length; i++) {
      for (let j = i + 1; j < anchoredTerritories.length; j++) {
        const leftId = anchoredTerritories[i];
        const rightId = anchoredTerritories[j];
        registerConnection({
          id: `hub-${hub.id}-${leftId}-${rightId}`,
          fromTerritoryId: leftId,
          toTerritoryId: rightId,
          family: 'participation',
          directed: false,
          label: `Vínculo em ${hub.title}`,
          context: hub.summary,
          viaEntity: {
            id: hub.id,
            slug: hub.slug,
            title: hub.title,
            kind: hub.kind,
          },
          temporalExtent: hub.temporalExtent ?? null,
        });
      }
    }
  }

  const territories: WorldMapTerritory[] = [...bucketsByKey.values()]
    .map((bucket) => ({
      id: bucket.id,
      slug: bucket.slug,
      title: bucket.title,
      officialName: bucket.officialName,
      territorialScope: bucket.territorialScope,
      identityNote: bucket.identityNote,
      summary: bucket.summary,
      layer: bucket.layer,
      isoAlpha2: bucket.isoAlpha2,
      isoNumeric: bucket.isoNumeric,
      coordinates: bucket.coordinates,
      point: bucket.point,
      memberEntityIds: bucket.memberEntityIds,
      memberSlugs: bucket.memberSlugs,
      temporalExtent: bucket.temporalExtent,
      regimes: bucket.regimes,
      records: [...bucket.recordMap.values()].sort((a, b) => {
        const ya = a.startYear ?? 99999;
        const yb = b.startYear ?? 99999;
        return ya - yb || a.title.localeCompare(b.title, 'pt');
      }),
    }))
    .sort((a, b) => b.records.length - a.records.length || a.title.localeCompare(b.title, 'pt'));

  const connections = [...connectionByKey.values()];

  const decadeStartMin = 1750;
  const decadeStartMax = 2020;
  const decadeBins: WorldMapDecadeBin[] = [];
  for (let start = decadeStartMin; start <= decadeStartMax; start += 10) {
    const end = start + 9;
    let count = 0;
    for (const territory of territories) {
      for (const rec of territory.records) {
        if (!rec.dated) continue;
        if (
          matchesTemporalExtent(rec.temporalExtent, start, end, { includeUndated: false }).matched
        ) {
          count += 1;
        }
      }
    }
    for (const conn of connections) {
      if (!conn.dated) continue;
      if (
        matchesTemporalExtent(conn.temporalExtent, start, end, { includeUndated: false }).matched
      ) {
        count += 1;
      }
    }
    decadeBins.push({ start, end, label: `${start}`, count });
  }

  const minYear = decadeStartMin;
  const maxYear = 2026;
  const hotpoints = buildTimelineHotpoints({
    allEntities,
    semanticRelations,
    territories,
    territoryIdByEntityId,
    entityTerritoryAnchors,
    minYear,
    maxYear,
  });

  return {
    width: WORLD_MAP_WIDTH,
    height: WORLD_MAP_HEIGHT,
    territories,
    connections,
    decadeBins,
    hotpoints,
    minYear,
    maxYear,
  };
}

function normalizeFold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const LAYER_RANK: Readonly<Record<WorldMapLayerId, number>> = {
  country: 3,
  polity: 2,
  locality: 1,
};

function buildTimelineHotpoints(input: {
  readonly allEntities: readonly (
    | KnowledgeGraph['atlases'][number]['entities'][number]
    | NetworkGraph['atlases'][number]['entities'][number]
  )[];
  readonly semanticRelations: readonly {
    readonly fromId: string;
    readonly toId: string;
  }[];
  readonly territories: readonly WorldMapTerritory[];
  readonly territoryIdByEntityId: ReadonlyMap<string, string>;
  readonly entityTerritoryAnchors: ReadonlyMap<string, readonly string[]>;
  readonly minYear: number;
  readonly maxYear: number;
}): WorldMapHotpoint[] {
  const territoryById = new Map(input.territories.map((item) => [item.id, item]));
  const degreeById = new Map<string, number>();
  for (const rel of input.semanticRelations) {
    degreeById.set(rel.fromId, (degreeById.get(rel.fromId) ?? 0) + 1);
    degreeById.set(rel.toId, (degreeById.get(rel.toId) ?? 0) + 1);
  }

  const candidates: (WorldMapHotpoint & { readonly isBrazilFocus: boolean })[] = [];

  for (const entity of input.allEntities) {
    const isEvent = entity.kind === 'event';
    const isRegime = entity.kind === 'place' && entity.placeType === 'regime';
    if (!isEvent && !isRegime) continue;

    const ext = entity.temporalExtent;
    if (!ext || ext.startYear === null) continue;
    const year = ext.startYear;
    if (year < input.minYear || year > input.maxYear) continue;

    const candidateTerritoryIds = new Set<string>();
    for (const tid of input.entityTerritoryAnchors.get(entity.id) ?? []) {
      candidateTerritoryIds.add(tid);
    }
    if (isRegime && entity.regimeProfile?.countryIds) {
      for (const cid of entity.regimeProfile.countryIds) {
        const tid = input.territoryIdByEntityId.get(cid);
        if (tid) candidateTerritoryIds.add(tid);
      }
    }

    const anchoredWithCoords = [...candidateTerritoryIds]
      .map((tid) => territoryById.get(tid))
      .filter((t): t is WorldMapTerritory & { coordinates: { lat: number; lon: number } } =>
        Boolean(t && t.coordinates),
      );
    if (anchoredWithCoords.length === 0) continue;

    const normEntityTitle = normalizeFold(entity.title);
    anchoredWithCoords.sort((a, b) => {
      const aNorm = normalizeFold(a.title);
      const bNorm = normalizeFold(b.title);
      const aIdx = normEntityTitle.indexOf(aNorm);
      const bIdx = normEntityTitle.indexOf(bNorm);
      const aMatch = aIdx >= 0 ? 1 : 0;
      const bMatch = bIdx >= 0 ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      if (aMatch && bMatch && aIdx !== bIdx) return aIdx - bIdx;
      const recordDiff = b.records.length - a.records.length;
      if (recordDiff !== 0) return recordDiff;
      const layerDiff = LAYER_RANK[b.layer] - LAYER_RANK[a.layer];
      if (layerDiff !== 0) return layerDiff;
      return a.title.localeCompare(b.title, 'pt');
    });

    const focal = anchoredWithCoords[0];
    const yearFrom = year;
    const yearTo =
      ext.endYear !== null && ext.endYear >= year
        ? Math.min(input.maxYear, ext.endYear)
        : Math.min(input.maxYear, year + 4);
    const label =
      ext.endYear !== null && ext.endYear !== year ? `${year}–${ext.endYear}` : String(year);
    const degree = degreeById.get(entity.id) ?? 0;
    const weight = degree + anchoredWithCoords.length;
    const isBrazilFocus =
      focal.slug === 'brasil' ||
      normEntityTitle.includes('brasil') ||
      normEntityTitle.includes('paraguai');

    candidates.push({
      id: entity.id,
      slug: entity.slug,
      title: entity.title,
      year,
      yearFrom,
      yearTo,
      label,
      territoryId: focal.id,
      territoryTitle: focal.title,
      focusLat: focal.coordinates.lat,
      focusLon: focal.coordinates.lon,
      weight,
      isBrazilFocus,
    });
  }

  candidates.sort(
    (a, b) => b.weight - a.weight || a.year - b.year || a.title.localeCompare(b.title, 'pt'),
  );

  const selected: WorldMapHotpoint[] = [];
  const usedIds = new Set<string>();
  const minGapYears = 12;
  const maxHotpoints = 12;

  const canPlace = (cand: WorldMapHotpoint): boolean =>
    !usedIds.has(cand.id) &&
    selected.every((item) => Math.abs(item.year - cand.year) >= minGapYears);

  const pushHotpoint = (cand: WorldMapHotpoint & { isBrazilFocus: boolean }) => {
    selected.push({
      id: cand.id,
      slug: cand.slug,
      title: cand.title,
      year: cand.year,
      yearFrom: cand.yearFrom,
      yearTo: cand.yearTo,
      label: cand.label,
      territoryId: cand.territoryId,
      territoryTitle: cand.territoryTitle,
      focusLat: cand.focusLat,
      focusLon: cand.focusLon,
      weight: cand.weight,
    });
    usedIds.add(cand.id);
  };

  let brazilPicked = 0;
  for (const cand of candidates) {
    if (!cand.isBrazilFocus || brazilPicked >= 3) continue;
    if (!canPlace(cand)) continue;
    pushHotpoint(cand);
    brazilPicked += 1;
  }

  for (const cand of candidates) {
    if (selected.length >= maxHotpoints) break;
    if (!canPlace(cand)) continue;
    pushHotpoint(cand);
  }

  selected.sort((a, b) => a.year - b.year || b.weight - a.weight);
  return selected;
}

/** Filters territories, regimes, anchored records, and arcs strictly by temporalExtent & cues. */
export function filterWorldMap(
  model: WorldMapModel,
  filter: WorldMapFilter,
): WorldMapFilteredState {
  const layers = filter.layers;
  const families = filter.families;
  let excludedUndatedRecords = 0;
  let excludedUndatedConnections = 0;

  const familyCounts: Record<RelationFamilyId, number> = {
    influenced: 0,
    rupture: 0,
    participation: 0,
    creation: 0,
    continuity: 0,
    affiliation: 0,
    location: 0,
  };
  const layerCounts: Record<WorldMapLayerId, number> = {
    country: 0,
    polity: 0,
    locality: 0,
  };

  const visibleTerritories = new Map<string, WorldMapTerritory>();
  const territoryDrafts = new Map<
    string,
    {
      territory: WorldMapTerritory;
      activeRegimes: WorldMapRegime[];
      activeRecords: WorldMapRecord[];
      connectionCount: number;
    }
  >();

  for (const territory of model.territories) {
    if (layers && layers.size > 0 && !layers.has(territory.layer)) continue;

    // Dissolved historical polities with strict temporalExtent only show up in matching eras.
    if (territory.layer === 'polity' && territory.temporalExtent) {
      const check = matchesTemporalExtent(
        territory.temporalExtent,
        filter.yearFrom,
        filter.yearTo,
        { includeUndated: true },
      );
      if (!check.matched) continue;
    }

    const activeRegimes: WorldMapRegime[] = [];
    for (const regime of territory.regimes) {
      const check = matchesTemporalExtent(regime.temporalExtent, filter.yearFrom, filter.yearTo, {
        includeUndated: filter.includeUndated,
        openEndedRegime: regime.openEnded,
      });
      if (check.matched) activeRegimes.push(regime);
    }

    const activeRecords: WorldMapRecord[] = [];
    for (const record of territory.records) {
      const check = matchesTemporalExtent(record.temporalExtent, filter.yearFrom, filter.yearTo, {
        includeUndated: filter.includeUndated,
      });
      if (check.matched) activeRecords.push(record);
      else if (check.excludedUndated) excludedUndatedRecords += 1;
    }

    visibleTerritories.set(territory.id, territory);
    layerCounts[territory.layer] += 1;
    territoryDrafts.set(territory.id, {
      territory,
      activeRegimes,
      activeRecords,
      connectionCount: 0,
    });
  }

  const activeConnections: WorldMapConnection[] = [];
  for (const conn of model.connections) {
    if (
      !visibleTerritories.has(conn.fromTerritoryId) ||
      !visibleTerritories.has(conn.toTerritoryId)
    ) {
      continue;
    }
    const timeCheck = matchesTemporalExtent(conn.temporalExtent, filter.yearFrom, filter.yearTo, {
      includeUndated: filter.includeUndated,
    });
    if (!timeCheck.matched) {
      if (timeCheck.excludedUndated) excludedUndatedConnections += 1;
      continue;
    }
    familyCounts[conn.family] += 1;
    if (families && families.size > 0 && !families.has(conn.family)) continue;
    activeConnections.push(conn);

    const fromDraft = territoryDrafts.get(conn.fromTerritoryId);
    const toDraft = territoryDrafts.get(conn.toTerritoryId);
    if (fromDraft) fromDraft.connectionCount += 1;
    if (toDraft) toDraft.connectionCount += 1;
  }

  const activeTerritories: WorldMapFilteredTerritory[] = [...territoryDrafts.values()]
    .map((draft) => ({
      territory: draft.territory,
      activeRegimes: draft.activeRegimes,
      activeRecords: draft.activeRecords,
      connectionCount: draft.connectionCount,
      activityCount:
        draft.activeRecords.length + draft.activeRegimes.length + draft.connectionCount,
    }))
    .sort(
      (a, b) =>
        b.activityCount - a.activityCount ||
        a.territory.title.localeCompare(b.territory.title, 'pt'),
    );

  const territoryMap = new Map(activeTerritories.map((item) => [item.territory.id, item]));

  return {
    activeTerritories,
    territoryMap,
    activeConnections,
    familyCounts,
    layerCounts,
    excludedUndatedRecords,
    excludedUndatedConnections,
  };
}

/** Places collision-free labels inside the visible SVG frame so no panel can obscure them. */
export function placeMapLabels(
  territories: readonly WorldMapFilteredTerritory[],
  options: {
    readonly selectedTerritoryId: string | null;
    readonly hoveredTerritoryId: string | null;
    readonly highlightedIds: ReadonlySet<string> | null;
    readonly view: { readonly x: number; readonly y: number; readonly k: number };
    readonly width?: number;
    readonly height?: number;
    readonly maxLabels?: number;
  },
): WorldMapLabelPlacement[] {
  const width = options.width ?? WORLD_MAP_WIDTH;
  const height = options.height ?? WORLD_MAP_HEIGHT;
  const maxLabels = options.maxLabels ?? 18;
  const candidates: {
    entry: WorldMapFilteredTerritory;
    screenX: number;
    screenY: number;
    priority: 'selected' | 'hovered' | 'active';
    score: number;
  }[] = [];

  for (const entry of territories) {
    const id = entry.territory.id;
    const isSelected = id === options.selectedTerritoryId;
    const isHovered = id === options.hoveredTerritoryId;
    const isHighlighted = options.highlightedIds?.has(id) ?? false;
    if (!isSelected && !isHovered && !isHighlighted && entry.activityCount === 0) continue;

    const screenX = entry.territory.point.x * options.view.k + options.view.x;
    const screenY = entry.territory.point.y * options.view.k + options.view.y;
    if (screenX < 28 || screenX > width - 28 || screenY < 22 || screenY > height - 42) continue;

    const priority: 'selected' | 'hovered' | 'active' = isSelected
      ? 'selected'
      : isHovered
        ? 'hovered'
        : 'active';
    const score =
      (isSelected ? 100000 : 0) +
      (isHovered ? 50000 : 0) +
      (isHighlighted ? 5000 : 0) +
      entry.activityCount * 10 +
      (entry.territory.layer === 'country' ? 5 : 0);
    candidates.push({ entry, screenX, screenY, priority, score });
  }

  candidates.sort((a, b) => b.score - a.score);

  const placed: WorldMapLabelPlacement[] = [];
  for (const cand of candidates) {
    if (placed.length >= maxLabels && cand.priority === 'active') break;
    const text = cand.entry.territory.title;
    const boxWidth = Math.min(148, Math.max(46, text.length * 6.5 + 14));
    const boxHeight = 18;
    const x = Math.max(8, Math.min(width - boxWidth - 8, cand.screenX - boxWidth / 2));
    const y = Math.max(8, Math.min(height - boxHeight - 36, cand.screenY - 22));

    const overlaps = placed.some(
      (other) =>
        x < other.x + other.width + 4 &&
        x + boxWidth + 4 > other.x &&
        y < other.y + other.height + 3 &&
        y + boxHeight + 3 > other.y,
    );
    if (overlaps && cand.priority === 'active') continue;

    placed.push({
      territoryId: cand.entry.territory.id,
      title: text,
      x: round1(x),
      y: round1(y),
      width: round1(boxWidth),
      height: boxHeight,
      priority: cand.priority,
    });
  }

  return placed;
}

/** Picks an evidence-rich territory + era pair for the "Surpreenda-me" exploratory button. */
export function pickSurpriseCandidate(
  model: WorldMapModel,
  currentTerritoryId: string | null = null,
): {
  territoryId: string;
  presetId: string;
  yearFrom: number | null;
  yearTo: number | null;
} | null {
  const datedPresets = WORLD_MAP_ERA_PRESETS.filter((preset) => preset.id !== 'all');
  const candidates: {
    territoryId: string;
    presetId: string;
    yearFrom: number | null;
    yearTo: number | null;
    score: number;
  }[] = [];

  for (const preset of datedPresets) {
    const filtered = filterWorldMap(model, {
      yearFrom: preset.yearFrom,
      yearTo: preset.yearTo,
      includeUndated: false,
      families: null,
      layers: null,
    });
    for (const item of filtered.activeTerritories) {
      if (item.territory.id === currentTerritoryId) continue;
      if (item.activeRecords.length + item.connectionCount < 2) continue;
      candidates.push({
        territoryId: item.territory.id,
        presetId: preset.id,
        yearFrom: preset.yearFrom,
        yearTo: preset.yearTo,
        score: item.activeRecords.length + item.connectionCount * 2 + item.activeRegimes.length * 3,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const pool = candidates.slice(0, Math.min(8, candidates.length));
  if (pool.length) {
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    return {
      territoryId: chosen.territoryId,
      presetId: chosen.presetId,
      yearFrom: chosen.yearFrom,
      yearTo: chosen.yearTo,
    };
  }
  const fallback =
    model.territories.find((item) => item.id !== currentTerritoryId) ?? model.territories[0];
  return fallback
    ? { territoryId: fallback.id, presetId: 'all', yearFrom: null, yearTo: null }
    : null;
}

/** Resolves query parameters for linking from `/verbete/:slug` directly to `/mapa`. */
export function mapQueryParamsForEntity(
  entity: {
    readonly id: string;
    readonly slug: string;
    readonly kind: EntityKind;
    readonly placeType?: 'place' | 'country' | 'regime';
    readonly placeCategory?: string;
    readonly isoNumeric?: string;
    readonly coordinates?: { readonly lat: number; readonly lon: number };
    readonly temporalExtent: TemporalExtent | null;
    readonly regimeProfile?: { readonly countryIds: readonly string[] };
  },
  graph: KnowledgeGraph | NetworkGraph,
): Record<string, string> | null {
  type AnyEntity =
    | KnowledgeGraph['atlases'][number]['entities'][number]
    | NetworkGraph['atlases'][number]['entities'][number];

  if (entity.kind === 'place') {
    if (entity.placeType === 'regime' && entity.regimeProfile?.countryIds.length) {
      const targetId = entity.regimeProfile.countryIds[0];
      let country: AnyEntity | undefined;
      for (const atlas of graph.atlases) {
        const match = atlas.entities.find((item) => item.id === targetId);
        if (match) {
          country = match;
          break;
        }
      }
      if (country) {
        const params: Record<string, string> = { pais: country.slug };
        if (
          entity.temporalExtent?.startYear !== null &&
          entity.temporalExtent?.startYear !== undefined
        ) {
          params['ano'] = String(entity.temporalExtent.startYear);
        }
        return params;
      }
    }
    if (entity.isoNumeric || entity.placeCategory === 'country' || entity.placeType === 'country') {
      if (entity.isoNumeric || entity.coordinates) return { pais: entity.slug };
    }
    if (entity.coordinates) return { entidade: entity.slug };
  }

  const placeById = new Map<string, AnyEntity>();
  for (const atlas of graph.atlases) {
    for (const item of atlas.entities) {
      if (item.kind === 'place' && item.placeType !== 'regime') {
        placeById.set(item.id, item);
      }
    }
  }

  for (const atlas of graph.atlases) {
    for (const rel of atlas.relations) {
      if (isNavigationRelation(rel.type)) continue;
      const candidateId =
        rel.fromEntityId === entity.id
          ? rel.toEntityId
          : rel.toEntityId === entity.id
            ? rel.fromEntityId
            : null;
      if (!candidateId) continue;
      const target = placeById.get(candidateId);
      if (target && target.kind === 'place' && (target.isoNumeric || target.coordinates)) {
        const params: Record<string, string> = { entidade: entity.slug };
        if (
          entity.temporalExtent?.startYear !== null &&
          entity.temporalExtent?.startYear !== undefined
        ) {
          params['ano'] = String(entity.temporalExtent.startYear);
        }
        return params;
      }
    }
  }

  return null;
}
