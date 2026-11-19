#!/usr/bin/env node
// Gera base cartográfica esférica 1:50m a partir de `world-atlas/countries-50m.json`
// (Natural Earth, Domínio Público) com coordenadas geográficas `(lon, lat)` compactadas
// para renderização em globo 3D e fallback estrutural `(cx, cy)`.
//
//   node scripts/content/build-world-map-base.mjs
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { feature } from 'topojson-client';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const WIDTH = 960;
const HEIGHT = 500;
const MARGIN = 14;
const MAX_X = Math.PI * 0.8707;
const MAX_Y = 1.422390506730596;
const SCALE = Math.min((WIDTH - 2 * MARGIN) / (2 * MAX_X), (HEIGHT - 2 * MARGIN) / (2 * MAX_Y));

const round1 = (value) => Math.round(value * 10) / 10;
const round05 = (value) => {
  const rounded = Math.round(value * 20) / 20;
  return Object.is(rounded, -0) ? 0 : rounded;
};
const round2 = (value) => {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
};

/** Projects WGS84 coordinates into flat reference SVG space (Natural Earth I polynomial). */
export function projectNaturalEarth(lat, lon, width = WIDTH, height = HEIGHT) {
  const scale = Math.min((width - 2 * MARGIN) / (2 * MAX_X), (height - 2 * MARGIN) / (2 * MAX_Y));
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

function normalizeLongitude(lon) {
  let out = ((((lon + 180) % 360) + 360) % 360) - 180;
  if (out === -180 && lon > 0) out = 180;
  return Object.is(out, -0) ? 0 : out;
}

function unwrapRingLongitudes(ring) {
  if (!ring.length) return [];
  const unwrapped = [];
  let offset = 0;
  let prevLon = ring[0][0];
  for (const [lon, lat] of ring) {
    let adjusted = lon + offset;
    while (adjusted - prevLon > 180) {
      adjusted -= 360;
      offset -= 360;
    }
    while (adjusted - prevLon < -180) {
      adjusted += 360;
      offset += 360;
    }
    unwrapped.push([adjusted, lat]);
    prevLon = adjusted;
  }
  return unwrapped;
}

function sqSegmentDistance(point, a, b) {
  let x = a[0];
  let y = a[1];
  const dx = b[0] - x;
  const dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0];
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  const pdx = point[0] - x;
  const pdy = point[1] - y;
  return pdx * pdx + pdy * pdy;
}

function douglasPeucker(points, tolerance) {
  if (points.length <= 3) return points;
  const tolSq = tolerance * tolerance;
  let maxDistSq = 0;
  let splitIndex = 0;
  const last = points.length - 1;
  for (let i = 1; i < last; i++) {
    const distSq = sqSegmentDistance(points[i], points[0], points[last]);
    if (distSq > maxDistSq) {
      maxDistSq = distSq;
      splitIndex = i;
    }
  }
  if (maxDistSq > tolSq) {
    const left = douglasPeucker(points.slice(0, splitIndex + 1), tolerance);
    const right = douglasPeucker(points.slice(splitIndex), tolerance);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[last]];
}

function ringMetricsDegrees(points) {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  let doubleArea = 0;
  let lonSum = 0;
  let latSum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    if (x0 < minLon) minLon = x0;
    if (y0 < minLat) minLat = y0;
    if (x0 > maxLon) maxLon = x0;
    if (y0 > maxLat) maxLat = y0;
    const cross = x0 * y1 - x1 * y0;
    doubleArea += cross;
    lonSum += (x0 + x1) * cross;
    latSum += (y0 + y1) * cross;
  }
  const area = Math.abs(doubleArea) / 2;
  const lon = Math.abs(doubleArea) > 1e-5 ? lonSum / (3 * doubleArea) : (minLon + maxLon) / 2;
  const lat = Math.abs(doubleArea) > 1e-5 ? latSum / (3 * doubleArea) : (minLat + maxLat) / 2;
  return {
    area,
    lon: round2(normalizeLongitude(lon)),
    lat: round2(Math.max(-85, Math.min(85, lat))),
    bbox: [round2(minLon), round2(minLat), round2(maxLon), round2(maxLat)],
  };
}

function encodeRing(rawRing) {
  const unwrapped = unwrapRingLongitudes(rawRing);
  if (unwrapped.length < 3) return null;

  let simplified = douglasPeucker(unwrapped, 0.23);
  if (simplified.length < 6) {
    simplified = douglasPeucker(unwrapped, 0.05);
  }
  if (simplified.length < 4) {
    simplified = unwrapped;
  }

  const rounded = simplified.map(([lon, lat]) => [round05(lon), round05(lat)]);
  const dedup = [];
  for (const pt of rounded) {
    const prev = dedup[dedup.length - 1];
    if (!prev || prev[0] !== pt[0] || prev[1] !== pt[1]) {
      dedup.push(pt);
    }
  }
  if (
    dedup.length > 1 &&
    dedup[0][0] === dedup[dedup.length - 1][0] &&
    dedup[0][1] === dedup[dedup.length - 1][1]
  ) {
    dedup.pop();
  }
  if (dedup.length < 3) return null;

  return {
    points: dedup,
    encoded: dedup.map(([lon, lat]) => `${lon},${lat}`).join(';'),
  };
}

export async function buildWorldMapBase() {
  const raw = JSON.parse(
    await readFile(join(projectRoot, 'node_modules/world-atlas/countries-50m.json'), 'utf8'),
  );
  const fc = feature(raw, raw.objects.countries);
  const countries = [];

  for (const feat of fc.features) {
    const isoNumeric = feat.id != null ? String(feat.id).padStart(3, '0') : '000';
    if (!/^\d{3}$/.test(isoNumeric) || isoNumeric === '010') continue;

    const polygons =
      feat.geometry?.type === 'Polygon'
        ? [feat.geometry.coordinates]
        : feat.geometry?.type === 'MultiPolygon'
          ? feat.geometry.coordinates
          : [];

    const rings = [];
    let bestRing = null;
    let minLon = Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let maxLat = -Infinity;

    for (const polygon of polygons) {
      for (const [ringIndex, rawRing] of polygon.entries()) {
        const prepared = encodeRing(rawRing);
        if (!prepared) continue;
        rings.push(prepared.encoded);
        const m = ringMetricsDegrees(prepared.points);
        if (m.bbox[0] < minLon) minLon = m.bbox[0];
        if (m.bbox[1] < minLat) minLat = m.bbox[1];
        if (m.bbox[2] > maxLon) maxLon = m.bbox[2];
        if (m.bbox[3] > maxLat) maxLat = m.bbox[3];
        if (ringIndex === 0 && (!bestRing || m.area > bestRing.area)) {
          bestRing = m;
        }
      }
    }

    if (!rings.length || !bestRing) continue;
    const flatCenter = projectNaturalEarth(bestRing.lat, bestRing.lon);
    countries.push({
      isoNumeric,
      name: String(feat.properties?.name ?? isoNumeric),
      lat: bestRing.lat,
      lon: bestRing.lon,
      cx: flatCenter.x,
      cy: flatCenter.y,
      bbox: [minLon, minLat, maxLon, maxLat],
      rings,
    });
  }

  countries.sort(
    (a, b) => a.isoNumeric.localeCompare(b.isoNumeric) || a.name.localeCompare(b.name),
  );

  const payload = {
    schemaVersion: 2,
    resolution: '50m',
    width: WIDTH,
    height: HEIGHT,
    scale: round1(SCALE),
    attribution: {
      source: 'Natural Earth 1:50m Cultural Vectors',
      license: 'Domínio Público (Public Domain)',
      url: 'https://www.naturalearthdata.com/',
    },
    countries,
  };

  const legacyPath = join(projectRoot, 'src/app/features/world-map/data/natural-earth-110m.json');
  const outPath = join(projectRoot, 'src/app/features/world-map/data/natural-earth-globe.json');
  await mkdir(dirname(outPath), { recursive: true });
  const jsonText = `${JSON.stringify(payload, null, 2)}\n`;
  await writeFile(outPath, jsonText, 'utf8');
  await rm(legacyPath, { force: true });

  return {
    outPath,
    countries: countries.length,
    sizeBytes: Buffer.byteLength(jsonText),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await buildWorldMapBase();
  console.log(JSON.stringify(result));
}
