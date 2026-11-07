// Converts Wikipedia extraction drafts (generated/wiki-extract/<tradição>/extracts/*.json) into
// knowledge collections (content/knowledge/collections/atlas-<tradição>.<sha256>.json) and
// registers them in content/knowledge/manifest.json. Every claim is left with a pending review:
// no human review is recorded here.
//
// Full mode rebuilds the collections that have drafts. For an isolated verbete use partial mode:
//   node scripts/content/wiki-drafts-to-collections.mjs --partial --only <id> [--dry-run]
// It preserves every existing collection and record, appends only new records, and attaches a
// missing QID by title.
// A draft whose Wikidata item already belongs to an existing entity is merged into that entity:
// its sources, evidences, citations, claims and reviews are appended to the existing collection.
// Relations that passed the guards and the second pass become edges, with source and nature; a
// relation whose target is not in the graph waits in the report. Wikidata labels (P737, P1142)
// become associations, never documented influence. Licensed images become asset licences.
import './register-source-modules.mjs';
import { readdirSync, readFileSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { positionFromArticle, positions } from '../tradicao/position.mjs';
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

const BASE_TRADITIONS = [
  { key: 'marxismo', label: 'Marxismo' },
  { key: 'liberalismo', label: 'Liberalismo' },
  { key: 'social-democracia', label: 'Social-democracia' },
  { key: 'outras-ideologias', label: 'Outras ideologias' },
  { key: 'anarquismo', label: 'Anarquismo' },
];

/** The fixed list keeps its order (ids depend on it); registered traditions follow, by key. */
export function mergeTraditions(base, registered) {
  const known = new Set(base.map((tradition) => tradition.key));
  const extra = registered
    .filter((entry) => !known.has(entry.slug))
    .map((entry) => ({ key: entry.slug, label: entry.titles.pt }))
    .sort((a, b) => (a.key < b.key ? -1 : 1));
  return [...base, ...extra];
}

function registeredTraditions() {
  const directory = join(projectRoot, 'content/traditions');
  try {
    return readdirSync(directory)
      .filter((name) => name.endsWith('.json'))
      .map((name) => JSON.parse(readFileSync(join(directory, name), 'utf8')));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export const TRADITIONS = mergeTraditions(BASE_TRADITIONS, registeredTraditions());
const TRADITION_BY_KEY = new Map(
  TRADITIONS.map((tradition, index) => [tradition.key, { ...tradition, index }]),
);
export const atlasIdFor = (key) => `atlas-${key}`;

// Records added by this converter carry these id prefixes. They are stripped from existing
// collections before the additions are derived again, so repeated runs give the same files.
const ADDED_RECORD_ID = /^(src|ev|cit|claim|rev|rel|asset)-wiki-/;
const RECORD_KEYS = [
  'sources',
  'evidences',
  'citations',
  'claims',
  'reviews',
  'relations',
  'assetLicenses',
];

/** Closed list of natures -> graph type and labels. Anything else never becomes an edge. */
export const EDGE_BY_NATURE = {
  influenciou: { type: 'influenced', label: 'influenciou', reverseLabel: 'foi influenciado por' },
  'participou-de': {
    type: 'participated_in',
    label: 'participou de',
    reverseLabel: 'teve a participação de',
  },
  'membro-de': {
    type: 'documented-association',
    label: 'foi membro de',
    reverseLabel: 'teve como membro',
  },
  fundou: { type: 'documented-association', label: 'fundou', reverseLabel: 'foi fundado por' },
  escreveu: { type: 'wrote', label: 'escreveu', reverseLabel: 'foi escrito por' },
  'desenvolveu-se-em': {
    type: 'developed_into',
    label: 'desenvolveu-se em',
    reverseLabel: 'deriva de',
  },
  'reagiu-contra': {
    type: 'reacted_against',
    label: 'reagiu contra',
    reverseLabel: 'recebeu reação de',
  },
  sucedeu: { type: 'documented-association', label: 'sucedeu', reverseLabel: 'foi sucedido por' },
  governou: {
    type: 'documented-association',
    label: 'governou',
    reverseLabel: 'foi governado por',
  },
  'ocorreu-em': {
    type: 'documented-association',
    label: 'ocorreu em',
    reverseLabel: 'foi palco de',
  },
};

/** Wikidata labels are contributors' classifications: association, whatever the property says. */
export const LABEL_EDGES = {
  P737: {
    label: 'é classificado em associação com',
    reverseLabel: 'recebe classificação de associação de',
  },
  P1142: {
    label: 'é classificado com a ideologia',
    reverseLabel: 'é a ideologia atribuída a',
  },
};

const SECTION_HEADINGS = {
  origem: 'Origem',
  'ideias-centrais': 'Ideias centrais',
  contexto: 'Contexto',
  controversias: 'Controvérsias',
  bibliografia: 'Bibliografia',
};
const SECTION_CLASSIFICATION = {
  origem: 'documented-fact',
  'ideias-centrais': 'attributed-thesis',
  contexto: 'documented-fact',
  controversias: 'contested-claim',
  bibliografia: 'documented-fact',
};

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
  movimento: 'institution',
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
/**
 * Content first: a draft with sections is a better reading than one with many short claims.
 * Claims are deliberately the last signal, so a noisy extraction cannot win a tie.
 */
const contentWeight = (draft) => [
  draft.sections?.length ?? 0,
  draft.dates.length,
  draft.relations.length,
  draft.summary?.length ?? 0,
];
const isRicher = (candidate, current) => {
  const a = contentWeight(candidate);
  const b = contentWeight(current);
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index];
  }
  return false;
};
/** Structured relation of a rich draft; the old free-text ones stay as claims. */
const isStructured = (relation) => typeof relation.nature === 'string';
const emptyRecords = () => ({
  sources: [],
  evidences: [],
  citations: [],
  claims: [],
  reviews: [],
  relations: [],
  assetLicenses: [],
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
    } else if (isRicher(item.draft, current.draft)) {
      dropped.push({
        id: `${current.tradition}/${current.draft.entity.id}`,
        reason: `mesma URL; mantida ${item.tradition}/${item.draft.entity.label}`,
      });
      best.set(url, item);
    } else {
      dropped.push({
        id: `${item.tradition}/${item.draft.entity.id}`,
        reason: `mesma URL; mantida ${current.tradition}/${current.draft.entity.label}`,
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
      return isRicher(item.draft, best.draft) ? item : best;
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

/**
 * Political position as the source states it, never as the project's own label: an attributed
 * thesis whose evidence is the sentence of the article.
 */
const POSITION_LABEL = new Map(positions.map((item) => [item.value, item.label]));
const POSITIONED_TYPES = new Set(['ideologia', 'movimento', 'partido', 'organização', 'conceito']);
export function positionStatement(position) {
  const label = POSITION_LABEL.get(position.value);
  return {
    text: sentence(
      label
        ? `Posição política descrita na fonte: ${label}`
        : 'Posição política descrita na fonte: varia conforme a vertente',
    ),
    classification: 'attributed-thesis',
    quote: position.quote,
  };
}

function statementsFor(draft) {
  const dates = draft.dates.map((item) => ({
    text: sentence(`${item.event} (${item.date})`),
    classification: 'documented-fact',
    quote: item.quote,
  }));
  const relations = draft.relations
    .filter((item) => !isStructured(item))
    .map((item) => ({
      text: sentence(`Relação com ${item.target}: ${item.relation}`),
      classification: 'documented-fact',
      quote: item.quote,
    }));
  const sections = (draft.sections ?? []).map((item) => ({
    text: sentence(item.text),
    classification: SECTION_CLASSIFICATION[item.kind] ?? 'documented-fact',
    quote: item.quote,
  }));
  const claims = draft.claims.map((item) => ({
    text: sentence(item.statement),
    classification: classificationForKind(item.kind),
    quote: item.quote,
  }));
  const position = draft.position ? [positionStatement(draft.position)] : [];
  return [...sections, ...dates, ...relations, ...claims, ...position].map((statement, index) => {
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
  const records = { ...emptyRecords(), sources: [source] };
  delete records.retrievedAt;
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

/** Terms and nicknames of every reading of the entity, to link keywords; the title is not one. */
function aliasesFor(members, title) {
  const seen = new Set([title.toLocaleLowerCase('pt-BR')]);
  const aliases = [];
  for (const { draft } of members)
    for (const item of draft.glossary ?? [])
      for (const term of [
        item.term,
        ...(item.pt ?? []),
        ...(item.en ?? []),
        ...(item.aliases ?? []),
      ]) {
        const key = term?.trim().toLocaleLowerCase('pt-BR');
        if (!key || seen.has(key)) continue;
        seen.add(key);
        aliases.push(term.trim());
      }
  return aliases;
}

/**
 * Edges of one draft: only relations of the closed list that the second pass confirmed, whose target
 * resolves to an entity by QID. Everything else is reported, not guessed. The edge keeps the literal
 * quote as evidence and its Wikipedia source; its review stays pending.
 */
function edgesForDraft(item, entityId, resolve, pending) {
  const { draft } = item;
  const base = `wiki-${draft.entity.id}`;
  const records = { evidences: [], relations: [] };
  for (const [index, relation] of (draft.relations ?? []).filter(isStructured).entries()) {
    const edge = EDGE_BY_NATURE[relation.nature];
    const where = `${item.tradition}/${draft.entity.id}`;
    const wait = (reason) => pending.push({ draft: where, target: relation.target, reason });
    if (!edge) {
      wait(`natureza fora da lista: ${relation.nature}`);
      continue;
    }
    if (relation.verified !== true) {
      wait('sem confirmação da segunda passada');
      continue;
    }
    const targetId = relation.targetQid ? resolve(relation.targetQid) : null;
    if (!targetId) {
      wait(relation.targetQid ? 'alvo fora do grafo' : 'alvo sem QID');
      continue;
    }
    if (targetId === entityId) {
      wait('alvo é a própria entidade');
      continue;
    }
    const number = String(index + 1).padStart(3, '0');
    const evidenceId = `ev-${base}-rel-${number}`;
    const forward = relation.direction !== 'alvo-para-entidade';
    records.evidences.push({
      id: evidenceId,
      sourceId: `src-${base}`,
      locator: relation.quote,
      accessedAt: dateOf(draft.source.retrievedAt),
      note: null,
    });
    records.relations.push({
      id: `rel-${base}-${number}`,
      fromEntityId: forward ? entityId : targetId,
      toEntityId: forward ? targetId : entityId,
      type: edge.type,
      label: edge.label,
      reverseLabel: edge.reverseLabel,
      context: sentence(relation.sentence),
      temporalExtent: null,
      uncertainty: 'unknown',
      evidenceIds: [evidenceId],
      editorialStatus: 'pending',
      provenance: {
        source: 'wikipedia',
        url: draft.source.url,
        retrievedAt: dateOf(draft.source.retrievedAt),
      },
    });
  }
  return records;
}

/** Wikidata P737/P1142 between two graph entities, as associations with the item as the source. */
function labelEdges(statements, resolve, existingPairs, atlasOf, kindOf, retrievedAt) {
  const seen = new Set();
  const byAtlas = new Map();
  for (const statement of [...statements].sort((a, b) =>
    `${a.qid}${a.property}${a.targetQid}` < `${b.qid}${b.property}${b.targetQid}` ? -1 : 1,
  )) {
    const edge = LABEL_EDGES[statement.property];
    const fromId = resolve(statement.qid);
    const toId = resolve(statement.targetQid);
    if (!edge || !fromId || !toId || fromId === toId) continue;
    // P1142 on a person is a contributor's label, not a political affiliation; keep it out of the graph.
    if (statement.property === 'P1142' && kindOf(fromId) === 'person') continue;
    const key = `${statement.qid}-${statement.property}-${statement.targetQid}`.toLowerCase();
    if (seen.has(key) || existingPairs.has(`${fromId}>${toId}`)) continue;
    seen.add(key);
    const atlas = atlasOf(fromId);
    if (!atlas) continue;
    const records = byAtlas.get(atlas) ?? { sources: [], evidences: [], relations: [] };
    const sourceId = `src-wiki-wd-${statement.qid.toLowerCase()}`;
    if (!records.sources.some((source) => source.id === sourceId))
      records.sources.push({
        id: sourceId,
        title: `${statement.qid} (Wikidata)`,
        url: `https://www.wikidata.org/wiki/${statement.qid}`,
        edition: 'Wikidata; dados estruturados sob CC0; rótulo de contribuidores',
        publicationDate: null,
      });
    records.evidences.push({
      id: `ev-wiki-wd-${key}`,
      sourceId,
      locator: `${statement.qid}, ${statement.property} = ${statement.targetQid}`,
      accessedAt: retrievedAt,
      note: 'Rótulo do Wikidata; não documenta influência.',
    });
    records.relations.push({
      id: `rel-wiki-wd-${key}`,
      fromEntityId: fromId,
      toEntityId: toId,
      type: 'associated_with',
      label: edge.label,
      reverseLabel: edge.reverseLabel,
      context: `Classificação de catálogo colaborativo. Não é influência documentada.`,
      temporalExtent: null,
      uncertainty: 'unknown',
      evidenceIds: [`ev-wiki-wd-${key}`],
      editorialStatus: 'pending',
      provenance: { source: 'wikidata', url: statement.url, retrievedAt },
    });
    byAtlas.set(atlas, records);
  }
  return byAtlas;
}

function entityFor(canonical, members, slug) {
  const { draft } = canonical;
  const language = draft.source.language;
  const title = wikipediaTitle(draft.source.url, draft.entity.label);
  const context = [
    'Síntese de fonte enciclopédica com revisão editorial pendente.',
    draft.source.truncated === true ? 'Cobertura parcial da fonte.' : null,
  ]
    .filter(Boolean)
    .join(' ');
  const merged = members.slice(1).map((item) => item.draft.source.language);
  const richSections = Object.entries(SECTION_HEADINGS).flatMap(([kind, heading]) => {
    const paragraphs = (draft.sections ?? []).filter((s) => s.kind === kind).map((s) => s.text);
    return paragraphs.length ? [{ heading, paragraphs }] : [];
  });
  return {
    id: `wiki-${draft.entity.id}`,
    kind: kindForDraft(draft),
    slug,
    title: draft.entity.label,
    summary: draft.summary,
    aliases: aliasesFor(members, draft.entity.label),
    context: merged.length
      ? `${context} Fontes adicionais em outro idioma: ${merged.join(', ')}.`
      : context,
    temporalExtent: null,
    uncertainty: 'unknown',
    revision: 1,
    sections: [{ heading: 'Resumo', paragraphs: [draft.summary] }, ...richSections],
    editorialStatus: 'pending',
    textLocale: language === 'pt' ? 'pt-BR' : 'en',
    externalIds: /^Q\d+$/.test(draft.entity.qid ?? '')
      ? { wikidata: draft.entity.qid, wikipedia: title }
      : undefined,
    discoveryMetadata: {
      description: draft.oneLine ?? null,
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
    relations: atlas.relations.filter(keep),
    assetLicenses: atlas.assetLicenses.filter(keep),
  };
}

// Pure conversion: drafts in, collections out. Deterministic for the same input and existing atlases.
export function convertDrafts(
  items,
  { existingAtlases = [], wikidataLabels = [], images = {} } = {},
) {
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
  const drafted = new Set(items.map((item) => item.tradition));
  for (const tradition of TRADITIONS) {
    // A tradition without drafts here keeps its collection, which already holds this slug.
    if (!drafted.has(tradition.key)) continue;
    const atlasSlug = `${tradition.key}-wikipedia`;
    // In partial mode the collection itself is in `existingAtlases`; the draft is merged into it.
    const existingAtlas = existingAtlases.find((atlas) => atlas.id === atlasIdFor(tradition.key));
    if (existingAtlas) {
      reservedSlugs.add(existingAtlas.slug);
      continue;
    }
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
  const pendingRelations = [];
  const iconOnly = [];
  const usedAssetPaths = new Set(
    existingAtlases.flatMap((atlas) => (atlas.assetLicenses ?? []).map((asset) => asset.assetPath)),
  );

  // Whole-graph QID -> entity, known before any edge is built: an edge may point to a later draft.
  const entityIdByQid = new Map([...existingByQid].map(([qid, entity]) => [qid, entity.id]));
  for (const members of groups) {
    const { qid, id } = members[0].draft.entity;
    if (/^Q\d+$/.test(qid ?? '') && !entityIdByQid.has(qid)) entityIdByQid.set(qid, `wiki-${id}`);
  }
  const resolve = (qid) => entityIdByQid.get(qid) ?? null;

  /** Licensed image of a draft as an asset record; without one the UI falls back to the type icon. */
  const assetsFor = (item, entityId) => {
    const image = images[item.draft.entity.id];
    if (image?.status !== 'licensed') {
      if (image) iconOnly.push({ entity: entityId, icon: image.icon, reason: image.reason });
      return [];
    }
    const { restrictions: _restrictions, ...asset } = image.asset;
    if (usedAssetPaths.has(asset.assetPath)) return [];
    usedAssetPaths.add(asset.assetPath);
    return [{ id: `asset-wiki-${item.draft.entity.id}`, entityId, ...asset }];
  };

  for (const members of groups) {
    const canonical = members[0];
    const target = existingByQid.get(canonical.draft.entity.qid);
    if (target) {
      const kind = kindForDraft(canonical.draft);
      // "concept" is the type the automatic classification falls back to; the entity already in the
      // graph is more specific (ideology, movement), so it keeps its kind. Any other mismatch stops.
      if (kind !== target.kind && kind !== 'concept' && target.kind !== 'concept') {
        throw new Error(
          `Tipo divergente ao mesclar ${canonical.tradition}/${canonical.draft.entity.id} em ${target.id}: ${kind} x ${target.kind}.`,
        );
      }
      const addition = additions.get(target.atlasId) ?? emptyRecords();
      for (const item of members) {
        const records = recordsForDraft(item, target.id);
        const edges = edgesForDraft(item, target.id, resolve, pendingRelations);
        records.evidences.push(...edges.evidences);
        records.relations.push(...edges.relations);
        records.assetLicenses.push(...assetsFor(item, target.id));
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
      const edges = edgesForDraft(item, entity.id, resolve, pendingRelations);
      records.evidences.push(...edges.evidences);
      records.relations.push(...edges.relations);
      records.assetLicenses.push(...assetsFor(item, entity.id));
      for (const key of RECORD_KEYS) bucket[key].push(...records[key]);
      bucket.retrievedAt.push(item.draft.source.retrievedAt);
      bucket.relationTargets += item.draft.relations.filter((r) => !isStructured(r)).length;
      bucket.dates += item.draft.dates.length;
    }
  }

  // Wikidata labels attach to the atlas of their origin entity, when that entity was drafted here.
  const atlasOfDrafted = new Map();
  for (const [key, bucket] of buckets)
    for (const entity of bucket.entities) atlasOfDrafted.set(entity.id, { bucket: key });
  for (const entry of mergedIntoExisting) atlasOfDrafted.set(entry.entity, { atlas: entry.atlas });
  const kindOf = new Map();
  for (const atlas of existingAtlases)
    for (const entity of atlas.entities ?? []) kindOf.set(entity.id, entity.kind);
  for (const bucket of buckets.values())
    for (const entity of bucket.entities) kindOf.set(entity.id, entity.kind);
  const pairs = new Set(
    [
      ...existingAtlases.flatMap((atlas) => atlas.relations ?? []),
      ...[...buckets.values()].flatMap((bucket) => bucket.relations),
      ...[...additions.values()].flatMap((addition) => addition.relations),
    ].map((relation) => `${relation.fromEntityId}>${relation.toEntityId}`),
  );
  const labelRecords = labelEdges(
    wikidataLabels,
    resolve,
    pairs,
    (id) => {
      const owner = atlasOfDrafted.get(id);
      return owner ? (owner.bucket ? `bucket:${owner.bucket}` : `atlas:${owner.atlas}`) : null;
    },
    (id) => kindOf.get(id),
    [...buckets.values(), ...additions.values()]
      .flatMap((b) => b.retrievedAt)
      .map(dateOf)
      .sort()
      .at(-1) ?? null,
  );
  for (const [owner, records] of labelRecords) {
    const target = owner.startsWith('bucket:')
      ? buckets.get(owner.slice('bucket:'.length))
      : (additions.get(owner.slice('atlas:'.length)) ?? emptyRecords());
    target.sources.push(...records.sources);
    target.evidences.push(...records.evidences);
    target.relations.push(...records.relations);
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
        relations: [...atlas.relations, ...addition.relations],
        assetLicenses: [...atlas.assetLicenses, ...addition.assetLicenses],
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
      title: `${tradition.label}: registros em revisão`,
      description: `Sínteses por IA de fontes enciclopédicas, ${LICENSE}. Afirmações e resumos com revisão pendente; nenhuma revisão humana registrada.`,
      version: '1.0.0',
      updatedAt,
      entityIds: bucket.entities.map((entity) => entity.id),
      entities: bucket.entities,
      sources: bucket.sources,
      evidences: bucket.evidences,
      citations: bucket.citations,
      claims: bucket.claims,
      reviews: bucket.reviews,
      assetLicenses: bucket.assetLicenses,
      relations: bucket.relations,
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
      relations: atlas.relations.length,
      images: atlas.assetLicenses.length,
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
    pendingRelations,
    iconOnly,
    slugAdjustments: traditions.flatMap((item) => item.slugAdjustments),
  };
}

/** Optional per-tradition files written by discovery and by the image collector. */
export async function readSidecars(root = defaultDraftRoot) {
  const wikidataLabels = [];
  const images = {};
  const optional = (path) =>
    readFile(path, 'utf8')
      .then(JSON.parse)
      .catch((error) => {
        if (error.code === 'ENOENT') return null;
        throw error;
      });
  for (const tradition of TRADITIONS) {
    const labels = await optional(join(root, tradition.key, 'wikidata-labels.json'));
    if (labels) wikidataLabels.push(...labels);
    Object.assign(images, await optional(join(root, tradition.key, 'images.json')));
  }
  return { wikidataLabels, images };
}

export async function readDrafts(root = defaultDraftRoot, only = []) {
  const items = [];
  const filter = new Set(only.filter(Boolean));
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
      if (
        filter.size &&
        !filter.has(draft.entity?.id) &&
        !filter.has(file.replace(/\.json$/, '')) &&
        !filter.has(draft.entity?.qid)
      )
        continue;
      if (POSITIONED_TYPES.has(draft.entity?.type)) {
        // The article is the source of the position; without it the draft keeps none.
        const article = await readFile(join(root, tradition.key, 'articles', file), 'utf8')
          .then((text) => JSON.parse(text).article)
          .catch((error) => {
            if (error.code === 'ENOENT') return null;
            throw error;
          });
        const position = article ? positionFromArticle(article) : null;
        if (position) draft.position = position;
      }
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

/** Appends records whose id is new; an existing record is never replaced. */
function appendUnique(existing, additions) {
  const seen = new Set(existing.map((record) => record.id));
  const records = [...existing];
  let duplicates = 0;
  for (const record of additions) {
    if (seen.has(record.id)) {
      duplicates += 1;
      continue;
    }
    seen.add(record.id);
    records.push(record);
  }
  return { records, duplicates };
}

/**
 * In partial mode a draft may arrive without a QID in the graph but with the same title.
 * Attach only the QID (and Wikipedia identity) to the existing entity; its text and records stay.
 */
function patchQidsByTitle(atlases, groups) {
  let patched = atlases;
  const patches = [];
  const knownQids = new Set(
    atlases.flatMap((atlas) =>
      atlas.entities.flatMap((entity) =>
        entity.externalIds?.wikidata ? [entity.externalIds.wikidata] : [],
      ),
    ),
  );
  for (const members of groups) {
    const canonical = members[0];
    const { qid, label } = canonical.draft.entity;
    if (!/^Q\d+$/.test(qid ?? '') || knownQids.has(qid)) continue;
    const wanted = slugify(label);
    const candidates = [];
    for (const atlas of patched) {
      for (const entity of atlas.entities) {
        if (entity.externalIds?.wikidata) continue;
        if (slugify(entity.title) !== wanted && entity.slug !== wanted) continue;
        if (entity.kind !== kindForDraft(canonical.draft) && entity.kind !== 'concept') continue;
        candidates.push({ atlas, entity });
      }
    }
    if (candidates.length === 0) continue;
    if (candidates.length > 1)
      throw new Error(
        `Título "${label}" corresponde a mais de uma entidade sem QID; use --only e resolva manualmente.`,
      );
    const [{ atlas, entity }] = candidates;
    const wikipedia = wikipediaTitle(canonical.draft.source.url, label);
    patched = patched.map((item) =>
      item.id !== atlas.id
        ? item
        : {
            ...item,
            entities: item.entities.map((current) =>
              current.id !== entity.id
                ? current
                : {
                    ...current,
                    externalIds: { ...current.externalIds, wikidata: qid, wikipedia },
                  },
            ),
          },
    );
    knownQids.add(qid);
    patches.push({ atlas: atlas.id, entity: entity.id, qid });
  }
  return { atlases: patched, patches };
}

/** Removes repeated ids from an atlas, keeping the first record (the one already in the graph). */
function dedupeAtlas(atlas) {
  const entities = [...new Map(atlas.entities.map((entity) => [entity.id, entity])).values()];
  const deduped = { ...atlas, entities, entityIds: entities.map((entity) => entity.id) };
  for (const key of [...RECORD_KEYS, 'learningPaths'])
    deduped[key] = [...new Map((atlas[key] ?? []).map((record) => [record.id, record])).values()];
  return deduped;
}

/** Appends new entities and their records to an existing collection without dropping anything. */
function mergeAtlas(base, addition) {
  const existingEntityIds = new Set(base.entities.map((entity) => entity.id));
  const entities = [...base.entities];
  let entitiesAdded = 0;
  for (const entity of addition.entities) {
    if (existingEntityIds.has(entity.id)) continue;
    existingEntityIds.add(entity.id);
    entities.push(entity);
    entitiesAdded += 1;
  }
  const keep = (key) => appendUnique(base[key] ?? [], addition[key] ?? []);
  const sources = keep('sources');
  const evidences = keep('evidences');
  const citations = keep('citations');
  const claims = keep('claims');
  const reviews = keep('reviews');
  const relations = keep('relations');
  const assetLicenses = keep('assetLicenses');
  const learningPaths = keep('learningPaths');
  const duplicates =
    sources.duplicates +
    evidences.duplicates +
    citations.duplicates +
    claims.duplicates +
    reviews.duplicates +
    relations.duplicates +
    assetLicenses.duplicates +
    learningPaths.duplicates;
  return {
    atlas: {
      ...base,
      updatedAt: [base.updatedAt, addition.updatedAt].sort().at(-1),
      entityIds: entities.map((entity) => entity.id),
      entities,
      sources: sources.records,
      evidences: evidences.records,
      citations: citations.records,
      claims: claims.records,
      reviews: reviews.records,
      relations: relations.records,
      assetLicenses: assetLicenses.records,
      learningPaths: learningPaths.records,
    },
    entitiesAdded,
    duplicates,
  };
}

// Reads drafts, converts them and registers the results. Collections that receive merged content
// get a new file and manifest entry in place; untouched collections keep their entries and files.
// Running twice produces the same files and manifest.
export async function convertDraftsToCollections({
  root = defaultDraftRoot,
  directory = sourceDirectory,
  write = true,
  partial = false,
  only = [],
} = {}) {
  const items = await readDrafts(root, only);
  if (only.length && items.length === 0)
    throw new Error(`Nenhum rascunho corresponde a --only ${only.join(', ')}.`);
  await readSourceGraph(directory); // validates the current graph before changing it
  const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
  const sidecars = await readSidecars(root);

  if (partial) {
    // Never rebuild a collection and never strip records: an isolated draft only appends.
    const baseAtlases = [];
    for (const entry of manifest.collections)
      baseAtlases.push(await readVerifiedAtlas(directory, entry));
    const ordered = [...items].sort(compareItems);
    const groups = groupByEntity(dedupeByUrl(ordered, []));
    const { atlases: patched, patches } = patchQidsByTitle(baseAtlases, groups);
    const converted = convertDrafts(items, { existingAtlases: patched, ...sidecars });
    const augmentedById = new Map(converted.augmentedAtlases.map((atlas) => [atlas.id, atlas]));
    const finalAtlases = patched
      .map((atlas) => augmentedById.get(atlas.id) ?? atlas)
      .map(dedupeAtlas);
    let entitiesAdded = 0;
    let duplicates = 0;
    for (const atlas of converted.atlases) {
      const index = finalAtlases.findIndex((item) => item.id === atlas.id);
      if (index < 0) {
        finalAtlases.push(atlas);
        entitiesAdded += atlas.entities.length;
        continue;
      }
      const merged = mergeAtlas(finalAtlases[index], atlas);
      finalAtlases[index] = merged.atlas;
      entitiesAdded += merged.entitiesAdded;
      duplicates += merged.duplicates;
    }
    const changed = new Set([
      ...augmentedById.keys(),
      ...converted.atlases.map((atlas) => atlas.id),
      ...patches.map((patch) => patch.atlas),
    ]);
    const updatedAt = [
      manifest.updatedAt,
      ...finalAtlases.filter((atlas) => changed.has(atlas.id)).map((atlas) => atlas.updatedAt),
    ]
      .sort()
      .at(-1);
    const graph = validateSourceGraph({
      id: manifest.id,
      version: GRAPH_VERSION,
      updatedAt,
      atlases: finalAtlases,
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
      entries.push(changed.has(entry.id) ? await collectionEntry(parsedById.get(entry.id)) : entry);
    }
    for (const atlas of graph.atlases) {
      if (!entries.some((entry) => entry.id === atlas.id))
        entries.push(await collectionEntry(atlas));
    }
    const nextManifest = { ...manifest, version: GRAPH_VERSION, updatedAt, collections: entries };
    if (write) {
      await mkdir(join(directory, 'collections'), { recursive: true });
      for (const { file, bytes } of files) await writeAtlasFile(directory, file, bytes);
      await writeAtomic(join(directory, 'manifest.json'), await formatJson(nextManifest));
    }
    const recordsAdded = finalAtlases.reduce((sum, atlas) => {
      const before = baseAtlases.find((item) => item.id === atlas.id);
      if (!before) return sum + RECORD_KEYS.reduce((n, key) => n + (atlas[key]?.length ?? 0), 0);
      return (
        sum +
        RECORD_KEYS.reduce(
          (n, key) => n + (atlas[key]?.length ?? 0) - (before[key]?.length ?? 0),
          0,
        )
      );
    }, 0);
    return {
      mode: 'partial',
      written: write,
      preservedCollections: manifest.collections.length,
      changedCollections: [...changed],
      entitiesAdded,
      recordsAdded,
      duplicatedRecords: duplicates,
      patches,
      traditions: converted.traditions,
      dropped: converted.dropped,
      merged: converted.merged,
      mergedIntoExisting: converted.mergedIntoExisting,
      pendingRelations: converted.pendingRelations,
      iconOnly: converted.iconOnly,
      augmentedCollections: converted.augmentedAtlases.map((atlas) => atlas.id),
      slugAdjustments: converted.slugAdjustments,
      files: files.map(({ id, file }) => ({ id, file })),
    };
  }

  // Only collections rebuilt from drafts present here are replaced: a checkout holding the drafts
  // of one tradition must not erase the others from the graph.
  const rebuilt = new Set(items.map((item) => atlasIdFor(item.tradition)));
  const baseAtlases = [];
  for (const entry of manifest.collections) {
    if (rebuilt.has(entry.id)) continue;
    baseAtlases.push(withoutAddedRecords(await readVerifiedAtlas(directory, entry)));
  }

  const converted = convertDrafts(items, {
    existingAtlases: baseAtlases,
    ...sidecars,
  });
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
    if (rebuilt.has(entry.id)) continue;
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
    mode: 'full',
    written: write,
    traditions: converted.traditions,
    dropped: converted.dropped,
    merged: converted.merged,
    mergedIntoExisting: converted.mergedIntoExisting,
    pendingRelations: converted.pendingRelations,
    iconOnly: converted.iconOnly,
    augmentedCollections: converted.augmentedAtlases.map((atlas) => atlas.id),
    slugAdjustments: converted.slugAdjustments,
    files: files.map(({ id, file }) => ({ id, file })),
  };
}

function formatReport(report) {
  const lines = [];
  if (report.mode === 'partial') {
    lines.push(
      `Modo parcial: ${report.preservedCollections} coleções preservadas; ` +
        `${report.changedCollections.length} alteradas; ${report.entitiesAdded} entidades novas; ` +
        `${report.recordsAdded} registros adicionados; ${report.duplicatedRecords} já existiam.`,
    );
    for (const patch of report.patches)
      lines.push(`  - QID ${patch.qid} anexado a ${patch.entity} (${patch.atlas})`);
  }
  lines.push(
    ...report.traditions.map(
      (item) =>
        `${item.label}: ${item.entities} entidades novas, ${item.sources} fontes, ${item.claims} afirmações (${item.dates} datas, ${item.relations} arestas, ${item.images} imagens, relações só em texto: ${item.relationTargetsAsText})`,
    ),
  );
  lines.push(`Relações que ainda não viram aresta: ${report.pendingRelations.length}`);
  for (const item of report.pendingRelations.slice(0, 20))
    lines.push(`  - ${item.draft} -> ${item.target}: ${item.reason}`);
  lines.push(`Entidades só com ícone: ${report.iconOnly.length}`);
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
  const args = process.argv.slice(2);
  const partial = args.includes('--partial');
  const dryRun = args.includes('--dry-run');
  const onlyIndex = args.indexOf('--only');
  const only =
    onlyIndex >= 0
      ? (args[onlyIndex + 1] ?? '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      : [];
  const report = await convertDraftsToCollections({ partial, only, write: !dryRun });
  console.log(formatReport(report));
  if (dryRun) console.log('Modo sem gravação: o manifesto e as coleções não foram alterados.');
}
