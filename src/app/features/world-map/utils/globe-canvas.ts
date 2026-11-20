import type { RelationFamilyId } from '@core/content/queries/knowledge-network';
import type { WorldMapConnection, WorldMapTerritory } from '@core/content/queries/world-map';

import {
  clipRingToHorizon,
  type GlobeCamera,
  type GlobeScreenPoint,
  type HitTestCountryPolygon,
  projectGeodesicArc,
  projectPoint,
  toUnitVector,
  type Vec3,
} from './globe-projection';

export interface RawGlobeCountry {
  readonly isoNumeric: string;
  readonly name: string;
  readonly lat: number;
  readonly lon: number;
  readonly cx: number;
  readonly cy: number;
  readonly bbox: readonly [number, number, number, number];
  readonly rings: readonly string[];
}

export interface GlobePreparedCountry {
  readonly isoNumeric: string;
  readonly name: string;
  readonly centroidVec: Vec3;
  readonly bbox: readonly [number, number, number, number];
  readonly spanDeg: number;
  readonly packedRings: readonly Float32Array[];
  readonly ringsDeg: readonly (readonly (readonly [number, number])[])[];
}

export interface GlobePreparedAtlas {
  readonly countries: readonly GlobePreparedCountry[];
  readonly hitPolygons: readonly HitTestCountryPolygon[];
}

export interface GlobeTerritoryVisualState {
  readonly territory: WorldMapTerritory;
  readonly active: boolean;
  readonly activityCount: number;
  readonly unitVec: Vec3;
}

export interface GlobeHitConnection {
  readonly connection: WorldMapConnection;
  readonly segments: readonly (readonly GlobeScreenPoint[])[];
}

export interface GlobeRenderState {
  readonly camera: GlobeCamera;
  readonly width: number;
  readonly height: number;
  readonly zoomFactor: number;
  readonly interactableIsos: ReadonlySet<string>;
  readonly activeIsos: ReadonlySet<string>;
  readonly activityByIso: ReadonlyMap<string, number>;
  readonly selectedIso: string | null;
  readonly hoveredIso: string | null;
  readonly highlightedTerritoryIds: ReadonlySet<string> | null;
  readonly highlightedIsos: ReadonlySet<string> | null;
  readonly neighborTerritoryIds: ReadonlySet<string> | null;
  readonly neighborIsos: ReadonlySet<string> | null;
  readonly connections: readonly WorldMapConnection[];
  readonly territoryById: ReadonlyMap<string, WorldMapTerritory>;
  readonly territoryUnitVecs: ReadonlyMap<string, Vec3>;
  readonly markerTerritories: readonly GlobeTerritoryVisualState[];
  readonly matchedCountryDots: readonly GlobeTerritoryVisualState[];
  readonly selectedTerritoryId: string | null;
  readonly hoveredTerritoryId: string | null;
  readonly selectedConnectionId: string | null;
  readonly hoveredConnectionId: string | null;
  readonly hoveredFamilyId: RelationFamilyId | null;
  readonly familyColors: Readonly<Record<RelationFamilyId, string>>;
  readonly familyDash: Readonly<Record<RelationFamilyId, readonly number[]>>;
}

const DEG_TO_RAD = Math.PI / 180;

function parseEncodedRing(encoded: string): [number, number][] {
  const parts = encoded.split(';');
  const ring: [number, number][] = [];
  for (const part of parts) {
    const comma = part.indexOf(',');
    if (comma <= 0) continue;
    const lon = Number(part.slice(0, comma));
    const lat = Number(part.slice(comma + 1));
    if (Number.isFinite(lon) && Number.isFinite(lat)) {
      ring.push([lon, lat]);
    }
  }
  return ring;
}

function packDegRingToUnitVecs(ring: readonly (readonly [number, number])[]): Float32Array {
  const out = new Float32Array(ring.length * 3);
  for (let i = 0; i < ring.length; i++) {
    const vec = toUnitVector(ring[i][1], ring[i][0]);
    const base = i * 3;
    out[base] = vec.x;
    out[base + 1] = vec.y;
    out[base + 2] = vec.z;
  }
  return out;
}

/** Decodes packed Natural Earth 1:50m country rings into unit-sphere Float32Arrays once per session. */
export function prepareGlobeAtlas(rawCountries: readonly RawGlobeCountry[]): GlobePreparedAtlas {
  const countries: GlobePreparedCountry[] = [];
  const hitPolygons: HitTestCountryPolygon[] = [];

  for (const raw of rawCountries) {
    const ringsDeg: [number, number][][] = [];
    const packedRings: Float32Array[] = [];
    for (const encoded of raw.rings) {
      const parsed = parseEncodedRing(encoded);
      if (parsed.length < 3) continue;
      ringsDeg.push(parsed);
      packedRings.push(packDegRingToUnitVecs(parsed));
    }
    if (packedRings.length === 0) continue;

    const spanDeg = Math.max(raw.bbox[2] - raw.bbox[0], raw.bbox[3] - raw.bbox[1]);
    countries.push({
      isoNumeric: raw.isoNumeric,
      name: raw.name,
      centroidVec: toUnitVector(raw.lat, raw.lon),
      bbox: raw.bbox,
      spanDeg,
      packedRings,
      ringsDeg,
    });
    hitPolygons.push({
      isoNumeric: raw.isoNumeric,
      bbox: raw.bbox,
      rings: ringsDeg,
    });
  }

  return { countries, hitPolygons };
}

function drawGraticule(ctx: CanvasRenderingContext2D, cam: GlobeCamera, zoomFactor: number): void {
  const stepDeg = zoomFactor > 1.8 ? 15 : 30;
  const sampleDeg = 4;

  const drawCurve = (
    latFn: (i: number) => [number, number],
    count: number,
    emphasized: boolean,
  ) => {
    ctx.beginPath();
    let drawing = false;
    for (let i = 0; i <= count; i++) {
      const [lat, lon] = latFn(i);
      const pt = projectPoint(toUnitVector(lat, lon), cam);
      if (pt.z >= -0.01) {
        if (!drawing) {
          ctx.moveTo(pt.x, pt.y);
          drawing = true;
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      } else {
        drawing = false;
      }
    }
    ctx.strokeStyle = emphasized ? 'rgba(119, 114, 104, 0.42)' : 'rgba(166, 158, 141, 0.36)';
    ctx.lineWidth = emphasized ? 0.9 : 0.65;
    ctx.setLineDash(emphasized ? [4, 4] : []);
    ctx.stroke();
  };

  for (let lat = -75; lat <= 75; lat += stepDeg) {
    const steps = Math.round(360 / sampleDeg);
    drawCurve((i) => [lat, -180 + i * sampleDeg], steps, lat === 0);
  }
  for (let lon = -180; lon < 180; lon += stepDeg) {
    const steps = Math.round(170 / sampleDeg);
    drawCurve((i) => [-85 + i * sampleDeg, lon], steps, lon === 0);
  }
  ctx.setLineDash([]);
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
): void {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = 6.5;
  ctx.save();
  ctx.translate(x2, y2);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size * 0.48);
  ctx.lineTo(-size, size * 0.48);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

interface ConnectionVisualStyle {
  readonly alpha: number;
  readonly lineWidth: number;
  readonly drawShadow: boolean;
  readonly drawArrow: boolean;
}

function resolveConnectionStyle(
  conn: WorldMapConnection,
  state: GlobeRenderState,
  denseAmbient: boolean,
  focusTerritoryId: string | null,
): ConnectionVisualStyle {
  const emphasized =
    state.selectedConnectionId === conn.id || state.hoveredConnectionId === conn.id;

  if (state.hoveredConnectionId || state.selectedConnectionId) {
    if (emphasized) {
      return { alpha: 1, lineWidth: 3.0, drawShadow: true, drawArrow: conn.directed };
    }
    const siblingMatch =
      focusTerritoryId !== null &&
      (conn.fromTerritoryId === focusTerritoryId || conn.toTerritoryId === focusTerritoryId);
    return {
      alpha: siblingMatch ? 0.22 : 0.06,
      lineWidth: 1.1,
      drawShadow: false,
      drawArrow: false,
    };
  }

  if (state.hoveredFamilyId) {
    return conn.family === state.hoveredFamilyId
      ? { alpha: 1, lineWidth: 2.4, drawShadow: true, drawArrow: conn.directed }
      : { alpha: 0.06, lineWidth: 1.0, drawShadow: false, drawArrow: false };
  }

  if (focusTerritoryId) {
    const matchesFocus =
      conn.fromTerritoryId === focusTerritoryId || conn.toTerritoryId === focusTerritoryId;
    return matchesFocus
      ? { alpha: 0.96, lineWidth: 2.2, drawShadow: true, drawArrow: conn.directed }
      : { alpha: 0.06, lineWidth: 1.0, drawShadow: false, drawArrow: false };
  }

  if (denseAmbient) {
    return { alpha: 0.14, lineWidth: 0.9, drawShadow: false, drawArrow: false };
  }

  return { alpha: 0.88, lineWidth: 2.0, drawShadow: true, drawArrow: conn.directed };
}

/**
 * Renders the 3D orthographic editorial globe into a 2D HiDPI canvas context and returns
 * projected elevated connection polylines for interactive pointer hit-testing.
 */
export function renderGlobeFrame(
  ctx: CanvasRenderingContext2D,
  atlas: GlobePreparedAtlas,
  state: GlobeRenderState,
): readonly GlobeHitConnection[] {
  const { camera, width, height, zoomFactor } = state;
  const { cx, cy, radius } = camera;

  ctx.clearRect(0, 0, width, height);
  if (radius <= 8) return [];

  // 1. Subtle neutral drop shadow anchoring the sphere on the paper desk (unslop U17 neutral).
  const shadowCx = cx + radius * 0.045;
  const shadowCy = cy + radius * 0.055;
  const shadowGrad = ctx.createRadialGradient(
    shadowCx,
    shadowCy,
    radius * 0.72,
    shadowCx,
    shadowCy,
    radius * 1.07,
  );
  shadowGrad.addColorStop(0, 'rgba(20, 18, 17, 0.12)');
  shadowGrad.addColorStop(0.86, 'rgba(20, 18, 17, 0.06)');
  shadowGrad.addColorStop(1, 'rgba(20, 18, 17, 0)');
  ctx.beginPath();
  ctx.arc(shadowCx, shadowCy, radius * 1.07, 0, Math.PI * 2);
  ctx.fillStyle = shadowGrad;
  ctx.fill();

  // 2. Outer editorial azimuth instrument ring with 15-deg graduations when full globe is visible.
  if (zoomFactor <= 1.45) {
    const outerR = radius + 8;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(119, 114, 104, 0.52)';
    ctx.lineWidth = 0.85;
    ctx.stroke();

    ctx.beginPath();
    for (let deg = 0; deg < 360; deg += 15) {
      const rad = deg * DEG_TO_RAD;
      const tickLen = deg % 45 === 0 ? 5.5 : 3;
      ctx.moveTo(cx + Math.cos(rad) * outerR, cy + Math.sin(rad) * outerR);
      ctx.lineTo(cx + Math.cos(rad) * (outerR + tickLen), cy + Math.sin(rad) * (outerR + tickLen));
    }
    ctx.strokeStyle = 'rgba(20, 18, 17, 0.42)';
    ctx.lineWidth = 0.85;
    ctx.stroke();
  }

  // 3. Ocean sphere body in muted mineral celadon (washed teal-paper over ivory) for land separation.
  const oceanGrad = ctx.createRadialGradient(
    cx - radius * 0.34,
    cy - radius * 0.34,
    radius * 0.08,
    cx,
    cy,
    radius,
  );
  oceanGrad.addColorStop(0, '#F2F5F1');
  oceanGrad.addColorStop(0.55, '#E4ECE8');
  oceanGrad.addColorStop(0.86, '#D2DFDA');
  oceanGrad.addColorStop(1, '#BBCBC5');

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = oceanGrad;
  ctx.fill();
  ctx.clip();

  // 4. Curved spherical graticule.
  drawGraticule(ctx, camera, zoomFactor);

  // 5. Country landmasses clipped seamlessly onto the orthographic horizon.
  const hasHighlight = Boolean(state.highlightedTerritoryIds);
  const focusTerritoryId = state.hoveredTerritoryId ?? state.selectedTerritoryId;
  for (const country of atlas.countries) {
    if (country.spanDeg < 35) {
      const quick = projectPoint(country.centroidVec, camera);
      if (quick.z < -0.52) continue;
    }

    const iso = country.isoNumeric;
    const isSelected = iso !== '000' && state.selectedIso === iso;
    const isHovered = iso !== '000' && state.hoveredIso === iso;
    const isNeighbor = iso !== '000' && (state.neighborIsos?.has(iso) ?? false);
    const isHighlightedIso = iso !== '000' && (state.highlightedIsos?.has(iso) ?? false);
    const isActive = iso !== '000' && state.activeIsos.has(iso);
    const isInteractable = iso !== '000' && state.interactableIsos.has(iso);
    const activity = iso !== '000' ? (state.activityByIso.get(iso) ?? 0) : 0;

    let fill = '#F7F2E4';
    let stroke = '#B3AA96';
    let strokeW = 0.75;
    let alpha = 1;

    if (isSelected) {
      fill = '#F3CFCB';
      stroke = '#B81D16';
      strokeW = 2.1;
    } else if (isHovered) {
      fill = '#EAC66A';
      stroke = '#141211';
      strokeW = 1.6;
    } else if (hasHighlight && isHighlightedIso) {
      fill = '#E9CE84';
      stroke = '#141211';
      strokeW = 1.25;
    } else if (isNeighbor) {
      fill = '#F1DFAC';
      stroke = '#141211';
      strokeW = 1.2;
    } else if (isActive) {
      fill = activity >= 12 ? '#E9CE84' : '#EFE0B7';
      stroke = '#756C5A';
      strokeW = 0.95;
    } else if (isInteractable) {
      fill = '#F5EEDB';
      stroke = '#9E9581';
      strokeW = 0.8;
    }

    if (hasHighlight && !isSelected && !isHovered && !isHighlightedIso) {
      alpha = 0.36;
    }

    let drewRing = false;
    ctx.beginPath();
    for (const packed of country.packedRings) {
      const screenRing = clipRingToHorizon(packed, camera);
      if (screenRing.length < 3) continue;
      drewRing = true;
      ctx.moveTo(screenRing[0].x, screenRing[0].y);
      for (let i = 1; i < screenRing.length; i++) {
        ctx.lineTo(screenRing[i].x, screenRing[i].y);
      }
      ctx.closePath();
    }

    if (!drewRing) continue;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.fill('evenodd');
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeW;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // 6. Subtle neutral spherical limb shading over land + ocean for unmistakable 3D curvature.
  const limbGrad = ctx.createRadialGradient(
    cx - radius * 0.34,
    cy - radius * 0.34,
    radius * 0.16,
    cx,
    cy,
    radius,
  );
  limbGrad.addColorStop(0, 'rgba(255, 253, 250, 0.10)');
  limbGrad.addColorStop(0.68, 'rgba(255, 253, 250, 0)');
  limbGrad.addColorStop(1, 'rgba(20, 18, 17, 0.17)');
  ctx.fillStyle = limbGrad;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  ctx.restore();

  // 7. Crisp ink limb border around the sphere.
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#141211';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // 8. Elevated 3D great-circle connections with progressive disclosure.
  const denseAmbient =
    state.connections.length > 28 &&
    !state.selectedTerritoryId &&
    !state.hoveredTerritoryId &&
    !state.selectedConnectionId &&
    !state.hoveredConnectionId &&
    !state.hoveredFamilyId;

  const hitConnections: GlobeHitConnection[] = [];
  for (const conn of state.connections) {
    const fromVec = state.territoryUnitVecs.get(conn.fromTerritoryId);
    const toVec = state.territoryUnitVecs.get(conn.toTerritoryId);
    if (!fromVec || !toVec) continue;

    const proj = projectGeodesicArc(fromVec, toVec, camera);
    if (proj.elevatedSegments.length === 0) continue;

    const style = resolveConnectionStyle(conn, state, denseAmbient, focusTerritoryId);
    const color = state.familyColors[conn.family] ?? '#777268';
    const dash = state.familyDash[conn.family] ?? [];

    // Ground trace shadow on visible hemisphere when arc is active/focused
    if (style.drawShadow && proj.shadowSegments.length > 0) {
      ctx.save();
      ctx.beginPath();
      for (const seg of proj.shadowSegments) {
        ctx.moveTo(seg[0].x, seg[0].y);
        for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i].x, seg[i].y);
      }
      ctx.strokeStyle = 'rgba(20, 18, 17, 0.16)';
      ctx.globalAlpha = style.alpha * 0.45;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // Elevated arc
    ctx.save();
    ctx.beginPath();
    for (const seg of proj.elevatedSegments) {
      ctx.moveTo(seg[0].x, seg[0].y);
      for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i].x, seg[i].y);
    }
    ctx.strokeStyle = color;
    ctx.globalAlpha = style.alpha;
    ctx.lineWidth = style.lineWidth;
    ctx.lineCap = 'round';
    ctx.setLineDash([...dash]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (style.drawArrow && proj.endArrow) {
      drawArrowHead(
        ctx,
        proj.endArrow.x1,
        proj.endArrow.y1,
        proj.endArrow.x2,
        proj.endArrow.y2,
        color,
      );
    }
    ctx.restore();

    hitConnections.push({ connection: conn, segments: proj.elevatedSegments });
  }

  // 9. Matched country anchor dots on surface.
  for (const item of state.matchedCountryDots) {
    const pt = projectPoint(item.unitVec, camera);
    if (!pt.visible) continue;
    const isFocusedOrNeighbor =
      focusTerritoryId === null ||
      item.territory.id === focusTerritoryId ||
      (state.neighborTerritoryIds?.has(item.territory.id) ?? false);
    let dimmed = hasHighlight && !state.highlightedTerritoryIds!.has(item.territory.id) ? 0.2 : 1;
    if (!hasHighlight && !isFocusedOrNeighbor) dimmed = 0.42;
    const selected = item.territory.id === state.selectedTerritoryId;

    ctx.save();
    ctx.globalAlpha = dimmed;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, selected ? 4.4 : 2.9, 0, Math.PI * 2);
    ctx.fillStyle = selected ? '#B81D16' : '#141211';
    ctx.fill();
    ctx.strokeStyle = '#FBF8F1';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    if (selected) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 8.5, 0, Math.PI * 2);
      ctx.strokeStyle = '#B81D16';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.restore();
  }

  // 10. Distinct geometric markers for historical polities and cities/sites.
  for (const item of state.markerTerritories) {
    const pt = projectPoint(item.unitVec, camera);
    if (!pt.visible) continue;
    const isFocusedOrNeighbor =
      focusTerritoryId === null ||
      item.territory.id === focusTerritoryId ||
      (state.neighborTerritoryIds?.has(item.territory.id) ?? false);
    let dimmed = hasHighlight && !state.highlightedTerritoryIds!.has(item.territory.id) ? 0.18 : 1;
    if (!hasHighlight && !isFocusedOrNeighbor) dimmed = 0.42;
    const selected = item.territory.id === state.selectedTerritoryId;
    const hovered = item.territory.id === state.hoveredTerritoryId;

    ctx.save();
    ctx.globalAlpha = dimmed;
    ctx.translate(pt.x, pt.y);

    if (item.territory.layer === 'polity') {
      const r = selected || hovered ? 6.5 : 5.2;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      ctx.fillStyle = selected ? '#B81D16' : '#F4DAD7';
      ctx.fill();
      ctx.strokeStyle = selected ? '#141211' : '#B81D16';
      ctx.lineWidth = selected ? 2 : 1.4;
      ctx.stroke();
    } else if (item.territory.layer === 'locality') {
      const r = selected || hovered ? 4.5 : 3.6;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = '#E1EDF0';
      ctx.fill();
      ctx.strokeStyle = selected ? '#141211' : '#164F60';
      ctx.lineWidth = selected ? 2 : 1.4;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#164F60';
      ctx.fill();
    } else {
      const s = selected || hovered ? 4.2 : 3.4;
      // Ochre pigment (--pig-ocre-500); canvas cannot read custom properties directly.
      ctx.fillStyle = '#EDBB5C';
      ctx.strokeStyle = '#141211';
      ctx.lineWidth = selected ? 2 : 1.2;
      ctx.fillRect(-s, -s, s * 2, s * 2);
      ctx.strokeRect(-s, -s, s * 2, s * 2);
    }

    if (selected) {
      ctx.beginPath();
      ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
      ctx.strokeStyle = '#B81D16';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.restore();
  }

  return hitConnections;
}

function pointToSegmentDistSq(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return (px - x1) * (px - x1) + (py - y1) * (py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const cx = x1 + dx * t;
  const cy = y1 + dy * t;
  return (px - cx) * (px - cx) + (py - cy) * (py - cy);
}

/** Finds the closest visible elevated geodesic connection within `thresholdPx` of pointer coords. */
export function hitTestConnectionArc(
  sx: number,
  sy: number,
  hitConnections: readonly GlobeHitConnection[],
  thresholdPx = 9,
): WorldMapConnection | null {
  const maxDistSq = thresholdPx * thresholdPx;
  let bestDistSq = maxDistSq;
  let best: WorldMapConnection | null = null;

  for (const entry of hitConnections) {
    for (const seg of entry.segments) {
      for (let i = 1; i < seg.length; i++) {
        const dSq = pointToSegmentDistSq(sx, sy, seg[i - 1].x, seg[i - 1].y, seg[i].x, seg[i].y);
        if (dSq <= bestDistSq) {
          bestDistSq = dSq;
          best = entry.connection;
        }
      }
    }
  }

  return best;
}
