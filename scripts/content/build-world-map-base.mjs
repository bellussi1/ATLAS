#!/usr/bin/env node
// Gera base cartográfica SVG estática a partir de `world-atlas/countries-110m.json` (Natural Earth
// 1:110m, Domínio Público) projetada com Natural Earth I em coordenadas [0, 960] x [0, 500].
//
//   node scripts/content/build-world-map-base.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
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

function normalizeRingLongitudes(ring) {
  const nonEdge = ring.map(([lon]) => lon).filter((lon) => Math.abs(Math.abs(lon) - 180) > 1e-4);
  const dominantSign = nonEdge.reduce((sum, lon) => sum + lon, 0) >= 0 ? 1 : -1;
  return ring.map(([lon, lat], index) => {
    if (Math.abs(Math.abs(lon) - 180) <= 1e-4) {
      const prev = ring[index - 1]?.[0];
      const next = ring[index + 1]?.[0];
      const ref =
        prev !== undefined && Math.abs(Math.abs(prev) - 180) > 1e-4
          ? prev
          : next !== undefined && Math.abs(Math.abs(next) - 180) > 1e-4
            ? next
            : dominantSign;
      return [ref >= 0 ? 180 : -180, lat];
    }
    return [lon, lat];
  });
}

function ringMetrics(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let doubleArea = 0;
  let cxSum = 0;
  let cySum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    if (x0 < minX) minX = x0;
    if (y0 < minY) minY = y0;
    if (x0 > maxX) maxX = x0;
    if (y0 > maxY) maxY = y0;
    const cross = x0 * y1 - x1 * y0;
    doubleArea += cross;
    cxSum += (x0 + x1) * cross;
    cySum += (y0 + y1) * cross;
  }
  const area = Math.abs(doubleArea) / 2;
  const cx = Math.abs(doubleArea) > 1e-3 ? cxSum / (3 * doubleArea) : (minX + maxX) / 2;
  const cy = Math.abs(doubleArea) > 1e-3 ? cySum / (3 * doubleArea) : (minY + maxY) / 2;
  return {
    area,
    cx: round1(cx),
    cy: round1(cy),
    bbox: [round1(minX), round1(minY), round1(maxX), round1(maxY)],
  };
}

function splitAntimeridianRing(ring) {
  const normalized = normalizeRingLongitudes(ring);
  const subRings = [[]];
  for (let i = 0; i < normalized.length; i++) {
    const pt = normalized[i];
    const current = subRings[subRings.length - 1];
    if (current.length > 0 && Math.abs(pt[0] - current[current.length - 1][0]) > 180) {
      subRings.push([pt]);
    } else {
      current.push(pt);
    }
  }
  return subRings.filter((part) => part.length >= 3);
}

function polylinePath(coords, closed = false) {
  if (!coords.length) return '';
  const head = coords[0];
  const rest = coords.slice(1);
  return `M${head[0]} ${head[1]}${rest.map(([x, y]) => `L${x} ${y}`).join('')}${closed ? 'Z' : ''}`;
}

function buildSphereAndGraticule() {
  const spherePts = [];
  for (let lat = -85; lat <= 85; lat += 5) {
    const p = projectNaturalEarth(lat, -180);
    spherePts.push([p.x, p.y]);
  }
  for (let lon = -180; lon <= 180; lon += 15) {
    const p = projectNaturalEarth(85, lon);
    spherePts.push([p.x, p.y]);
  }
  for (let lat = 85; lat >= -85; lat -= 5) {
    const p = projectNaturalEarth(lat, 180);
    spherePts.push([p.x, p.y]);
  }
  for (let lon = 180; lon >= -180; lon -= 15) {
    const p = projectNaturalEarth(-85, lon);
    spherePts.push([p.x, p.y]);
  }
  const spherePath = polylinePath(spherePts, true);

  const graticuleSegments = [];
  for (const lat of [-60, -30, 30, 60]) {
    const pts = [];
    for (let lon = -180; lon <= 180; lon += 10) {
      const p = projectNaturalEarth(lat, lon);
      pts.push([p.x, p.y]);
    }
    graticuleSegments.push(polylinePath(pts, false));
  }
  for (const lon of [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150]) {
    const pts = [];
    for (let lat = -85; lat <= 85; lat += 5) {
      const p = projectNaturalEarth(lat, lon);
      pts.push([p.x, p.y]);
    }
    graticuleSegments.push(polylinePath(pts, false));
  }
  const eqPts = [];
  for (let lon = -180; lon <= 180; lon += 10) {
    const p = projectNaturalEarth(0, lon);
    eqPts.push([p.x, p.y]);
  }
  return {
    spherePath,
    graticulePath: graticuleSegments.join(''),
    equatorPath: polylinePath(eqPts, false),
  };
}

export async function buildWorldMapBase() {
  const raw = JSON.parse(
    await readFile(join(projectRoot, 'node_modules/world-atlas/countries-110m.json'), 'utf8'),
  );
  const fc = feature(raw, raw.objects.countries);
  const countries = [];

  for (const feat of fc.features) {
    const isoNumeric = String(feat.id ?? '').padStart(3, '0');
    if (!/^\d{3}$/.test(isoNumeric) || isoNumeric === '010') continue;
    const polygons =
      feat.geometry?.type === 'Polygon'
        ? [feat.geometry.coordinates]
        : feat.geometry?.type === 'MultiPolygon'
          ? feat.geometry.coordinates
          : [];

    const ringPaths = [];
    let bestRing = null;
    let globalMinX = Infinity;
    let globalMinY = Infinity;
    let globalMaxX = -Infinity;
    let globalMaxY = -Infinity;

    for (const polygon of polygons) {
      for (const [ringIndex, rawRing] of polygon.entries()) {
        for (const subRing of splitAntimeridianRing(rawRing)) {
          const projected = subRing.map(([lon, lat]) => {
            const p = projectNaturalEarth(lat, lon);
            return [p.x, p.y];
          });
          ringPaths.push(polylinePath(projected, true));
          const m = ringMetrics(projected);
          if (m.bbox[0] < globalMinX) globalMinX = m.bbox[0];
          if (m.bbox[1] < globalMinY) globalMinY = m.bbox[1];
          if (m.bbox[2] > globalMaxX) globalMaxX = m.bbox[2];
          if (m.bbox[3] > globalMaxY) globalMaxY = m.bbox[3];
          if (ringIndex === 0 && (!bestRing || m.area > bestRing.area)) {
            bestRing = m;
          }
        }
      }
    }

    if (!ringPaths.length || !bestRing) continue;
    countries.push({
      isoNumeric,
      name: String(feat.properties?.name ?? isoNumeric),
      path: ringPaths.join(''),
      cx: bestRing.cx,
      cy: bestRing.cy,
      bbox: [globalMinX, globalMinY, globalMaxX, globalMaxY],
    });
  }

  countries.sort((a, b) => a.isoNumeric.localeCompare(b.isoNumeric));
  const { spherePath, graticulePath, equatorPath } = buildSphereAndGraticule();
  const payload = {
    schemaVersion: 1,
    width: WIDTH,
    height: HEIGHT,
    scale: round1(SCALE),
    attribution: {
      source: 'Natural Earth 1:110m Cultural Vectors',
      license: 'Domínio Público (Public Domain)',
      url: 'https://www.naturalearthdata.com/',
    },
    spherePath,
    graticulePath,
    equatorPath,
    countries,
  };

  const outPath = join(projectRoot, 'src/app/features/world-map/data/natural-earth-110m.json');
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return {
    outPath,
    countries: countries.length,
    sizeBytes: Buffer.byteLength(JSON.stringify(payload)),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await buildWorldMapBase();
  console.log(JSON.stringify(result));
}
