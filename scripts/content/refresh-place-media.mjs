#!/usr/bin/env node
// Renova as imagens dos lugares a partir do Wikidata: bandeira (P41) para países e Estados,
// imagem (P18) para cidades, regiões, continentes e locais. Prefere o rank `preferred`, o que
// corrige bandeiras históricas escolhidas por engano (Alemanha, Reino Unido, Rússia).
// Cada arquivo passa pela mesma checagem de licença do estágio 11. Não cria entidades.
//
//   node scripts/content/refresh-place-media.mjs --dry-run
//   node scripts/content/refresh-place-media.mjs
import { readSourceGraph, writeSourceGraph } from './source-graph.mjs';
import { liveHttp } from '../ingestion/wiki-extract/http.mjs';
import { collectImages, commonsInfoUrl, fileDecision } from '../tradicao/images.mjs';

const TODAY = '2026-11-09';
const TYPE_BY_CATEGORY = {
  country: 'pais',
  state: 'estado',
  city: 'cidade',
  region: 'regiao',
  continent: 'continente',
  site: 'local',
  other: 'lugar',
};
const COPY = {
  'country-brazil': 'wiki-topic-brasil',
  'country-portugal': 'wiki-topic-portugal',
};
/** Flags the Wikidata property does not offer, or offers as a coat of arms/composite. */
const FILE_OVERRIDES = {
  'Áustria-Hungria': 'Flag of Austria-Hungary (1867–1918).svg',
  'Estados Unidos': 'Flag of the United States.svg',
  'Itália Fascista': 'Flag of Italy (1861–1946).svg',
  'Alemanha Ocidental': 'Flag map of West Germany (1949–1990).svg',
};
const HISTORICAL_COUNTRIES = new Set([
  'Alemanha Ocidental',
  'Alemanha Oriental',
  'Checoslováquia',
  'Jugoslávia',
  'União Soviética',
]);
const priority = (entity) => {
  if (entity.placeCategory === 'country') return HISTORICAL_COUNTRIES.has(entity.title) ? 1 : 0;
  return (
    { state: 2, city: 3, region: 4, continent: 5, site: 6, other: 7 }[entity.placeCategory] ?? 8
  );
};

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const graph = await readSourceGraph();
  const entities = graph.atlases
    .flatMap((atlas) => atlas.entities)
    .filter((entity) => entity.placeCategory && entity.externalIds?.wikidata)
    .sort((a, b) => priority(a) - priority(b) || a.title.localeCompare(b.title, 'pt-BR'));
  if (dryRun) {
    console.log(`${entities.length} lugares com QID seriam atualizados.`);
    return;
  }
  const result = await collectImages(
    entities.map((entity) => ({
      id: entity.id,
      type: TYPE_BY_CATEGORY[entity.placeCategory] ?? 'lugar',
      qid: entity.externalIds.wikidata,
    })),
    { http: liveHttp, retrievedAt: TODAY },
  );
  for (const [title, file] of Object.entries(FILE_OVERRIDES)) {
    const entity = entities.find((item) => item.title === title);
    if (!entity) continue;
    const data = await liveHttp.json(commonsInfoUrl(file));
    const info = Object.values(data.query?.pages ?? {})[0]?.imageinfo?.[0];
    const decision = fileDecision(file, info);
    if (decision.ok)
      result[entity.id] = {
        status: 'licensed',
        asset: { ...decision.asset, retrievedAt: TODAY },
      };
    else console.log(`sem imagem para ${title}: ${decision.reason}`);
  }
  let licensed = 0;
  let icon = 0;
  const refreshed = new Set(entities.map((entity) => entity.id));
  for (const atlas of graph.atlases)
    atlas.assetLicenses = atlas.assetLicenses.filter((asset) => !refreshed.has(asset.entityId));
  const otherAssets = new Map();
  for (const atlas of graph.atlases)
    for (const asset of atlas.assetLicenses) otherAssets.set(asset.assetPath, { atlas, asset });
  for (const atlas of graph.atlases) {
    for (const entity of atlas.entities) {
      if (!entity.placeCategory || !entity.externalIds?.wikidata) continue;
      const item = result[entity.id];
      if (item?.status === 'licensed') {
        // A bandeira pertence ao país/Estado, não ao povo ou ao regime que a usava antes.
        const previous = otherAssets.get(item.asset.assetPath);
        if (previous) {
          previous.atlas.assetLicenses = previous.atlas.assetLicenses.filter(
            (asset) => asset !== previous.asset,
          );
          otherAssets.delete(item.asset.assetPath);
        }
        atlas.assetLicenses.push({
          id: `asset-${entity.id}`,
          entityId: entity.id,
          ...item.asset,
        });
        licensed += 1;
      } else {
        icon += 1;
      }
    }
  }
  // Os dois recortes de país não têm QID próprio: herdam a bandeira do verbete correspondente.
  for (const [targetId, sourceId] of Object.entries(COPY)) {
    const targetAtlas = graph.atlases.find((atlas) =>
      atlas.entities.some((entity) => entity.id === targetId),
    );
    const sourceAtlas = graph.atlases.find((atlas) =>
      atlas.assetLicenses.some((asset) => asset.entityId === sourceId),
    );
    const asset = sourceAtlas?.assetLicenses.find((item) => item.entityId === sourceId);
    if (!targetAtlas || !asset) continue;
    // Move a bandeira do verbete para o recorte de país; manter as duas duplicaria o ativo.
    sourceAtlas.assetLicenses = sourceAtlas.assetLicenses.filter(
      (item) => item.entityId !== sourceId,
    );
    otherAssets.delete(asset.assetPath);
    targetAtlas.assetLicenses = targetAtlas.assetLicenses.filter(
      (item) => item.entityId !== targetId,
    );
    targetAtlas.assetLicenses.push({
      ...asset,
      id: `asset-${targetId}`,
      entityId: targetId,
    });
  }
  graph.updatedAt = TODAY;
  const seen = new Map();
  for (const atlas of graph.atlases)
    for (const asset of atlas.assetLicenses) {
      const key = asset.assetPath;
      if (seen.has(key)) console.log('DUPLICADO', seen.get(key), asset.entityId, key);
      else seen.set(key, asset.entityId);
    }
  await writeSourceGraph(graph);
  console.log(`${licensed} imagens licenciadas, ${icon} sem imagem; ${entities.length} lugares.`);
}

await main();
