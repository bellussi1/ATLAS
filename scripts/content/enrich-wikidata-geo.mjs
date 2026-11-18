#!/usr/bin/env node
// Preenche `coordinates`, `isoAlpha2`, `isoNumeric` e datas de formações históricas (`P576`)
// nos registros de lugar/país a partir do Wikidata. Mantém países modernos sem `temporalExtent`
// e não atribui códigos ISO a Estados extintos.
//
//   node scripts/content/enrich-wikidata-geo.mjs --dry-run
//   node scripts/content/enrich-wikidata-geo.mjs
import './register-source-modules.mjs';
import { readdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { getJson } from '../ingestion/wikimedia/client.mjs';
import { yearOf } from './enrich-wikidata-dates.mjs';
import { readSourceGraph, sourceDirectory, writeSourceGraph } from './source-graph.mjs';

const TODAY = '2026-11-18';
const BATCH = 50;

export const FALLBACK_PLACE_QIDS = {
  'country-brazil': 'Q155',
  'country-portugal': 'Q45',
  'place-plenario-camara': 'Q2005479',
};

function firstClaim(claims, property) {
  return (claims?.[property] ?? []).filter((statement) => statement?.rank !== 'deprecated');
}

export function extractCoordinates(claims) {
  for (const statement of firstClaim(claims, 'P625')) {
    const value = statement?.mainsnak?.datavalue?.value;
    if (!value || typeof value !== 'object') continue;
    const globe = value.globe;
    if (globe && !String(globe).endsWith('/Q2')) continue;
    const lat = Number(value.latitude);
    const lon = Number(value.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;
    return {
      lat: Math.round(lat * 10000) / 10000,
      lon: Math.round(lon * 10000) / 10000,
    };
  }
  return undefined;
}

function firstStringClaim(claims, property, pattern, normalize = (value) => value) {
  for (const statement of firstClaim(claims, property)) {
    const raw = statement?.mainsnak?.datavalue?.value;
    if (typeof raw !== 'string') continue;
    const formatted = normalize(raw.trim());
    if (pattern.test(formatted)) return formatted;
  }
  return undefined;
}

function firstYearOf(claims, property) {
  for (const statement of firstClaim(claims, property)) {
    const year = yearOf(statement.mainsnak);
    if (year !== null) return year;
  }
  return null;
}

export function applyGeo(graph, { claimsByQid, fallbackQids = FALLBACK_PLACE_QIDS } = {}) {
  const stats = {
    placesTotal: 0,
    withCoordinates: 0,
    coordinatesUpdated: 0,
    countriesWithIso: 0,
    isoUpdated: 0,
    historicalPolitiesDated: 0,
    missingCoordinates: [],
  };
  let graphChanged = false;

  for (const atlas of graph.atlases) {
    let atlasChanged = false;
    for (const entity of atlas.entities) {
      if (entity.kind !== 'place' || entity.placeType === 'regime') continue;
      stats.placesTotal += 1;

      const qid = entity.externalIds?.wikidata ?? fallbackQids[entity.id];
      const claims = qid ? claimsByQid[qid] : undefined;

      if (claims) {
        const coords = extractCoordinates(claims);
        if (
          coords &&
          (!entity.coordinates ||
            entity.coordinates.lat !== coords.lat ||
            entity.coordinates.lon !== coords.lon)
        ) {
          entity.coordinates = coords;
          stats.coordinatesUpdated += 1;
          atlasChanged = true;
        }

        const startYear = firstYearOf(claims, 'P571');
        const dissolvedYear = firstYearOf(claims, 'P576');
        const hasDissolvedDate = dissolvedYear !== null;
        const isCountry = entity.placeCategory === 'country' || entity.placeType === 'country';

        if (isCountry && !hasDissolvedDate) {
          const alpha2 = firstStringClaim(claims, 'P297', /^[A-Z]{2}$/, (v) => v.toUpperCase());
          const numeric = firstStringClaim(claims, 'P299', /^\d{3}$/, (v) =>
            /^\d{1,3}$/.test(v) ? v.padStart(3, '0') : v,
          );
          if (alpha2 && entity.isoAlpha2 !== alpha2) {
            entity.isoAlpha2 = alpha2;
            stats.isoUpdated += 1;
            atlasChanged = true;
          }
          if (numeric && entity.isoNumeric !== numeric) {
            entity.isoNumeric = numeric;
            if (!alpha2 || entity.isoAlpha2 === alpha2) stats.isoUpdated += 1;
            atlasChanged = true;
          }
        } else if (hasDissolvedDate && (entity.isoAlpha2 || entity.isoNumeric)) {
          delete entity.isoAlpha2;
          delete entity.isoNumeric;
          atlasChanged = true;
        }

        if (!entity.temporalExtent && hasDissolvedDate) {
          const validStart = startYear !== null && startYear <= dissolvedYear ? startYear : null;
          entity.temporalExtent = {
            startYear: validStart,
            endYear: dissolvedYear,
            precision: validStart !== null ? 'range' : 'year',
            label: null,
          };
          stats.historicalPolitiesDated += 1;
          atlasChanged = true;
        }
      }

      if (entity.coordinates) stats.withCoordinates += 1;
      else stats.missingCoordinates.push(entity.id);

      if (entity.isoNumeric || entity.isoAlpha2) stats.countriesWithIso += 1;
    }

    if (atlasChanged) {
      atlas.updatedAt = TODAY;
      graphChanged = true;
    }
  }

  if (graphChanged) graph.updatedAt = TODAY;
  return { ...stats, changed: graphChanged };
}

async function fetchClaims(qids) {
  const unique = [...new Set(qids.filter((qid) => /^Q\d+$/.test(qid ?? '')))];
  const claimsByQid = {};
  for (let index = 0; index < unique.length; index += BATCH) {
    const batch = unique.slice(index, index + BATCH);
    const data = await getJson(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${batch.join('|')}&props=claims&format=json`,
    );
    for (const qid of batch) {
      if (data?.entities?.[qid]?.claims) claimsByQid[qid] = data.entities[qid].claims;
    }
  }
  return claimsByQid;
}

async function pruneOldCollectionShards(manifest, directory = sourceDirectory) {
  const active = new Set(
    manifest.collections.map((entry) => entry.file.replace('collections/', '')),
  );
  const dir = join(directory, 'collections');
  for (const name of await readdir(dir)) {
    if (name.endsWith('.json') && !active.has(name)) {
      await unlink(join(dir, name));
    }
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const graph = await readSourceGraph();
  const qids = [];
  for (const atlas of graph.atlases) {
    for (const entity of atlas.entities) {
      if (entity.kind !== 'place' || entity.placeType === 'regime') continue;
      const qid = entity.externalIds?.wikidata ?? FALLBACK_PLACE_QIDS[entity.id];
      if (qid) qids.push(qid);
    }
  }
  const claimsByQid = await fetchClaims(qids);
  const result = applyGeo(graph, { claimsByQid });
  if (!dryRun && result.changed) {
    const manifest = await writeSourceGraph(graph);
    await pruneOldCollectionShards(manifest);
  }
  await writeFile(
    join('generated', 'wikidata-geo-report.json'),
    `${JSON.stringify({ dryRun, qidsQueried: new Set(qids).size, ...result }, null, 2)}\n`,
  );
  console.log(JSON.stringify({ dryRun, qidsQueried: new Set(qids).size, ...result }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
