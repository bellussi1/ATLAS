#!/usr/bin/env node
// Preenche `temporalExtent` dos verbetes citados com datas do Wikidata. Só age onde o campo está
// nulo, só aceita precisão de ano ou melhor e não cria entidades. Sem custo de API.
//
//   node scripts/content/enrich-wikidata-dates.mjs --dry-run
//   node scripts/content/enrich-wikidata-dates.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { getJson } from '../ingestion/wikimedia/client.mjs';
import { readSourceGraph, writeSourceGraph } from './source-graph.mjs';

const TODAY = '2026-11-08';
const ATLAS_ID = 'atlas-verbetes-citados';
const BATCH = 50;

/** Property order per kind; the first usable value wins. */
const DATE_PROPERTIES = {
  person: { start: ['P569'], end: ['P570'] },
  event: { start: ['P580', 'P585'], end: ['P582'] },
  work: { start: ['P577', 'P571'], end: [] },
  institution: { start: ['P571'], end: ['P576'] },
  party: { start: ['P571'], end: ['P576'] },
  ideology: { start: ['P571'], end: ['P576'] },
  concept: { start: ['P580', 'P585'], end: ['P582'] },
};

/** Wikidata time value -> integer year, or null when precision is coarser than a year. */
export function yearOf(snak) {
  const value = snak?.datavalue?.value;
  if (!value || typeof value.time !== 'string') return null;
  const precision = Number(value.precision);
  if (!Number.isFinite(precision) || precision < 9) return null;
  const match = /^([+-])(\d{4,})-/.exec(value.time);
  if (!match) return null;
  const year = Number(match[2]);
  return match[1] === '-' ? -year : year;
}

function firstYear(claims, properties) {
  for (const property of properties) {
    for (const statement of claims[property] ?? []) {
      if (statement.rank === 'deprecated') continue;
      const year = yearOf(statement.mainsnak);
      if (year !== null) return year;
    }
  }
  return null;
}

export function applyDates(graph, { claimsByQid }) {
  const atlas = graph.atlases.find((item) => item.id === ATLAS_ID);
  if (!atlas) throw new Error(`Atlas ausente: ${ATLAS_ID}`);
  let filled = 0;
  let skipped = 0;
  const byKind = {};
  for (const entity of atlas.entities) {
    const qid = entity.externalIds?.wikidata;
    const mapping = DATE_PROPERTIES[entity.kind];
    if (!qid || !mapping || entity.temporalExtent) continue;
    const claims = claimsByQid[qid];
    if (!claims) continue;
    const startYear = firstYear(claims, mapping.start);
    const endYear = firstYear(claims, mapping.end);
    if (startYear === null && endYear === null) {
      skipped += 1;
      continue;
    }
    entity.temporalExtent = {
      startYear,
      endYear,
      precision: startYear !== null && endYear !== null ? 'range' : 'year',
      label: null,
    };
    filled += 1;
    byKind[entity.kind] = (byKind[entity.kind] ?? 0) + 1;
  }
  if (filled) {
    atlas.updatedAt = TODAY;
    graph.updatedAt = TODAY;
  }
  return { filled, skipped, byKind };
}

async function fetchClaims(qids) {
  const claimsByQid = {};
  for (let index = 0; index < qids.length; index += BATCH) {
    const batch = qids.slice(index, index + BATCH);
    const data = await getJson(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${batch.join('|')}&props=claims&format=json`,
    );
    for (const qid of batch)
      if (data.entities?.[qid]?.claims) claimsByQid[qid] = data.entities[qid].claims;
  }
  return claimsByQid;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const graph = await readSourceGraph();
  const atlas = graph.atlases.find((item) => item.id === ATLAS_ID);
  if (!atlas) throw new Error(`Atlas ausente: ${ATLAS_ID}`);
  const qids = atlas.entities
    .map((entity) => entity.externalIds?.wikidata)
    .filter((qid) => /^Q\d+$/.test(qid ?? ''));
  const claimsByQid = await fetchClaims(qids);
  const result = applyDates(graph, { claimsByQid });
  if (!dryRun && result.filled) await writeSourceGraph(graph);
  await writeFile(
    join('generated', 'wikidata-dates-report.json'),
    `${JSON.stringify({ dryRun, qids: qids.length, ...result }, null, 2)}\n`,
  );
  console.log(JSON.stringify({ dryRun, qids: qids.length, ...result }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
