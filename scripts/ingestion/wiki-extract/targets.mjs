// Resolves the titles linked from an article to their canonical page and Wikidata item, in batches.
import { getJson } from '../wikimedia/client.mjs';

const batchSize = 50;

/** Maps each requested title, through normalization and redirects, to `{ title, qid, missing }`. */
export async function resolveTargets(lang, titles) {
  const unique = [...new Set(titles)];
  const resolved = new Map();
  for (let start = 0; start < unique.length; start += batchSize) {
    const batch = unique.slice(start, start + batchSize);
    const url = new URL(`https://${lang}.wikipedia.org/w/api.php`);
    for (const [name, value] of Object.entries({
      action: 'query',
      titles: batch.join('|'),
      redirects: '1',
      prop: 'pageprops',
      ppprop: 'wikibase_item',
      format: 'json',
      formatversion: '2',
    }))
      url.searchParams.set(name, value);
    for (const [title, target] of mapResolution(batch, await getJson(url.href)))
      resolved.set(title, target);
  }
  return resolved;
}

/** Pure step of `resolveTargets`, kept apart from the network so it can be tested. */
export function mapResolution(titles, data) {
  const normalized = new Map((data.query?.normalized ?? []).map((entry) => [entry.from, entry.to]));
  const redirects = new Map((data.query?.redirects ?? []).map((entry) => [entry.from, entry.to]));
  const pages = new Map((data.query?.pages ?? []).map((page) => [page.title, page]));
  return titles.map((title) => {
    const step = normalized.get(title) ?? title;
    const canonical = redirects.get(step) ?? step;
    const page = pages.get(canonical);
    return [
      title,
      {
        title: canonical,
        qid: page?.pageprops?.wikibase_item ?? null,
        missing: !page || page.missing === true || page.invalid === true,
      },
    ];
  });
}

const wikidataApi = 'https://www.wikidata.org/w/api.php';
/** Links followed from an item when looking for its type: `instance of` and `subclass of` steps. */
const classDepth = 4;

/**
 * Target types and the Wikidata classes that stand for them. The type of an item is the one whose
 * class is nearest through P31/P279; on a tie, the earlier entry wins.
 */
export const targetTypes = [
  { type: 'pessoa', items: ['Q5'] },
  { type: 'partido', items: ['Q7278'] },
  { type: 'ideologia', items: ['Q7257', 'Q12909644'] },
  { type: 'organização', items: ['Q43229'] },
  { type: 'movimento', items: ['Q49773'] },
  { type: 'obra', items: ['Q17537576'] },
  { type: 'acontecimento', items: ['Q1190554'] },
  { type: 'lugar', items: ['Q2221906'] },
  { type: 'conceito', items: ['Q151885', 'Q17737', 'Q187588', 'Q1401304'] },
];

/** Link targets that are pages of the wiki itself (special, project and file namespaces). */
const wikiNamespace =
  /^(especial|wikipédia|categoria|ficheiro|arquivo|imagem|predefinição|ajuda|portal|anexo|discussão|usuário|special|wikipedia|category|file|template|help):/i;

const statementIds = (statements = []) =>
  statements
    .filter((statement) => statement.rank !== 'deprecated')
    .map((statement) => statement.mainsnak?.datavalue?.value?.id)
    .filter(Boolean);

/** `{ instanceOf, subclassOf }` of each Wikidata item, read 50 per request. */
async function readStatements(qids) {
  const found = new Map();
  for (let start = 0; start < qids.length; start += batchSize) {
    const batch = qids.slice(start, start + batchSize);
    const url = new URL(wikidataApi);
    for (const [name, value] of Object.entries({
      action: 'wbgetentities',
      ids: batch.join('|'),
      props: 'claims',
      format: 'json',
    }))
      url.searchParams.set(name, value);
    const entities = (await getJson(url.href)).entities ?? {};
    for (const qid of batch) {
      const claims = entities[qid]?.claims ?? {};
      found.set(qid, {
        instanceOf: statementIds(claims.P31),
        subclassOf: statementIds(claims.P279),
      });
    }
  }
  return found;
}

const parents = (graph, qid) => [
  ...(graph.get(qid)?.instanceOf ?? []),
  ...(graph.get(qid)?.subclassOf ?? []),
];

/** Statements of the items and of their classes, read level by level up to `depth` links away. */
async function classGraph(qids, depth) {
  const graph = new Map();
  let frontier = [...new Set(qids)];
  for (let level = 0; level <= depth && frontier.length; level += 1) {
    const unread = frontier.filter((qid) => !graph.has(qid));
    for (const [qid, statements] of await readStatements(unread)) graph.set(qid, statements);
    frontier = [...new Set(frontier.flatMap((qid) => parents(graph, qid)))].filter(
      (qid) => !graph.has(qid),
    );
  }
  return graph;
}

/** Links from `qid` to each item within `hops` steps, the item itself at distance 0. */
function distances(graph, qid, hops) {
  const found = new Map([[qid, 0]]);
  let frontier = [qid];
  for (let hop = 1; hop <= hops && frontier.length; hop += 1) {
    frontier = [...new Set(frontier.flatMap((node) => parents(graph, node)))].filter(
      (node) => !found.has(node),
    );
    for (const node of frontier) found.set(node, hop);
  }
  return found;
}

/** Pure step of `classifyQids`: the nearest target type, `outro` if none, `sem-classe` without P31. */
export function classifyItem(graph, qid) {
  const found = distances(graph, qid, classDepth);
  let nearest = null;
  for (const { type, items } of targetTypes)
    for (const item of items) {
      const distance = found.get(item);
      if (distance !== undefined && (nearest === null || distance < nearest.distance))
        nearest = { type, distance };
    }
  const classes = graph.get(qid)?.instanceOf ?? [];
  if (nearest) return { ...nearest, classes };
  return { type: classes.length ? 'outro' : 'sem-classe', distance: null, classes };
}

/** Type of each Wikidata item, as `{ type, classes }`; `classes` are the P31 values. */
export async function classifyQids(qids) {
  const unique = [...new Set(qids)];
  const graph = await classGraph(unique, classDepth - 1);
  return new Map(unique.map((qid) => [qid, classifyItem(graph, qid)]));
}

/**
 * Type of a link target, as `{ type, classes, distance }`. Explicit fallbacks: `não-artigo` for wiki
 * namespaces, `ausente` when the page does not exist, `sem-item` when it has no Wikidata item.
 */
export function targetKind({ title, qid, missing }, kinds) {
  if (wikiNamespace.test(title)) return { type: 'não-artigo', classes: [], distance: null };
  if (missing) return { type: 'ausente', classes: [], distance: null };
  if (!qid) return { type: 'sem-item', classes: [], distance: null };
  return kinds.get(qid) ?? { type: 'não-classificado', classes: [], distance: null };
}
