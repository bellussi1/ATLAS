#!/usr/bin/env node
/**
 * Imagens por entidade (estágio 11): licença conferida arquivo a arquivo no Commons, miniatura remota
 * (nenhum byte entra no repositório) e, sem licença clara, ícone por tipo. Grátis.
 *   npm run tradicao:images -- <slug> [--limit N]
 * Grava generated/wiki-extract/<slug>/images.json, que o conversor transforma em `assetLicenses`.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

import { liveHttp, recordingHttp } from '../ingestion/wiki-extract/http.mjs';
import { saveCapture } from '../ingestion/wiki-extract/raw.mjs';
import { assessCommonsFile } from '../ingestion/wikimedia/commons-license.mjs';
import { callApi, COMMONS_API, entitiesUrl } from '../ingestion/wikimedia/discovery.mjs';
import { loadRecords } from './extract.mjs';
import { iconKinds, projectRoot } from './registry.mjs';

export const thumbnailWidth = 640;

/** Propriedades de imagem por tipo, na ordem de preferência. Ideologia prefere símbolo ou bandeira. */
const imageProperties = {
  pessoa: ['P18'],
  partido: ['P154', 'P18'],
  ideologia: ['P41', 'P94', 'P18'],
  movimento: ['P154', 'P41', 'P18'],
  organização: ['P154', 'P18'],
  obra: ['P18'],
  acontecimento: ['P18'],
  lugar: ['P41', 'P94', 'P18'],
  conceito: ['P18'],
};
const iconByType = {
  pessoa: 'person',
  partido: 'party',
  ideologia: 'ideology',
  movimento: 'institution',
  organização: 'institution',
  obra: 'work',
  acontecimento: 'event',
  lugar: 'place',
  conceito: 'concept',
  // Tipos dos rascunhos antigos, em inglês.
  person: 'person',
  party: 'party',
  ideology: 'ideology',
  institution: 'institution',
  work: 'work',
  event: 'event',
  place: 'place',
  concept: 'concept',
};
export const iconFor = (type) => {
  const icon = iconByType[type] ?? 'concept';
  if (!iconKinds.includes(icon)) throw new Error(`Ícone desconhecido: ${icon}`);
  return icon;
};

/** File names the item offers for this type, in order; deprecated statements do not count. */
export function imageFiles(entity, type) {
  return (imageProperties[type] ?? ['P18']).flatMap((property) =>
    (entity?.claims?.[property] ?? [])
      .filter((statement) => statement.rank !== 'deprecated')
      .map((statement) => statement.mainsnak?.datavalue?.value)
      .filter((value) => typeof value === 'string'),
  );
}

export function commonsInfoUrl(file) {
  const url = new URL(COMMONS_API);
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    titles: `File:${file}`,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: String(thumbnailWidth),
  }).toString();
  return url.toString();
}

/**
 * Decision for one file, read from that file alone. The site cannot credit a missing author, so a
 * file without one falls back to the icon even under a free licence.
 */
export function fileDecision(file, info) {
  if (!info) return { ok: false, reason: `sem metadados: ${file}` };
  const assessed = assessCommonsFile(file, info);
  if (assessed.nonFree) return { ok: false, reason: `uso não livre: ${file}` };
  if (!assessed.reusable)
    return { ok: false, reason: `licença não aceita: ${assessed.license ?? file}` };
  if (!assessed.creator) return { ok: false, reason: `autor não identificado: ${file}` };
  if (!/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(info.thumburl ?? ''))
    return { ok: false, reason: `sem miniatura remota: ${file}` };
  return {
    ok: true,
    asset: {
      assetPath: info.thumburl,
      sourceUrl: info.url,
      creator: assessed.creator,
      license: assessed.license,
      licenseUrl: assessed.licenseUrl,
      status: 'known',
      reproduction: 'allowed',
      fileTitle: file,
      filePageUrl: assessed.filePageUrl,
      attribution: assessed.attribution,
      ...(assessed.restrictions ? { restrictions: assessed.restrictions } : {}),
    },
  };
}

/**
 * Images of a set of `{ id, type, qid }`. Each file serves one entity only (first come), so a portrait
 * reused by an ideology goes to the person; order the entities with the most specific first.
 */
export async function collectImages(entities, { http, retrievedAt, usedFiles = new Set() }) {
  const qids = [...new Set(entities.flatMap((entity) => entity.qid ?? []))];
  const items = new Map();
  for (let start = 0; start < qids.length; start += 50) {
    const data = await callApi(entitiesUrl(qids.slice(start, start + 50)), http.json);
    for (const [qid, entity] of Object.entries(data.entities ?? {})) items.set(qid, entity);
  }
  const used = new Set(usedFiles);
  const result = {};
  for (const entity of entities) {
    const reasons = [];
    let asset = null;
    for (const file of imageFiles(items.get(entity.qid), entity.type)) {
      if (used.has(file)) {
        reasons.push(`já usada: ${file}`);
        continue;
      }
      const data = await callApi(commonsInfoUrl(file), http.json);
      const info = Object.values(data.query?.pages ?? {})[0]?.imageinfo?.[0];
      const decision = fileDecision(file, info);
      if (decision.ok) {
        asset = { ...decision.asset, retrievedAt };
        used.add(file);
        break;
      }
      reasons.push(decision.reason);
    }
    result[entity.id] = asset
      ? { status: 'licensed', asset }
      : {
          status: 'icon',
          icon: iconFor(entity.type),
          reason: reasons.join('; ') || 'sem imagem no Wikidata',
        };
  }
  return result;
}

const typeOrder = [
  'pessoa',
  'person',
  'obra',
  'work',
  'acontecimento',
  'event',
  'partido',
  'party',
];
const rank = (type) => {
  const index = typeOrder.indexOf(type);
  return index === -1 ? typeOrder.length : index;
};

export async function main(argv = process.argv.slice(2)) {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { limit: { type: 'string' } },
  });
  const [slug] = positionals;
  if (!/^[a-z][a-z0-9-]*$/.test(slug ?? ''))
    throw new Error('Uso: tradicao:images <slug> [--limit N]');
  const directory = join(projectRoot, 'generated/wiki-extract', slug);
  const records = await loadRecords(join(directory, 'articles'));
  const entities = records
    .map((record) => ({ id: record.entity.id, type: record.entity.type, qid: record.entity.qid }))
    .sort((a, b) => rank(a.type) - rank(b.type) || a.id.localeCompare(b.id, 'en'))
    .slice(0, values.limit ? Number(values.limit) : undefined);
  const recorder = recordingHttp(liveHttp);
  const path = join(directory, 'images.json');
  try {
    const previous = await readFile(path, 'utf8')
      .then(JSON.parse)
      .catch(() => ({}));
    const fresh = await collectImages(entities, {
      http: recorder.http,
      retrievedAt: new Date().toISOString().slice(0, 10),
    });
    const merged = { ...previous, ...fresh };
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(merged, null, 2)}\n`);
    const licensed = Object.values(merged).filter((entry) => entry.status === 'licensed').length;
    console.log(
      `${licensed} com imagem licenciada, ${Object.keys(merged).length - licensed} com ícone, em ${relative(projectRoot, path)}`,
    );
  } finally {
    if (recorder.responses.size) await saveCapture(slug, recorder.responses);
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
