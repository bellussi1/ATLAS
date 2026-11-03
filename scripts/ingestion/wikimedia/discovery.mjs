import { getJson } from './client.mjs';

// Discovery finds candidate records for a tradition before anything enters the
// editorial collections. It only reads public APIs on the Wikimedia allowlist,
// never writes content, and its output is reviewed before ingestion.

export const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
export const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
export const PT_WIKI_API = 'https://pt.wikipedia.org/w/api.php';

const TRANSIENT_ERRORS = new Set([
  'cirrussearch-too-busy-error',
  'ratelimited',
  'maxlag',
  'readonly',
]);

// MediaWiki reports transient overload as a 200 response with an error object,
// so retry on those codes before treating the response as a failure.
export async function callApi(url, fetchJson = getJson, attempts = 5) {
  for (let attempt = 1; ; attempt += 1) {
    const data = await fetchJson(url);
    const code = data.error?.code;
    if (!code) return data;
    const transient = TRANSIENT_ERRORS.has(code) || code.startsWith('internal_api_error');
    if (!transient || attempt === attempts)
      throw new Error(`API Wikimedia recusou a consulta (${code}): ${url}`);
    await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
  }
}

const chunk = (items, size) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, i * size + size),
  );

export function searchUrl(srsearch, offset = 0) {
  const url = new URL(WIKIDATA_API);
  url.search = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch,
    srnamespace: '0',
    srlimit: '50',
    sroffset: String(offset),
    format: 'json',
  }).toString();
  return url.toString();
}

export async function searchIds(srsearch, fetchJson = getJson) {
  const ids = [];
  let offset = 0;
  for (;;) {
    const data = await callApi(searchUrl(srsearch, offset), fetchJson);
    ids.push(...data.query.search.map((hit) => hit.title));
    if (!data.continue) return [...new Set(ids)];
    offset = data.continue.sroffset;
  }
}

export function entitiesUrl(ids) {
  const url = new URL(WIKIDATA_API);
  url.search = new URLSearchParams({
    action: 'wbgetentities',
    ids: ids.join('|'),
    props: 'labels|descriptions|claims|sitelinks',
    languages: 'pt|en',
    format: 'json',
  }).toString();
  return url.toString();
}

export async function fetchEntities(ids, fetchJson = getJson) {
  const entities = new Map();
  for (const batch of chunk(ids, 50)) {
    const data = await callApi(entitiesUrl(batch), fetchJson);
    for (const [id, entity] of Object.entries(data.entities ?? {}))
      if (!('missing' in entity) && entity.id) entities.set(id, entity);
  }
  return entities;
}

const values = (entity, property) =>
  (entity.claims?.[property] ?? [])
    .map((claim) => claim.mainsnak?.datavalue?.value?.id)
    .filter(Boolean);

export function claimYear(entity, property) {
  const time = entity.claims?.[property]?.[0]?.mainsnak?.datavalue?.value?.time;
  if (!time) return null;
  const year = Number(time.slice(1, 5));
  return time[0] === '-' ? -year : year;
}

export function claimImage(entity) {
  return entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value ?? null;
}

// Instance-of targets seen in the Marxism graph. Anything else is reported as
// `other` with its P31 values so the mapping can be extended on evidence.
const KIND_BY_INSTANCE = {
  Q5: 'person',
  Q6256: 'country',
  Q3024240: 'country',
  Q43229: 'organization',
  Q7278: 'organization',
  Q1190554: 'event',
  Q571: 'work',
  Q7725634: 'work',
  Q13442814: 'work',
  Q8261: 'work',
  Q7257: 'ideology',
};

export function classify(entity, rootQid = 'Q7264') {
  const instances = values(entity, 'P31');
  for (const id of instances) if (KIND_BY_INSTANCE[id]) return KIND_BY_INSTANCE[id];
  if (values(entity, 'P279').includes(rootQid)) return 'ideology';
  return 'other';
}

export function candidateRecord(entity, roles, rootQid = 'Q7264') {
  const label = (lang) => entity.labels?.[lang]?.value ?? null;
  const description = (lang) => entity.descriptions?.[lang]?.value ?? null;
  const sitelinks = entity.sitelinks ?? {};
  return {
    qid: entity.id,
    kind: classify(entity, rootQid),
    labels: { pt: label('pt'), en: label('en') },
    descriptions: { pt: description('pt'), en: description('en') },
    sitelinks: {
      ptwiki: Boolean(sitelinks.ptwiki),
      enwiki: Boolean(sitelinks.enwiki),
      count: Object.keys(sitelinks).length,
    },
    image: claimImage(entity),
    born: claimYear(entity, 'P569'),
    died: claimYear(entity, 'P570'),
    instanceOf: values(entity, 'P31').slice(0, 4),
    roles: [...roles].sort(),
  };
}

/**
 * Standard Wikidata properties used to discover any tradition: members labelled with
 * the ideology (P1142, which also brings parties), people influenced by its founders
 * (P737), works about it (P921) and its sub-currents (P279). Labels, not evidence.
 */
export function searchesFor({ rootQid, founderQids = [] }) {
  return [
    { role: 'political-ideology', srsearch: `haswbstatement:P1142=${rootQid}` },
    ...founderQids.map((qid) => ({
      role: 'influenced-by-founder',
      srsearch: `haswbstatement:P737=${qid}`,
    })),
    { role: 'main-subject', srsearch: `haswbstatement:P921=${rootQid}` },
    { role: 'subclass-of-root', srsearch: `haswbstatement:P279=${rootQid}` },
  ];
}

export const MARXISM_SEARCHES = searchesFor({ rootQid: 'Q7264', founderQids: ['Q9061'] });

export async function discoverWikidataCandidates(
  searches = MARXISM_SEARCHES,
  fetchJson = getJson,
  rootQid = 'Q7264',
) {
  const rolesById = new Map();
  for (const { role, srsearch } of searches) {
    const ids = await searchIds(srsearch, fetchJson);
    for (const id of ids) rolesById.set(id, new Set([...(rolesById.get(id) ?? []), role]));
  }
  const entities = await fetchEntities([...rolesById.keys()], fetchJson);
  return [...entities.values()].map((entity) =>
    candidateRecord(entity, rolesById.get(entity.id), rootQid),
  );
}

export function commonsCategoryUrl(category, type = 'subcat') {
  const url = new URL(COMMONS_API);
  url.search = new URLSearchParams({
    action: 'query',
    list: 'categorymembers',
    cmtitle: category,
    cmtype: type,
    cmlimit: '500',
    format: 'json',
  }).toString();
  return url.toString();
}

// Walks Commons subcategories breadth-first to a fixed depth, returning the tree
// as a flat list with the depth at which each category was reached.
export async function commonsCategoryTree(
  root,
  { depth = 2, limit = 80 } = {},
  fetchJson = getJson,
) {
  const seen = new Map([[root, 0]]);
  let frontier = [root];
  for (let level = 1; level <= depth && frontier.length; level += 1) {
    const next = [];
    for (const category of frontier) {
      if (seen.size >= limit) break;
      const data = await callApi(commonsCategoryUrl(category), fetchJson);
      for (const member of data.query.categorymembers) {
        if (seen.has(member.title) || seen.size >= limit) continue;
        seen.set(member.title, level);
        next.push(member.title);
      }
    }
    frontier = next;
  }
  return [...seen].map(([title, level]) => ({ title, depth: level }));
}

export function ptWikipediaIntroUrl(title) {
  const url = new URL(PT_WIKI_API);
  url.search = new URLSearchParams({
    action: 'query',
    prop: 'extracts|info',
    exintro: '1',
    explaintext: '1',
    inprop: 'url',
    titles: title,
    format: 'json',
  }).toString();
  return url.toString();
}

export async function ptWikipediaIntro(title, fetchJson = getJson) {
  const data = await callApi(ptWikipediaIntroUrl(title), fetchJson);
  const page = Object.values(data.query.pages)[0];
  return {
    title: page.title,
    url: page.fullurl,
    pageid: page.pageid,
    extract: page.extract ?? null,
    license: 'CC BY-SA 4.0 (Wikipédia em português)',
  };
}
