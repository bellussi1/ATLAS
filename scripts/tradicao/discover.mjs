#!/usr/bin/env node
/**
 * Coletor da descoberta (estágio 2): sem sementes escolhidas pelo usuário. Parte do item raiz da
 * tradição no Wikidata e abre anéis de 1 a 3 saltos por propriedades e links do texto, mais rótulos
 * reversos e sondas regionais (Brasil e América Latina) na raiz. A pontuação e as faixas ficam em
 * `scoring.mjs`. Grátis: só Wikidata e Wikipedia, com captura reproduzível.
 *   npm run tradicao:discover -- <slug> [--max-ring N] [--replay <captura>]
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

import { fetchArticle } from '../ingestion/wiki-extract/article.mjs';
import { mentionTypes } from '../ingestion/wiki-extract/discovery.mjs';
import {
  createHttp,
  liveHttp,
  recordingHttp,
  replayHttp,
} from '../ingestion/wiki-extract/http.mjs';
import { loadCapture, saveCapture, wikiRawRoot } from '../ingestion/wiki-extract/raw.mjs';
import { classifyQids, targetTypes } from '../ingestion/wiki-extract/targets.mjs';
import { callApi, entitiesUrl, searchUrl } from '../ingestion/wikimedia/discovery.mjs';
import { traditionFor } from '../ingestion/wikimedia/traditions.mjs';
import { projectRoot } from './registry.mjs';
import { expand, regionalRules, summarize } from './scoring.mjs';

/** Propriedades seguidas e o peso do vínculo: 0 vale como link no início do artigo. */
export const neighborProperties = {
  P737: { via: 'influenciado por', position: 0 },
  P279: { via: 'subclasse de', position: 0.6 },
  P1142: { via: 'ideologia política', position: 0 },
  P112: { via: 'fundador', position: 0 },
  P102: { via: 'partido', position: 0.1 },
  P135: { via: 'movimento', position: 0.1 },
  P361: { via: 'parte de', position: 0.1 },
  P710: { via: 'participante', position: 0.1 },
  P1344: { via: 'participou de', position: 0.1 },
  P800: { via: 'obra notável', position: 0.1 },
  P50: { via: 'autor', position: 0.1 },
  P17: { via: 'país', position: 0.6 },
  P27: { via: 'cidadania', position: 0.6 },
  P495: { via: 'país de origem', position: 0.6 },
};
/** Rótulos de contribuidores: entram no grafo como associação, nunca como influência documentada. */
export const labelProperties = ['P737', 'P1142'];
const regionProperties = ['P17', 'P27', 'P495', 'P2348', 'P361'];
/** Lugares e conceitos são citados por tudo: entram, mas não abrem o anel seguinte. */
export const expandableTypes = new Set([
  'pessoa',
  'partido',
  'ideologia',
  'movimento',
  'organização',
  'acontecimento',
]);
const notLanguages = new Set([
  'commonswiki',
  'specieswiki',
  'wikidatawiki',
  'metawiki',
  'mediawikiwiki',
  'wikimaniawiki',
  'incubatorwiki',
  'sourceswiki',
  'outreachwiki',
  'wikifunctionswiki',
]);
/** Sondas por país na raiz: partidos têm P17, pessoas têm P27. */
const regionalProbes = (root) =>
  regionalRules.regions.flatMap((country) => [
    `haswbstatement:P1142=${root} haswbstatement:P17=${country}`,
    `haswbstatement:P1142=${root} haswbstatement:P27=${country}`,
  ]);

/** As classes que definem os tipos ("ideologia", "partido político") são rótulo, não entidade da rede. */
const classItems = new Set(targetTypes.flatMap((type) => type.items));

const statementIds = (entity, property) =>
  (entity.claims?.[property] ?? [])
    .filter((statement) => statement.rank !== 'deprecated')
    .map((statement) => statement.mainsnak?.datavalue?.value?.id)
    .filter(Boolean);

/** What the score needs from a Wikidata item, nothing else. */
export function readItem(entity) {
  const sitelinks = entity.sitelinks ?? {};
  return {
    qid: entity.id,
    labels: { pt: entity.labels?.pt?.value ?? null, en: entity.labels?.en?.value ?? null },
    titles: { pt: sitelinks.ptwiki?.title ?? null, en: sitelinks.enwiki?.title ?? null },
    languages: Object.keys(sitelinks).filter(
      (key) => key.endsWith('wiki') && !notLanguages.has(key),
    ).length,
    regions: [...new Set(regionProperties.flatMap((property) => statementIds(entity, property)))],
  };
}

/** Wikidata label statements of an item, kept for the converter as associations. */
export const labelStatements = (entity) =>
  labelProperties.flatMap((property) =>
    statementIds(entity, property).map((targetQid) => ({
      qid: entity.id,
      property,
      targetQid,
      url: `https://www.wikidata.org/wiki/${entity.id}#${property}`,
    })),
  );

/** Position of each linked target in an article, 0 at its first link and 1 at the last. */
export function linkPositions(article) {
  const links = article.links ?? [];
  const body = new Set((article.sections ?? []).map((section) => section.index));
  const inBody = links.filter((link) => body.has(link.section));
  const first = new Map();
  inBody.forEach((link, position) => {
    if (!first.has(link.target)) first.set(link.target, position / Math.max(inBody.length - 1, 1));
  });
  return first;
}

/**
 * `neighbors(qid)` for `expand`: properties, text links and, at the root, reverse labels and regional
 * probes. Everything enters through `http`, so a captured run replays without network.
 */
export function createNeighbors({
  http: transport,
  root,
  readArticle = fetchArticle,
  log = () => {},
  retryDelayMs = 2000,
}) {
  // One slow answer must not throw away minutes of collection: retry, then report what was lost.
  const http = createHttp(async (url, kind) => {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await transport.resource(url, kind);
      } catch (error) {
        if (attempt === 3) throw error;
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
      }
    }
  });
  const entities = new Map();
  const statements = [];
  const failures = [];
  const load = async (qids) => {
    const missing = [...new Set(qids)].filter((qid) => !entities.has(qid));
    for (let start = 0; start < missing.length; start += 50) {
      const url = entitiesUrl(missing.slice(start, start + 50));
      const data = await callApi(url, http.json);
      for (const [qid, entity] of Object.entries(data.entities ?? {}))
        entities.set(qid, 'missing' in entity ? null : entity);
    }
  };
  const search = async (query) => {
    try {
      const data = await callApi(searchUrl(query), http.json);
      return (data.query?.search ?? []).map((hit) => hit.title).filter((id) => /^Q\d+$/.test(id));
    } catch (error) {
      failures.push({ query, error: error.message });
      log(`consulta perdida: ${query}: ${error.message}`);
      return [];
    }
  };
  const add = (found, qid, via, position) => {
    const entry = found.get(qid) ?? { qid, via: [], linkPosition: 1 };
    if (!entry.via.includes(via)) entry.via.push(via);
    entry.linkPosition = Math.min(entry.linkPosition, position);
    found.set(qid, entry);
  };

  const neighbors = async (qid) => {
    await load([qid]);
    const entity = entities.get(qid);
    if (!entity) return [];
    statements.push(...labelStatements(entity));
    const found = new Map();
    for (const [property, { via, position }] of Object.entries(neighborProperties))
      for (const target of statementIds(entity, property)) add(found, target, via, position);
    const item = readItem(entity);
    const lang = item.titles.pt ? 'pt' : item.titles.en ? 'en' : null;
    const types = new Map();
    if (lang) {
      try {
        const article = await readArticle(lang, item.titles[lang], http);
        const positions = linkPositions(article);
        for (const target of article.targets ?? []) {
          if (!target.qid || !positions.has(target.title)) continue;
          types.set(target.qid, target.type);
          add(found, target.qid, 'link no texto', positions.get(target.title));
        }
      } catch (error) {
        failures.push({ query: `artigo de ${qid}`, error: error.message });
        log(`sem artigo para ${qid}: ${error.message}`);
      }
    }
    if (qid === root) {
      for (const query of [`haswbstatement:P279=${root}`, `haswbstatement:P1142=${root}`])
        for (const hit of await search(query)) add(found, hit, 'rótulo no Wikidata', 0.3);
      for (const query of regionalProbes(root))
        for (const hit of await search(query)) add(found, hit, 'sonda regional', 0.3);
    }
    found.delete(qid);
    for (const parent of [...statementIds(entity, 'P31'), ...statementIds(entity, 'P279')])
      if (qid === root) found.delete(parent);
    for (const item of classItems) found.delete(item);
    const qids = [...found.keys()];
    await load(qids);
    const kinds = await classifyQids(
      qids.filter((id) => !types.has(id)),
      http,
    );
    return qids.flatMap((id) => {
      const neighbor = entities.get(id);
      if (!neighbor) return [];
      const read = readItem(neighbor);
      const lang = read.titles.pt ? 'pt' : read.titles.en ? 'en' : null;
      if (!lang) return [];
      return [
        {
          ...read,
          ...found.get(id),
          lang,
          title: read.titles[lang],
          type: types.get(id) ?? kinds.get(id)?.type ?? 'não-classificado',
        },
      ];
    });
  };
  return { neighbors, statements, entities, failures };
}

/**
 * Final candidate list: decisions by a person survive a new discovery (matched by QID), and what the
 * graph already holds is marked, so it reconciles to one entity instead of becoming a copy.
 */
export function mergeCandidates(found, { previous = [], knownQids = new Map() } = {}) {
  const editor = new Map(
    previous.filter((c) => c.decidedBy === 'editor' && c.qid).map((c) => [c.qid, c]),
  );
  return found.map((candidate) => {
    const decided = editor.get(candidate.qid);
    const known = knownQids.get(candidate.qid);
    return {
      ...candidate,
      ...(decided
        ? { decision: decided.decision, decidedBy: 'editor', reason: decided.reason }
        : {
            decidedBy: candidate.decision === 'accept' ? 'rule:expansao' : null,
          }),
      ...(known ? { existingEntityId: known } : {}),
    };
  });
}

async function knownEntities(root) {
  const { readSourceGraph } = await import('../content/source-graph.mjs');
  const graph = await readSourceGraph(join(root, 'content/knowledge'));
  return new Map(
    graph.atlases.flatMap((atlas) =>
      atlas.entities
        .filter((entity) => entity.externalIds?.wikidata)
        .map((entity) => [entity.externalIds.wikidata, entity.id]),
    ),
  );
}

export async function main(argv = process.argv.slice(2)) {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      'max-ring': { type: 'string', default: '3' },
      replay: { type: 'string' },
      output: { type: 'string' },
    },
  });
  const [slug] = positionals;
  if (!/^[a-z][a-z0-9-]*$/.test(slug ?? ''))
    throw new Error(
      'Uso: tradicao:discover <slug> [--max-ring N] [--replay <captura>] [--output <arquivo>]',
    );
  const { rootQid } = traditionFor(slug);
  const recorder = values.replay ? null : recordingHttp(liveHttp);
  const http = values.replay
    ? replayHttp((await loadCapture(join(wikiRawRoot, slug, values.replay))).responses)
    : recorder.http;
  const { neighbors, statements, failures } = createNeighbors({
    http,
    root: rootQid,
    log: console.log,
  });
  const registry = await readFile(join(projectRoot, 'content/traditions', `${slug}.json`), 'utf8')
    .then(JSON.parse)
    .catch(() => null);
  const output =
    values.output ?? join(projectRoot, 'scripts/ingestion/wiki-extract/candidates', `${slug}.json`);
  try {
    const found = await expand([rootQid], neighbors, {
      maxRing: Number(values['max-ring']),
      expandable: (entry) => expandableTypes.has(entry.type) && mentionTypes.has(entry.type),
      ...(registry?.discovery?.thresholds ? { thresholds: registry.discovery.thresholds } : {}),
      ...(registry?.discovery?.ringCaps ? { ringCaps: registry.discovery.ringCaps } : {}),
    });
    const previous = await readFile(output, 'utf8')
      .then((text) => JSON.parse(text).candidates)
      .catch(() => []);
    const candidates = mergeCandidates(found, {
      previous,
      knownQids: await knownEntities(projectRoot),
    });
    await mkdir(dirname(output), { recursive: true });
    await writeFile(
      output,
      `${JSON.stringify({ tradition: slug, rootQid, generatedAt: new Date().toISOString(), failures, candidates }, null, 2)}\n`,
    );
    const labels = join(projectRoot, 'generated/wiki-extract', slug, 'wikidata-labels.json');
    await mkdir(dirname(labels), { recursive: true });
    await writeFile(labels, `${JSON.stringify(statements, null, 2)}\n`);
    const { byDecision, byRing } = summarize(candidates);
    console.log(
      `${candidates.length} candidatos: ${byDecision.accept} aceitos, ${byDecision.review} na lista curta, ${byDecision.discard} descartados; por anel: ${JSON.stringify(byRing)}`,
    );
    if (failures.length) console.log(`${failures.length} consultas perdidas, listadas no arquivo.`);
    console.log(`gravado em ${relative(projectRoot, output)}`);
  } finally {
    if (recorder?.responses.size) {
      const directory = await saveCapture(slug, recorder.responses);
      console.log(
        `captura: ${relative(projectRoot, directory)} (${recorder.responses.size} respostas)`,
      );
    }
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
