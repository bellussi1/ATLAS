#!/usr/bin/env node
/**
 * Régua de cobertura de uma tradição (estágio 0 do pipeline).
 *
 * Mede, a partir dos snapshots versionados (sem rede), o que uma leitura tem: entidades por tipo,
 * relações, fontes, capítulos preenchidos, blocos e imagens. O piso (`coverage-floor.json`) é o
 * mínimo que uma nova tradição precisa atingir; `coverage.spec.mjs` garante que as duas leituras de
 * referência (Marxismo e Liberalismo) o cumprem. A régua mede presença, não qualidade: revisão
 * humana continua sendo uma porta separada (estágio 12).
 */
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Tipos do grafo agrupados nos rótulos da régua. */
export const bucketOfKind = {
  person: 'pessoa',
  party: 'partido',
  event: 'evento',
  concept: 'conceito',
  work: 'obra',
  institution: 'instituicao',
  country: 'estado',
  regime: 'estado',
  'historical-polity': 'estado',
  government: 'estado',
  place: 'lugar',
  ideology: 'ideologia',
};
export const entityBuckets = [
  'pessoa',
  'partido',
  'evento',
  'conceito',
  'obra',
  'instituicao',
  'estado',
  'lugar',
  'ideologia',
  'outros',
];

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

/** Every collection of the source graph, without validating (validation is `content:build`). */
async function readAtlases(root) {
  const directory = join(root, 'content/knowledge');
  const manifest = await readJson(join(directory, 'manifest.json'));
  return Promise.all(manifest.collections.map((item) => readJson(join(directory, item.file))));
}

/** Entity ids a page points at, through blocks, items, portrait and supplement edges. */
function referencedEntityIds(page, supplement) {
  const ids = new Set();
  const add = (list) => {
    for (const id of list ?? []) ids.add(id);
  };
  if (page.portrait) ids.add(page.portrait.entityId);
  for (const chapter of page.chapters) {
    for (const block of chapter.blocks) {
      add(block.entityIds);
      add(block.markerIds);
      if (block.rootEntityId) ids.add(block.rootEntityId);
      for (const work of block.works ?? []) if (work.entityId) ids.add(work.entityId);
      for (const item of block.items ?? []) add(item.entityIds);
      for (const topic of block.topics ?? [])
        for (const key of ['defence', 'criticism', 'response', 'limits']) add(topic[key].entityIds);
    }
  }
  for (const edge of supplement.edges ?? []) {
    ids.add(edge.from);
    ids.add(edge.to);
  }
  for (const claim of supplement.positions ?? []) ids.add(claim.entityId);
  return ids;
}

function referencedSourceIds(page, supplement) {
  const ids = new Set();
  const add = (list) => {
    for (const id of list ?? []) ids.add(id);
  };
  for (const chapter of page.chapters) {
    add(chapter.sourceIds);
    for (const block of chapter.blocks) {
      add(block.sourceIds);
      for (const item of block.items ?? []) add(item.sourceIds);
      for (const topic of block.topics ?? [])
        for (const key of ['defence', 'criticism', 'response', 'limits']) add(topic[key].sourceIds);
    }
  }
  for (const edge of supplement.edges ?? []) add(edge.sources);
  for (const claim of supplement.positions ?? []) add(claim.sourceIds);
  return ids;
}

/**
 * Pure measurement over already-loaded data. `scope` = records of the page's own atlas plus every
 * record the page, its edges and its position claims reference.
 */
export function measure({ page, supplement, atlases }) {
  const own = atlases.find((atlas) => atlas.id === page.atlasId);
  if (!own) throw new Error(`Atlas "${page.atlasId}" ausente do grafo.`);
  const byId = new Map(atlases.flatMap((atlas) => atlas.entities.map((e) => [e.id, e])));
  const scopeIds = new Set(own.entities.map((e) => e.id));
  for (const id of referencedEntityIds(page, supplement)) if (byId.has(id)) scopeIds.add(id);

  const entities = Object.fromEntries(entityBuckets.map((bucket) => [bucket, 0]));
  for (const id of scopeIds) entities[bucketOfKind[byId.get(id).kind] ?? 'outros'] += 1;
  entities.total = scopeIds.size;

  const relationIds = new Set();
  for (const atlas of atlases)
    for (const relation of atlas.relations)
      if (scopeIds.has(relation.fromEntityId) && scopeIds.has(relation.toEntityId))
        relationIds.add(relation.id);

  const sourceIds = new Set([
    ...own.sources.map((s) => s.id),
    ...(supplement.sources ?? []).map((s) => s.id),
  ]);
  const cited = referencedSourceIds(page, supplement);

  const coverageOf = (chapter) => chapter.coverage ?? 'complete';
  const blockTypes = {};
  for (const chapter of page.chapters)
    for (const block of chapter.blocks) blockTypes[block.type] = (blockTypes[block.type] ?? 0) + 1;

  const usable = atlases
    .flatMap((atlas) => atlas.assetLicenses)
    .filter(
      (asset) =>
        asset.status === 'known' &&
        asset.reproduction === 'allowed' &&
        asset.entityId &&
        scopeIds.has(asset.entityId),
    );

  return {
    slug: page.slug,
    published: page.published,
    reviewStatus: page.review.status,
    entities,
    relations: { grafo: relationIds.size, tese: (supplement.edges ?? []).length },
    sources: {
      total: sourceIds.size,
      citadas: [...cited].filter((id) => sourceIds.has(id)).length,
    },
    chapters: {
      total: page.chapters.length,
      comBlocos: page.chapters.filter((c) => c.blocks.length > 0).length,
      completos: page.chapters.filter((c) => coverageOf(c) === 'complete').length,
      pendentes: page.chapters.filter((c) => coverageOf(c) === 'pending').length,
    },
    blocks: {
      total: Object.values(blockTypes).reduce((sum, n) => sum + n, 0),
      tipos: Object.keys(blockTypes).length,
      porTipo: blockTypes,
    },
    images: {
      licenciadas: usable.length,
      entidadesComImagem: new Set(usable.map((asset) => asset.entityId)).size,
      retrato: Boolean(page.portrait),
    },
  };
}

export async function measureTradition(slug, root = projectRoot) {
  const page = await readJson(join(root, 'content/ideologies', slug, 'page.json'));
  const supplement = await readJson(join(root, 'content/graph', `${slug}.json`)).catch((error) => {
    if (error.code === 'ENOENT') return { sources: [], edges: [], positions: [] };
    throw error;
  });
  return measure({ page, supplement, atlases: await readAtlases(root) });
}

/** Flattens the numeric leaves of the metrics, e.g. `entities.pessoa`. `porTipo` is detail only. */
export function flatten(metrics) {
  const flat = {};
  const walk = (value, path) => {
    for (const [key, child] of Object.entries(value)) {
      if (key === 'porTipo') continue;
      const next = path ? `${path}.${key}` : key;
      if (typeof child === 'number') flat[next] = child;
      else if (typeof child === 'boolean' && path === 'images') flat[next] = Number(child);
      else if (child && typeof child === 'object') walk(child, next);
    }
  };
  walk(metrics, '');
  return flat;
}

export async function loadFloor(root = projectRoot) {
  return readJson(join(root, 'scripts/tradicao/coverage-floor.json'));
}

/** Gaps against the floor: one `{ metric, minimum | maximum, actual }` per metric out of bounds. */
export function checkFloor(metrics, floor) {
  const flat = flatten(metrics);
  const low = Object.entries(floor.minimum ?? {})
    .map(([metric, minimum]) => ({ metric, minimum, actual: flat[metric] ?? 0 }))
    .filter((gap) => gap.actual < gap.minimum);
  const high = Object.entries(floor.maximum ?? {})
    .map(([metric, maximum]) => ({ metric, maximum, actual: flat[metric] ?? 0 }))
    .filter((gap) => gap.actual > gap.maximum);
  return [...low, ...high];
}

export function formatReport(metrics, gaps) {
  const e = metrics.entities;
  const lines = [
    `${metrics.slug}  publicada=${metrics.published}  revisão=${metrics.reviewStatus}`,
    `  entidades ${e.total}: ${entityBuckets
      .filter((b) => e[b])
      .map((b) => `${b} ${e[b]}`)
      .join(', ')}`,
    `  relações: ${metrics.relations.grafo} no grafo, ${metrics.relations.tese} no dossiê`,
    `  fontes: ${metrics.sources.total} (${metrics.sources.citadas} citadas)`,
    `  capítulos: ${metrics.chapters.comBlocos}/${metrics.chapters.total} com blocos, ${metrics.chapters.completos} completos, ${metrics.chapters.pendentes} pendentes`,
    `  blocos: ${metrics.blocks.total} em ${metrics.blocks.tipos} tipos`,
    `  imagens: ${metrics.images.licenciadas} licenciadas em ${metrics.images.entidadesComImagem} entidades${metrics.images.retrato ? ', com retrato' : ''}`,
  ];
  if (gaps) {
    lines.push(
      gaps.length ? `  piso: ${gaps.length} lacunas` : '  piso: atingido',
      ...gaps.map((g) =>
        g.minimum === undefined
          ? `    - ${g.metric}: ${g.actual} > ${g.maximum}`
          : `    - ${g.metric}: ${g.actual} < ${g.minimum}`,
      ),
    );
  }
  return lines.join('\n');
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { json: { type: 'boolean', default: false } },
  });
  if (!positionals.length) throw new Error('Uso: npm run tradicao:coverage -- <slug>... [--json]');
  const floor = await loadFloor();
  const results = [];
  for (const slug of positionals) {
    const metrics = await measureTradition(slug);
    results.push({ metrics, gaps: checkFloor(metrics, floor) });
  }
  if (values.json) console.log(JSON.stringify(results, null, 2));
  else for (const { metrics, gaps } of results) console.log(formatReport(metrics, gaps));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
