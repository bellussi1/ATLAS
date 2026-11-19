export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface GlobeCamera {
  readonly centerLon: number;
  readonly centerLat: number;
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
  readonly cosL: number;
  readonly sinL: number;
  readonly cosP: number;
  readonly sinP: number;
}

export interface ProjectedPoint {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
  readonly z: number;
  readonly visible: boolean;
}

export interface GlobeScreenPoint {
  readonly x: number;
  readonly y: number;
}

export interface GlobeArcProjection {
  readonly elevatedSegments: readonly (readonly GlobeScreenPoint[])[];
  readonly shadowSegments: readonly (readonly GlobeScreenPoint[])[];
  readonly endArrow: {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
  } | null;
}

export interface HitTestCountryPolygon {
  readonly isoNumeric: string;
  readonly bbox: readonly [number, number, number, number];
  readonly rings: readonly (readonly (readonly [number, number])[])[];
}

export interface GlobeRect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export interface GlobeLabelCandidate {
  readonly territoryId: string;
  readonly title: string;
  readonly screenX: number;
  readonly screenY: number;
  readonly z: number;
  readonly priority: 'selected' | 'hovered' | 'active';
  readonly score: number;
  readonly layer: 'country' | 'polity' | 'locality';
  readonly neighbour?: boolean;
}

export interface GlobeLabelPlacement {
  readonly territoryId: string;
  readonly title: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly priority: 'selected' | 'hovered' | 'active';
  readonly layer: 'country' | 'polity' | 'locality';
  readonly neighbour: boolean;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const round1 = (value: number): number => Math.round(value * 10) / 10;

export function normalizeLongitude(lon: number): number {
  let out = ((((lon + 180) % 360) + 360) % 360) - 180;
  if (out === -180 && lon > 0) out = 180;
  return Object.is(out, -0) ? 0 : out;
}

export function clampLatitude(lat: number): number {
  return Math.max(-78, Math.min(78, lat));
}

export function toUnitVector(lat: number, lon: number): Vec3 {
  const phi = lat * DEG_TO_RAD;
  const lam = lon * DEG_TO_RAD;
  const cosPhi = Math.cos(phi);
  return {
    x: cosPhi * Math.sin(lam),
    y: Math.sin(phi),
    z: cosPhi * Math.cos(lam),
  };
}

export function createGlobeCamera(
  centerLon: number,
  centerLat: number,
  cx: number,
  cy: number,
  radius: number,
): GlobeCamera {
  const clampedLat = clampLatitude(centerLat);
  const normLon = normalizeLongitude(centerLon);
  const lam0 = normLon * DEG_TO_RAD;
  const phi0 = clampedLat * DEG_TO_RAD;
  return {
    centerLon: normLon,
    centerLat: clampedLat,
    cx,
    cy,
    radius,
    cosL: Math.cos(lam0),
    sinL: Math.sin(lam0),
    cosP: Math.cos(phi0),
    sinP: Math.sin(phi0),
  };
}

function rotateUnit(x: number, y: number, z: number, cam: GlobeCamera): [number, number, number] {
  const x1 = x * cam.cosL - z * cam.sinL;
  const z1 = x * cam.sinL + z * cam.cosL;
  const y2 = y * cam.cosP - z1 * cam.sinP;
  const z2 = y * cam.sinP + z1 * cam.cosP;
  return [x1, y2, z2];
}

export function projectPoint(vec: Vec3, cam: GlobeCamera): ProjectedPoint {
  const [rx, ry, rz] = rotateUnit(vec.x, vec.y, vec.z, cam);
  return {
    x: cam.cx + rx * cam.radius,
    y: cam.cy - ry * cam.radius,
    rx,
    ry,
    z: rz,
    visible: rz >= 0,
  };
}

export function unprojectScreen(
  sx: number,
  sy: number,
  cam: GlobeCamera,
): { readonly lat: number; readonly lon: number } | null {
  if (cam.radius <= 0) return null;
  const x1 = (sx - cam.cx) / cam.radius;
  const y2 = (cam.cy - sy) / cam.radius;
  const r2 = x1 * x1 + y2 * y2;
  if (r2 > 1) return null;

  const z2 = Math.sqrt(Math.max(0, 1 - r2));
  const y1 = y2 * cam.cosP + z2 * cam.sinP;
  const z1 = -y2 * cam.sinP + z2 * cam.cosP;

  const vx = x1 * cam.cosL + z1 * cam.sinL;
  const vy = Math.max(-1, Math.min(1, y1));
  const vz = -x1 * cam.sinL + z1 * cam.cosL;

  return {
    lat: Math.asin(vy) * RAD_TO_DEG,
    lon: normalizeLongitude(Math.atan2(vx, vz) * RAD_TO_DEG),
  };
}

interface ClipVertex {
  readonly rx: number;
  readonly ry: number;
  readonly edge: 'interior' | 'exit' | 'enter';
}

/**
 * Clips a closed 3D unit-sphere ring packed as `[x0, y0, z0, x1, y1, z1, ...]` to the visible
 * orthographic hemisphere `z >= 0`, inserting shortest circular limb arcs where segments cross `z = 0`.
 */
export function clipRingToHorizon(
  packedUnitVecs: Float32Array | readonly number[],
  cam: GlobeCamera,
): readonly GlobeScreenPoint[] {
  const n = Math.floor(packedUnitVecs.length / 3);
  if (n < 3) return [];

  const rot = new Float64Array(n * 3);
  let anyFront = false;
  let allFront = true;

  for (let i = 0; i < n; i++) {
    const base = i * 3;
    const [rx, ry, rz] = rotateUnit(
      packedUnitVecs[base],
      packedUnitVecs[base + 1],
      packedUnitVecs[base + 2],
      cam,
    );
    rot[base] = rx;
    rot[base + 1] = ry;
    rot[base + 2] = rz;
    if (rz >= -1e-6) {
      anyFront = true;
    } else {
      allFront = false;
    }
  }

  if (!anyFront) return [];

  if (allFront) {
    const pts: GlobeScreenPoint[] = new Array(n);
    for (let i = 0; i < n; i++) {
      const base = i * 3;
      pts[i] = {
        x: cam.cx + rot[base] * cam.radius,
        y: cam.cy - rot[base + 1] * cam.radius,
      };
    }
    return pts;
  }

  const clipped: ClipVertex[] = [];
  for (let i = 0; i < n; i++) {
    const aBase = i * 3;
    const bBase = ((i + 1) % n) * 3;
    const ax = rot[aBase];
    const ay = rot[aBase + 1];
    const az = rot[aBase + 2];
    const bx = rot[bBase];
    const by = rot[bBase + 1];
    const bz = rot[bBase + 2];

    const aIn = az >= 0;
    const bIn = bz >= 0;

    if (aIn && bIn) {
      clipped.push({ rx: bx, ry: by, edge: 'interior' });
    } else if (aIn && !bIn) {
      const denom = az - bz;
      const t = denom !== 0 ? az / denom : 0;
      const ix = ax + (bx - ax) * t;
      const iy = ay + (by - ay) * t;
      const len = Math.hypot(ix, iy) || 1;
      clipped.push({ rx: ix / len, ry: iy / len, edge: 'exit' });
    } else if (!aIn && bIn) {
      const denom = az - bz;
      const t = denom !== 0 ? az / denom : 0;
      const ix = ax + (bx - ax) * t;
      const iy = ay + (by - ay) * t;
      const len = Math.hypot(ix, iy) || 1;
      clipped.push({ rx: ix / len, ry: iy / len, edge: 'enter' });
      clipped.push({ rx: bx, ry: by, edge: 'interior' });
    }
  }

  if (clipped.length < 3) return [];

  const screenPts: GlobeScreenPoint[] = [];
  const limbStepRad = 0.06;

  for (let i = 0; i < clipped.length; i++) {
    const cur = clipped[i];
    const next = clipped[(i + 1) % clipped.length];
    screenPts.push({
      x: cam.cx + cur.rx * cam.radius,
      y: cam.cy - cur.ry * cam.radius,
    });

    if (cur.edge === 'exit' && next.edge === 'enter') {
      const a0 = Math.atan2(cur.ry, cur.rx);
      const a1 = Math.atan2(next.ry, next.rx);
      const dTheta = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0));
      const steps = Math.max(1, Math.ceil(Math.abs(dTheta) / limbStepRad));
      for (let s = 1; s < steps; s++) {
        const theta = a0 + (dTheta * s) / steps;
        screenPts.push({
          x: cam.cx + Math.cos(theta) * cam.radius,
          y: cam.cy - Math.sin(theta) * cam.radius,
        });
      }
    }
  }

  return screenPts.length >= 3 ? screenPts : [];
}

/** Projects a great-circle 3D elevated arc with true spherical occlusion behind the planet disk. */
export function projectGeodesicArc(from: Vec3, to: Vec3, cam: GlobeCamera): GlobeArcProjection {
  const dot = Math.max(-1, Math.min(1, from.x * to.x + from.y * to.y + from.z * to.z));
  const omega = Math.acos(dot);
  if (omega < 0.002) {
    return { elevatedSegments: [], shadowSegments: [], endArrow: null };
  }

  const steps = Math.min(40, Math.max(16, Math.round(omega * 18)));
  const lift = Math.min(0.24, Math.max(0.045, omega * 0.14));
  const sinOmega = Math.sin(omega);

  const elevatedSegments: GlobeScreenPoint[][] = [];
  const shadowSegments: GlobeScreenPoint[][] = [];
  let currentElev: GlobeScreenPoint[] = [];
  let currentShadow: GlobeScreenPoint[] = [];
  let lastElevPrev: GlobeScreenPoint | null = null;
  let lastElevEnd: GlobeScreenPoint | null = null;
  let prevElevPoint: GlobeScreenPoint | null = null;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let ux: number;
    let uy: number;
    let uz: number;

    if (sinOmega < 1e-4) {
      ux = from.x + (to.x - from.x) * t;
      uy = from.y + (to.y - from.y) * t;
      uz = from.z + (to.z - from.z) * t;
      const len = Math.hypot(ux, uy, uz) || 1;
      ux /= len;
      uy /= len;
      uz /= len;
    } else {
      const a = Math.sin((1 - t) * omega) / sinOmega;
      const b = Math.sin(t * omega) / sinOmega;
      ux = from.x * a + to.x * b;
      uy = from.y * a + to.y * b;
      uz = from.z * a + to.z * b;
    }

    const [rx, ry, rz] = rotateUnit(ux, uy, uz, cam);
    const alt = 1 + Math.sin(Math.PI * t) * lift;
    const elevR2 = rx * rx * alt * alt + ry * ry * alt * alt;
    const elevVisible = rz >= 0 || elevR2 >= 1;

    if (elevVisible) {
      const pt = {
        x: cam.cx + rx * alt * cam.radius,
        y: cam.cy - ry * alt * cam.radius,
      };
      currentElev.push(pt);
      if (prevElevPoint) {
        lastElevPrev = prevElevPoint;
        lastElevEnd = pt;
      }
      prevElevPoint = pt;
    } else {
      if (currentElev.length >= 2) elevatedSegments.push(currentElev);
      currentElev = [];
      prevElevPoint = null;
    }

    if (rz >= 0) {
      currentShadow.push({
        x: cam.cx + rx * cam.radius,
        y: cam.cy - ry * cam.radius,
      });
    } else {
      if (currentShadow.length >= 2) shadowSegments.push(currentShadow);
      currentShadow = [];
    }
  }

  if (currentElev.length >= 2) elevatedSegments.push(currentElev);
  if (currentShadow.length >= 2) shadowSegments.push(currentShadow);

  const endArrow =
    lastElevPrev && lastElevEnd
      ? {
          x1: lastElevPrev.x,
          y1: lastElevPrev.y,
          x2: lastElevEnd.x,
          y2: lastElevEnd.y,
        }
      : null;

  return { elevatedSegments, shadowSegments, endArrow };
}

export function slerpLonLat(
  fromLon: number,
  fromLat: number,
  toLon: number,
  toLat: number,
  t: number,
): { readonly lon: number; readonly lat: number } {
  const clampedT = Math.max(0, Math.min(1, t));
  if (clampedT <= 0) return { lon: normalizeLongitude(fromLon), lat: fromLat };
  if (clampedT >= 1) return { lon: normalizeLongitude(toLon), lat: toLat };

  const a = toUnitVector(fromLat, fromLon);
  const b = toUnitVector(toLat, toLon);
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
  const omega = Math.acos(dot);

  let ux: number;
  let uy: number;
  let uz: number;

  if (omega < 1e-4) {
    ux = a.x + (b.x - a.x) * clampedT;
    uy = a.y + (b.y - a.y) * clampedT;
    uz = a.z + (b.z - a.z) * clampedT;
  } else if (Math.PI - omega < 1e-4) {
    // Near-antipodal fallback: bend gently across equatorial meridian so SLERP stays deterministic.
    const orthoLon = normalizeLongitude(fromLon + 90 * clampedT);
    const orthoLat = fromLat + (toLat - fromLat) * clampedT;
    return { lon: orthoLon, lat: orthoLat };
  } else {
    const sinOmega = Math.sin(omega);
    const wa = Math.sin((1 - clampedT) * omega) / sinOmega;
    const wb = Math.sin(clampedT * omega) / sinOmega;
    ux = a.x * wa + b.x * wb;
    uy = a.y * wa + b.y * wb;
    uz = a.z * wa + b.z * wb;
  }

  const len = Math.hypot(ux, uy, uz) || 1;
  return {
    lat: Math.asin(Math.max(-1, Math.min(1, uy / len))) * RAD_TO_DEG,
    lon: normalizeLongitude(Math.atan2(ux / len, uz / len) * RAD_TO_DEG),
  };
}

function pointInRing(
  px: number,
  py: number,
  ring: readonly (readonly [number, number])[],
): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Tests clicked spherical coordinates against prepared country polygons (supporting unwrapped antimeridian rings). */
export function hitTestCountry(
  lon: number,
  lat: number,
  countries: readonly HitTestCountryPolygon[],
): string | null {
  const candidateLons = [lon, lon + 360, lon - 360];
  let bestIso: string | null = null;
  let bestArea = Infinity;

  for (const country of countries) {
    const [minLon, minLat, maxLon, maxLat] = country.bbox;
    if (lat < minLat || lat > maxLat) continue;

    for (const testLon of candidateLons) {
      if (testLon < minLon || testLon > maxLon) continue;
      let inside = false;
      for (const ring of country.rings) {
        if (pointInRing(testLon, lat, ring)) {
          inside = !inside;
        }
      }
      if (inside) {
        const area = Math.max(0.01, (maxLon - minLon) * (maxLat - minLat));
        if (area < bestArea) {
          bestArea = area;
          bestIso = country.isoNumeric;
        }
        break;
      }
    }
  }

  return bestIso;
}

function rectsOverlap(a: GlobeRect, b: GlobeRect, pad = 0): boolean {
  return (
    a.left < b.right + pad &&
    a.right + pad > b.left &&
    a.top < b.bottom + pad &&
    a.bottom + pad > b.top
  );
}

/** Places globe labels only inside the visible front hemisphere and outside floating HUD/card rects. */
export function placeGlobeLabels(
  candidates: readonly GlobeLabelCandidate[],
  bounds: GlobeRect,
  forbiddenRects: readonly GlobeRect[],
  maxLabels = 18,
): GlobeLabelPlacement[] {
  const sorted = [...candidates]
    .filter((cand) => cand.z > 0.14 || cand.priority !== 'active')
    .filter((cand) => cand.z > 0)
    .sort((a, b) => b.score - a.score);

  const placed: GlobeLabelPlacement[] = [];
  const placedTitles = new Set<string>();
  const boxHeight = 18;
  const margin = 8;

  for (const cand of sorted) {
    if (placed.length >= maxLabels && cand.priority === 'active') break;
    const foldTitle = cand.title.trim().toLowerCase();
    if (placedTitles.has(foldTitle)) continue;
    if (
      cand.screenX < bounds.left + margin ||
      cand.screenX > bounds.right - margin ||
      cand.screenY < bounds.top + margin ||
      cand.screenY > bounds.bottom - margin
    ) {
      continue;
    }

    const boxWidth = Math.min(156, Math.max(46, cand.title.length * 6.5 + 14));
    const offsets: readonly (readonly [number, number])[] = [
      [-boxWidth / 2, -25],
      [-boxWidth / 2, 10],
      [10, -boxHeight / 2],
      [-boxWidth - 10, -boxHeight / 2],
    ];

    let chosenRect: GlobeRect | null = null;
    for (const [dx, dy] of offsets) {
      const rect: GlobeRect = {
        left: cand.screenX + dx,
        top: cand.screenY + dy,
        right: cand.screenX + dx + boxWidth,
        bottom: cand.screenY + dy + boxHeight,
      };
      if (
        rect.left < bounds.left + margin ||
        rect.right > bounds.right - margin ||
        rect.top < bounds.top + margin ||
        rect.bottom > bounds.bottom - margin
      ) {
        continue;
      }
      if (forbiddenRects.some((panel) => rectsOverlap(rect, panel, 4))) {
        continue;
      }
      if (
        placed.some((other) =>
          rectsOverlap(
            rect,
            {
              left: other.x,
              top: other.y,
              right: other.x + other.width,
              bottom: other.y + other.height,
            },
            4,
          ),
        )
      ) {
        continue;
      }
      chosenRect = rect;
      break;
    }

    if (!chosenRect) continue;

    placedTitles.add(foldTitle);
    placed.push({
      territoryId: cand.territoryId,
      title: cand.title,
      x: round1(chosenRect.left),
      y: round1(chosenRect.top),
      width: round1(boxWidth),
      height: boxHeight,
      priority: cand.priority,
      layer: cand.layer,
      neighbour: Boolean(cand.neighbour),
    });
  }

  return placed;
}
