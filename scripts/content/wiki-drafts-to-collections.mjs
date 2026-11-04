// Converts Wikipedia extraction drafts (generated/wiki-extract/<tradição>/extracts/*.json) into
// knowledge collections (content/knowledge/collections/atlas-<tradição>.<sha256>.json) and
// registers them in content/knowledge/manifest.json. Every claim is left with a pending review:
// no human review is recorded here.
// A draft whose Wikidata item already belongs to an existing entity is merged into that entity:
// its sources, evidences, citations, claims and reviews are appended to the existing collection.
import './register-source-modules.mjs';
import { mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  formatJson,
  readSourceGraph,
  sha256,
  sourceDirectory,
  validateSourceGraph,
} from './source-graph.mjs';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
export const defaultDraftRoot = join(projectRoot, 'generated/wiki-extract');
const GRAPH_VERSION = '1.1.0';
const LICENSE = 'CC BY-SA 4.0';
const LICENSE_URL = 'https://creativecommons.org/licenses/by-sa/4.0/';
export const REVIEW_NOTE = 'Revisão humana não registrada';

export const TRADITIONS = [
  { key: 'marxismo', label: 'Marxismo' },
  { key: 'liberalismo', label: 'Liberalismo' },
  { key: 'social-democracia', label: 'Social-democracia' },
  { key: 'outras-ideologias', label: 'Outras ideologias' },
  { key: 'anarquismo', label: 'Anarquismo' },
];
const TRADITION_BY_KEY = new Map(
  TRADITIONS.map((tradition, index) => [tradition.key, { ...tradition, index }]),
);
export const atlasIdFor = (key) => `atlas-${key}`;
const OWN_ATLAS_IDS = new Set(TRADITIONS.map((tradition) => atlasIdFor(tradition.key)));

// Records added by this converter carry these id prefixes. They are stripped from existing
// collections before the additions are derived again, so repeated runs give the same files.
const ADDED_RECORD_ID = /^(src|ev|cit|claim|rev)-wiki-/;
const RECORD_KEYS = ['sources', 'evidences', 'citations', 'claims', 'reviews'];

// Draft type -> schema kind. Types the drafts actually use are listed; "topic" is generic in Wikipedia.
const KIND_BY_DRAFT_TYPE = {
  person: 'person',
  pessoa: 'person',
  ideology: 'ideology',
  ideologia: 'ideology',
  concept: 'concept',
  conceito: 'concept',
  event: 'event',
  acontecimento: 'event',
  work: 'work',
  obra: 'work',
  institution: 'institution',
  organização: 'institution',
  organizacao: 'institution',
  place: 'place',
  lugar: 'place',
  party: 'party',
  partido: 'party',
  topic: 'concept',
  tópico: 'concept',
};

// Drafts declared as "topic" also cover people and movements. Their kind is fixed by subject here;
// any other "topic" draft falls back to "concept".
const TOPIC_KINDS = {
  'topic-anarchism': 'ideology',
  'topic-anarquismo': 'ideology',
  'topic-emma-goldman': 'person',
  'topic-errico-malatesta': 'person',
  'topic-mikhail-bakunin': 'person',
  'topic-pierre-joseph-proudhon': 'person',
  'topic-piotr-kropotkin': 'person',
  'topic-adam-ferguson': 'person',
  'topic-adam-smith': 'person',
  'topic-adamantios-korais': 'person',
  'topic-ali-latifiyan': 'person',
  'topic-david-hume': 'person',
  'topic-frederic-bastiat': 'person',
  'topic-isaiah-berlin': 'person',
  'topic-jeremy-bentham': 'person',
  'topic-john-locke': 'person',
  'topic-john-stuart-mill': 'person',
  'topic-jose-ortega-y-gasset': 'person',
  'topic-mary-wollstonecraft': 'person',
  'topic-montesquieu': 'person',
  'topic-robert-nozick': 'person',
  'topic-friedrich-engels': 'person',
  'topic-karl-marx': 'person',
  'topic-lenin': 'person',
  'topic-mao-tse-tung': 'person',
  'topic-bruno-kreisky': 'person',
  'topic-eduard-bernstein': 'person',
  'topic-ferdinand-lassalle': 'person',
  'topic-jean-jaures': 'person',
  'topic-olof-palme': 'person',
  'topic-willy-brandt': 'person',
  'topic-liberalismo': 'ideology',
  'topic-liberalismo-classico': 'ideology',
  'topic-liberalismo-social': 'ideology',
  'topic-libertarianismo': 'ideology',
  'topic-marxismo': 'ideology',
  'topic-marxismo-leninismo-maoismo': 'ideology',
  'topic-maoismo': 'ideology',
  'topic-eurocomunismo': 'ideology',
  'topic-comunismo': 'ideology',
  'topic-socialismo': 'ideology',
  'topic-fascismo': 'ideology',
  'topic-nacionalismo': 'ideology',
  'topic-ecologismo': 'ideology',
  'topic-social-democracia': 'ideology',
  'topic-social-democracy': 'ideology',
};

const CLAIM_CLASSIFICATION = {
  fact: 'documented-fact',
  interpretation: 'interpretation',
  controversy: 'contested-claim',
};

export function kindForDraft(draft) {
  const declared = draft.entity.type;
  if (declared === 'topic' || declared === 'tópico' || declared === 'topico') {
    return TOPIC_KINDS[draft.entity.id] ?? 'concept';
  }
  const kind = KIND_BY_DRAFT_TYPE[declared];
  if (!kind)
    throw new Error(`Tipo de rascunho sem mapeamento: "${declared}" em ${draft.entity.id}.`);
  return kind;
}

export function classificationForKind(kind) {
  const classification = CLAIM_CLASSIFICATION[kind];
  if (!classification) throw new Error(`Tipo de afirmação sem mapeamento: "${kind}".`);
  return classification;
}

export function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const sentence = (text) => (/[.!?…]$/.test(text) ? text : `${text}.`);
const dateOf = (isoInstant) => isoInstant.slice(0, 10);
const weight = (draft) => draft.dates.length + draft.relations.length + draft.claims.length;
const emptyRecords = () => ({
  sources: [],
  evidences: [],
  citations: [],
  claims: [],
  reviews: [],
  retrievedAt: [],
});

function wikipediaTitle(url, fallback) {
  const title = decodeURIComponent(new URL(url).pathname.split('/wiki/')[1] ?? '').replaceAll(
    '_',
    ' ',
  );
  return title.trim() || fallback;
}

function assertDraftShape({ tradition, file, draft }) {
  const where = `${tradition}/${file}`;
  const strings = [
    draft?.entity?.id,
    draft?.entity?.label,
    draft?.entity?.type,
    draft?.source?.url,
    draft?.source?.revision,
    draft?.source?.language,
    draft?.source?.retrievedAt,
    draft?.summary,
  ];
  if (strings.some((value) => typeof value !== 'string' || value.trim() === '')) {
    throw new Error(`Rascunho incompleto: ${where}.`);
  }
  if (draft.source.license !== LICENSE) {
    throw new Error(`Licença inesperada em ${where}: ${draft.source.license}.`);
  }
  for (const key of ['dates', 'relations', 'claims']) {
    if (!Array.isArray(draft[key])) throw new Error(`Campo "${key}" ausente em ${where}.`);
  }
}

const compareItems = (a, b) =>
  TRADITION_BY_KEY.get(a.tradition).index - TRADITION_BY_KEY.get(b.tradition).index ||
  (a.file < b.file ? -1 : a.file > b.file ? 1 : 0);

// The same article URL extracted twice: keep the most complete reading (first wins on ties).
function dedupeByUrl(ordered, dropped) {
  const best = new Map();
  for (const item of ordered) {
    const url = item.draft.source.url;
    const current = best.get(url);
    if (!current) {
      best.set(url, item);
    } else if (weight(item.draft) > weight(current.draft)) {
      dropped.push({
        id: `${current.tradition}/${current.draft.entity.id}`,
        reason: `mesma URL; mantida ${item.tradition}/${item.draft.entity.id}`,
      });
      best.set(url, item);
    } else {
      dropped.push({
        id: `${item.tradition}/${item.draft.entity.id}`,
        reason: `mesma URL; mantida ${current.tradition}/${current.draft.entity.id}`,
      });
    }
  }
  return ordered.filter((item) => best.get(item.draft.source.url) === item);
}

// Drafts sharing a Wikidata item (for example pt and en articles) become one entity.
// The Portuguese draft with the most content is canonical; the others only add sources and claims.
function groupByEntity(items) {
  const groups = new Map();
  for (const item of items) {
    const key = item.draft.entity.qid ?? `draft:${item.draft.entity.id}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()].map((members) => {
    const canonical = members.reduce((best, item) => {
      const bestIsPt = best.draft.source.language === 'pt';
      const itemIsPt = item.draft.source.language === 'pt';
      if (itemIsPt !== bestIsPt) return itemIsPt ? item : best;
      return weight(item.draft) > weight(best.draft) ? item : best;
    });
    return [canonical, ...members.filter((item) => item !== canonical)];
  });
}

function reserveSlug(label, qid, reserved) {
  const base = slugify(label);
  if (!base) throw new Error(`Rótulo sem slug possível: "${label}".`);
  const candidates = [base, `${base}-wikipedia`, `${base}-${(qid ?? 'draft').toLowerCase()}`];
  const slug = candidates.find((candidate) => !reserved.has(candidate));
  if (!slug) throw new Error(`Não foi possível gerar slug único para "${label}".`);
  reserved.add(slug);
  return { slug, adjusted: slug !== base };
}

function statementsFor(draft) {
  const dates = draft.dates.map((item) => ({
    text: sentence(`${item.event} (${item.date})`),
    classification: 'documented-fact',
    quote: item.quote,
  }));
  const relations = draft.relations.map((item) => ({
    text: sentence(`Relação com ${item.target}: ${item.relation}`),
    classification: 'documented-fact',
    quote: item.quote,
  }));
  const claims = draft.claims.map((item) => ({
    text: sentence(item.statement),
    classification: classificationForKind(item.kind),
    quote: item.quote,
  }));
  return [...dates, ...relations, ...claims].map((statement, index) => {
    if (typeof statement.quote !== 'string' || statement.quote.trim() === '') {
      throw new Error(`Afirmação sem citação literal em ${draft.entity.id}: "${statement.text}".`);
    }
    return { ...statement, number: String(index + 1).padStart(3, '0') };
  });
}

function recordsForDraft(item, entityId) {
  const { draft } = item;
  const base = `wiki-${draft.entity.id}`;
  const sourceId = `src-${base}`;
  const accessedAt = dateOf(draft.source.retrievedAt);
  const source = {
    id: sourceId,
    title: `${draft.entity.label} (Wikipédia ${draft.source.language})`,
    url: draft.source.url,
    edition: `revisão ${draft.source.revision}; licença ${LICENSE}; extração assistida por IA (${draft.review?.model ?? 'assistente'})`,
    publicationDate: null,
  };
  const records = { sources: [source], evidences: [], citations: [], claims: [], reviews: [] };
  for (const statement of statementsFor(draft)) {
    const suffix = `${base}-${statement.number}`;
    const evidence = {
      id: `ev-${suffix}`,
      sourceId,
      locator: statement.quote,
      accessedAt,
      note: null,
    };
    const citation = { id: `cit-${suffix}`, evidenceId: evidence.id, relation: 'supports' };
    const claim = {
      id: `claim-${suffix}`,
      entityId,
      text: statement.text,
      classification: statement.classification,
      editorialStatus: 'pending',
      citationIds: [citation.id],
    };
    const review = {
      id: `rev-${suffix}`,
      claimId: claim.id,
      status: 'pending',
      reviewer: null,
      reviewedAt: null,
      note: REVIEW_NOTE,
    };
    records.evidences.push(evidence);
    records.citations.push(citation);
    records.claims.push(claim);
    records.reviews.push(review);
  }
  return records;
}

function entityFor(canonical, members, slug) {
  const { draft } = canonical;
  const language = draft.source.language;
  const title = wikipediaTitle(draft.source.url, draft.entity.label);
  const context = [
    `Rascunho assistido por IA a partir da Wikipédia (${language}), revisão ${draft.source.revision}.`,
    draft.source.truncated === true ? 'Leitura parcial do artigo; cobertura incompleta.' : null,
    `${REVIEW_NOTE}.`,
  ]
    .filter(Boolean)
    .join(' ');
  const merged = members.slice(1).map((item) => item.draft.source.language);
  return {
    id: `wiki-${draft.entity.id}`,
    kind: kindForDraft(draft),
    slug,
    title: draft.entity.label,
    summary: draft.summary,
    aliases: [],
    context: merged.length ? `${context} Fontes adicionais em: ${merged.join(', ')}.` : context,
    temporalExtent: null,
    uncertainty: 'unknown',
    revision: 1,
    sections: [{ heading: 'Resumo', paragraphs: [draft.summary] }],
    editorialStatus: 'pending',
    textLocale: language === 'pt' ? 'pt-BR' : 'en',
    externalIds: /^Q\d+$/.test(draft.entity.qid ?? '')
      ? { wikidata: draft.entity.qid, wikipedia: title }
      : undefined,
    discoveryMetadata: {
      description: null,
      wikipediaTitle: title,
      wikipediaUrl: draft.source.url,
      wikipediaLanguage: language,
      categories: [],
      fetchedAt: dateOf(draft.source.retrievedAt),
      contentLicense: LICENSE,
      contentLicenseUrl: LICENSE_URL,
      attribution: `Texto da Wikipédia (${language}), revisão ${draft.source.revision}, ${LICENSE}`,
    },
  };
}

// Removes the records this converter added earlier, leaving the collection as it was before.
function withoutAddedRecords(atlas) {
  const keep = (record) => !ADDED_RECORD_ID.test(record.id);
  return {
    ...atlas,
    sources: atlas.sources.filter(keep),
    evidences: atlas.evidences.filter(keep),
    citations: atlas.citations.filter(keep),
    claims: atlas.claims.filter(keep),
    reviews: atlas.reviews.filter(keep),
  };
}

// Pure conversion: drafts in, collections out. Deterministic for the same input and existing atlases.
export function convertDrafts(items, { existingAtlases = [] } = {}) {
  items.forEach(assertDraftShape);
  const ordered = [...items].sort(compareItems);
  const dropped = [];
  const kept = dedupeByUrl(ordered, dropped);
  const groups = groupByEntity(kept).sort((a, b) => compareItems(a[0], b[0]));

  const reservedSlugs = new Set(
    existingAtlases.flatMap((atlas) => [
      atlas.slug,
      ...atlas.entities.map((entity) => entity.slug),
    ]),
  );
  for (const tradition of TRADITIONS) {
    const atlasSlug = `${tradition.key}-wikipedia`;
    if (reservedSlugs.has(atlasSlug)) throw new Error(`Slug de coleção já usado: ${atlasSlug}.`);
    reservedSlugs.add(atlasSlug);
  }

  // A Wikidata item identifies one entity in the whole graph.
  const existingByQid = new Map(
    existingAtlases.flatMap((atlas) =>
      atlas.entities
        .filter((entity) => entity.externalIds?.wikidata)
        .map((entity) => [
          entity.externalIds.wikidata,
          { id: entity.id, kind: entity.kind, atlasId: atlas.id },
        ]),
    ),
  );

  const buckets = new Map(
    TRADITIONS.map((tradition) => [
      tradition.key,
      {
        entities: [],
        ...emptyRecords(),
        relationTargets: 0,
        dates: 0,
        merged: [],
        slugAdjustments: [],
      },
    ]),
  );
  const additions = new Map(); // existing atlas id -> records appended to it
  const mergedIntoExisting = [];

  for (const members of groups) {
    const canonical = members[0];
    const target = existingByQid.get(canonical.draft.entity.qid);
    if (target) {
      const kind = kindForDraft(canonical.draft);
      if (kind !== target.kind) {
        throw new Error(
          `Tipo divergente ao mesclar ${canonical.tradition}/${canonical.draft.entity.id} em ${target.id}: ${kind} x ${target.kind}.`,
        );
      }
      const addition = additions.get(target.atlasId) ?? emptyRecords();
      for (const item of members) {
        const records = recordsForDraft(item, target.id);
        for (const key of RECORD_KEYS) addition[key].push(...records[key]);
        addition.retrievedAt.push(item.draft.source.retrievedAt);
      }
      additions.set(target.atlasId, addition);
      mergedIntoExisting.push({
        entity: target.id,
        atlas: target.atlasId,
        drafts: members.map((item) => `${item.tradition}/${item.draft.entity.id}`),
      });
      continue;
    }

    const bucket = buckets.get(canonical.tradition);
    const { slug, adjusted } = reserveSlug(
      canonical.draft.entity.label,
      canonical.draft.entity.qid,
      reservedSlugs,
    );
    const entity = entityFor(canonical, members, slug);
    bucket.entities.push(entity);
    if (adjusted) bucket.slugAdjustments.push({ id: entity.id, slug });
    if (members.length > 1) {
      bucket.merged.push({
        entity: entity.id,
        drafts: members.map((item) => `${item.tradition}/${item.draft.entity.id}`),
      });
    }
    for (const item of members) {
      const records = recordsForDraft(item, entity.id);
      for (const key of RECORD_KEYS) bucket[key].push(...records[key]);
      bucket.retrievedAt.push(item.draft.source.retrievedAt);
      bucket.relationTargets += item.draft.relations.length;
      bucket.dates += item.draft.dates.length;
    }
  }

  const augmentedAtlases = existingAtlases
    .filter((atlas) => additions.has(atlas.id))
    .map((atlas) => {
      const addition = additions.get(atlas.id);
      const updatedAt = [atlas.updatedAt, ...addition.retrievedAt.map(dateOf)].sort().at(-1);
      return {
        ...atlas,
        updatedAt,
        sources: [...atlas.sources, ...addition.sources],
        evidences: [...atlas.evidences, ...addition.evidences],
        citations: [...atlas.citations, ...addition.citations],
        claims: [...atlas.claims, ...addition.claims],
        reviews: [...atlas.reviews, ...addition.reviews],
      };
    });

  const atlases = [];
  const traditions = [];
  for (const tradition of TRADITIONS) {
    const bucket = buckets.get(tradition.key);
    if (bucket.entities.length === 0) continue;
    const updatedAt = dateOf(bucket.retrievedAt.sort().at(-1));
    const atlas = {
      id: atlasIdFor(tradition.key),
      slug: `${tradition.key}-wikipedia`,
      title: `${tradition.label} (rascunhos da Wikipédia)`,
      description: `Rascunhos assistidos por IA extraídos da Wikipédia, ${LICENSE}. Afirmações e resumos com revisão pendente; nenhuma revisão humana registrada.`,
      version: '1.0.0',
      updatedAt,
      entityIds: bucket.entities.map((entity) => entity.id),
      entities: bucket.entities,
      sources: bucket.sources,
      evidences: bucket.evidences,
      citations: bucket.citations,
      claims: bucket.claims,
      reviews: bucket.reviews,
      assetLicenses: [],
      relations: [],
      learningPaths: [],
    };
    atlases.push(atlas);
    traditions.push({
      key: tradition.key,
      label: tradition.label,
      atlasId: atlas.id,
      entities: atlas.entities.length,
      sources: atlas.sources.length,
      claims: atlas.claims.length,
      relationTargetsAsText: bucket.relationTargets,
      dates: bucket.dates,
      merged: bucket.merged,
      slugAdjustments: bucket.slugAdjustments,
    });
  }
  return {
    atlases,
    augmentedAtlases,
    traditions,
    dropped,
    merged: traditions.flatMap((item) => item.merged),
    mergedIntoExisting,
    slugAdjustments: traditions.flatMap((item) => item.slugAdjustments),
  };
}

export async function readDrafts(root = defaultDraftRoot) {
  const items = [];
  for (const tradition of TRADITIONS) {
    const directory = join(root, tradition.key, 'extracts');
    let names;
    try {
      names = (await readdir(directory)).filter((name) => name.endsWith('.json')).sort();
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    for (const file of names) {
      const draft = JSON.parse(await readFile(join(directory, file), 'utf8'));
      items.push({ tradition: tradition.key, file, draft });
    }
  }
  return items;
}

async function writeAtlasFile(directory, file, bytes) {
  const path = join(directory, file);
  try {
    await writeFile(path, bytes, { flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (sha256(await readFile(path)) !== sha256(bytes)) throw Error(`Colisão de hash: ${path}`);
  }
}

async function writeAtomic(path, body) {
  const pending = `${path}.pending-${randomUUID()}`;
  try {
    await writeFile(pending, body, { flag: 'wx' });
    await rename(pending, path);
  } finally {
    await unlink(pending).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}

async function readVerifiedAtlas(directory, entry) {
  const bytes = await readFile(join(directory, entry.file));
  if (sha256(bytes) !== entry.sha256) throw Error(`Hash inválido na coleção ${entry.id}`);
  return JSON.parse(bytes);
}

// Reads drafts, converts them and registers the results. Collections that receive merged content
// get a new file and manifest entry in place; untouched collections keep their entries and files.
// Running twice produces the same files and manifest.
export async function convertDraftsToCollections({
  root = defaultDraftRoot,
  directory = sourceDirectory,
  write = true,
} = {}) {
  const items = await readDrafts(root);
  await readSourceGraph(directory); // validates the current graph before changing it
  const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
  const baseAtlases = [];
  for (const entry of manifest.collections) {
    if (OWN_ATLAS_IDS.has(entry.id)) continue;
    baseAtlases.push(withoutAddedRecords(await readVerifiedAtlas(directory, entry)));
  }

  const converted = convertDrafts(items, { existingAtlases: baseAtlases });
  const augmentedById = new Map(converted.augmentedAtlases.map((atlas) => [atlas.id, atlas]));
  const updatedAt = [
    manifest.updatedAt,
    ...converted.atlases.map((atlas) => atlas.updatedAt),
    ...converted.augmentedAtlases.map((atlas) => atlas.updatedAt),
  ]
    .sort()
    .at(-1);
  // Write the schema-parsed form so key order matches what writeSourceGraph re-emits.
  const graph = validateSourceGraph({
    id: manifest.id,
    version: GRAPH_VERSION,
    updatedAt,
    atlases: [
      ...baseAtlases.map((atlas) => augmentedById.get(atlas.id) ?? atlas),
      ...converted.atlases,
    ],
  });
  const parsedById = new Map(graph.atlases.map((atlas) => [atlas.id, atlas]));

  const files = [];
  const collectionEntry = async (atlas) => {
    const bytes = await formatJson(atlas);
    const hash = sha256(bytes);
    const file = `collections/${atlas.id}.${hash}.json`;
    files.push({ file, bytes, id: atlas.id });
    return { id: atlas.id, file, sha256: hash };
  };
  const entries = [];
  for (const entry of manifest.collections) {
    if (OWN_ATLAS_IDS.has(entry.id)) continue;
    entries.push(
      augmentedById.has(entry.id) ? await collectionEntry(parsedById.get(entry.id)) : entry,
    );
  }
  for (const atlas of graph.atlases.slice(baseAtlases.length)) {
    entries.push(await collectionEntry(atlas));
  }
  const nextManifest = { ...manifest, version: GRAPH_VERSION, updatedAt, collections: entries };
  if (write) {
    await mkdir(join(directory, 'collections'), { recursive: true });
    for (const { file, bytes } of files) await writeAtlasFile(directory, file, bytes);
    await writeAtomic(join(directory, 'manifest.json'), await formatJson(nextManifest));
  }
  return {
    written: write,
    traditions: converted.traditions,
    dropped: converted.dropped,
    merged: converted.merged,
    mergedIntoExisting: converted.mergedIntoExisting,
    augmentedCollections: converted.augmentedAtlases.map((atlas) => atlas.id),
    slugAdjustments: converted.slugAdjustments,
    files: files.map(({ id, file }) => ({ id, file })),
  };
}

function formatReport(report) {
  const lines = report.traditions.map(
    (item) =>
      `${item.label}: ${item.entities} entidades novas, ${item.sources} fontes, ${item.claims} afirmações (${item.dates} datas, relações em texto: ${item.relationTargetsAsText})`,
  );
  lines.push(`Descartados por URL repetida: ${report.dropped.length}`);
  for (const item of report.dropped) lines.push(`  - ${item.id}: ${item.reason}`);
  lines.push(`Entidades com fontes de idiomas múltiplos: ${report.merged.length}`);
  for (const item of report.merged) lines.push(`  - ${item.entity} <- ${item.drafts.join(', ')}`);
  lines.push(
    `Rascunhos mesclados em entidades existentes (mesmo QID): ${report.mergedIntoExisting.length}`,
  );
  for (const item of report.mergedIntoExisting)
    lines.push(`  - ${item.entity} (${item.atlas}) <- ${item.drafts.join(', ')}`);
  lines.push(
    `Coleções existentes ampliadas: ${report.augmentedCollections.join(', ') || 'nenhuma'}`,
  );
  lines.push(`Slugs ajustados por colisão: ${report.slugAdjustments.length}`);
  for (const item of report.slugAdjustments) lines.push(`  - ${item.id} -> ${item.slug}`);
  lines.push(report.written ? 'Arquivos gravados:' : 'Modo sem gravação; arquivos calculados:');
  for (const item of report.files) lines.push(`  - ${item.id}: ${item.file}`);
  return lines.join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await convertDraftsToCollections();
  console.log(formatReport(report));
}
