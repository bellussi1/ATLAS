#!/usr/bin/env node
/**
 * Leva ao grafo os rascunhos do ciclo de enriquecimento (Firecrawl Local + Ollama) que
 * resistem a duas conferências independentes:
 *
 * 1. Determinística: a citação existe literalmente no documento do corpus de onde veio,
 *    o documento tem licença de reuso aberta, as duas pontas existem no grafo e a citação
 *    nomeia as duas pelo título completo; a família passa pela trava de tipos.
 * 2. Segundo modelo local (por padrão `gemma2`, diferente do que propôs): a citação, sozinha,
 *    sustenta a afirmação? Sem "sim" explícito, o rascunho é recusado.
 *
 * Uso:
 *   node scripts/content/apply-enrichment-drafts.mjs --dry-run
 *   node scripts/content/apply-enrichment-drafts.mjs [--judge gemma2:9b-instruct-q4_K_M]
 *
 * O que entra fica `pending`, com [conferência de IA] e sem revisor; o rascunho recebe
 * `applied` ou `rejected` com o motivo, para não ser reprocessado.
 */
import './register-source-modules.mjs';
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { namesEntity, normalizeText } from './enrichment-grounding.mjs';
import { guardDecision, isWeakLabel } from './relation-guard.mjs';
import { readSourceGraph, writeSourceGraph } from './source-graph.mjs';

const { relationCategoryDecisions } =
  await import('../../src/app/core/content/editorial/relation-categories.ts');

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const dryRun = args.includes('--dry-run');
const retry = args.includes('--retry-rejected');
const judgeModel = option('--judge', 'gemma2:9b-instruct-q4_K_M');
const endpoint = option('--endpoint', 'http://localhost:11434');
const root = fileURLToPath(new URL('../../', import.meta.url));
const queues = join(root, 'experiments/rag/eval/queues');
const corpusDir = join(root, 'generated/firecrawl-corpus');
const cachePath = join(root, 'generated/enrichment-judge-cache.json');
const decisionsPath = join(root, 'src/app/core/content/editorial/relation-categories.ts');
const today = new Date().toISOString().slice(0, 10);

const FAMILY = {
  influência: 'influenced',
  ruptura: 'rupture',
  atuação: 'participation',
  criação: 'creation',
  continuidade: 'continuity',
  filiação: 'affiliation',
  lugar: 'location',
};
const TYPE_BY_FAMILY = {
  influenced: 'influenced',
  rupture: 'reacted_against',
  participation: 'participated_in',
  continuity: 'developed_into',
};
const CLASSIFICATIONS = new Set([
  'documented-fact',
  'attributed-thesis',
  'interpretation',
  'hypothesis',
  'inference',
  'contested-claim',
]);

const slugify = (value) =>
  normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
const shortHash = (value) => createHash('sha256').update(value).digest('hex').slice(0, 8);

// --- corpus -----------------------------------------------------------------------------
const manifest = JSON.parse(await readFile(join(corpusDir, 'manifest.json'), 'utf8'));
const corpusByUrl = new Map();
for (const item of manifest.items ?? []) {
  if (item.status !== 'ok' || !item.localMarkdownPath) continue;
  corpusByUrl.set(item.url.replace(/\/+$/, ''), item);
}
const corpusText = new Map();
async function documentFor(url) {
  const item = corpusByUrl.get(String(url ?? '').replace(/\/+$/, ''));
  if (!item) return null;
  if (!corpusText.has(item.url)) {
    const text = await readFile(join(corpusDir, item.localMarkdownPath), 'utf8').catch(() => '');
    corpusText.set(item.url, normalizeText(text));
  }
  return { item, text: corpusText.get(item.url) };
}

// --- graph ------------------------------------------------------------------------------
const graph = await readSourceGraph();
const entityById = new Map();
const atlasByEntity = new Map();
const pairs = new Set();
const claimTexts = new Map();
const usedIds = new Set();
for (const atlas of graph.atlases) {
  usedIds.add(atlas.id);
  for (const entity of atlas.entities) {
    entityById.set(entity.id, entity);
    atlasByEntity.set(entity.id, atlas);
    usedIds.add(entity.id);
  }
  for (const list of [atlas.sources, atlas.evidences, atlas.citations, atlas.claims])
    for (const item of list) usedIds.add(item.id);
  for (const review of atlas.reviews) usedIds.add(review.id);
  for (const relation of atlas.relations) {
    usedIds.add(relation.id);
    pairs.add([relation.fromEntityId, relation.toEntityId].sort().join('|'));
  }
  for (const claim of atlas.claims) {
    const list = claimTexts.get(claim.entityId) ?? [];
    list.push(normalizeText(claim.text));
    claimTexts.set(claim.entityId, list);
  }
}
const freshId = (base) => {
  let id = base.slice(0, 110);
  for (let n = 2; usedIds.has(id); n++) id = `${base.slice(0, 104)}-${n}`;
  usedIds.add(id);
  return id;
};

/** Source + evidence + citation for one quote, in the atlas that will cite it. */
function citeQuote(atlas, doc, quote, model) {
  let source = atlas.sources.find((item) => item.url?.replace(/\/+$/, '') === doc.item.url);
  if (!source) {
    source = {
      id: freshId(`src-fc-${slugify(doc.item.title || doc.item.slug)}-${shortHash(doc.item.url)}`),
      title: doc.item.title || doc.item.pageTitle || doc.item.url,
      url: doc.item.url,
      edition: `${doc.item.sourceName ?? 'Firecrawl Local'}; licença ${doc.item.license}; extração assistida por IA (${model})`,
      publicationDate: null,
    };
    atlas.sources.push(source);
  }
  const evidence = {
    id: freshId(`ev-fc-${shortHash(`${doc.item.url}|${quote}`)}`),
    sourceId: source.id,
    locator: quote,
    accessedAt: (doc.item.scrapedAt ?? today).slice(0, 10),
    note: '[conferência de IA] Citação literal conferida no corpus local.',
  };
  atlas.evidences.push(evidence);
  const citation = {
    id: freshId(`cit-${evidence.id}`),
    evidenceId: evidence.id,
    relation: 'supports',
  };
  atlas.citations.push(citation);
  return { source, evidence, citation };
}

// --- second-model judgement -------------------------------------------------------------
const cache = JSON.parse(await readFile(cachePath, 'utf8').catch(() => '{}'));
async function judge(statement, quote, wantReverse) {
  const key = `${judgeModel}|${statement}|${quote}|${wantReverse}`;
  if (cache[key]) return cache[key];
  const prompt = `Você confere evidências para uma enciclopédia histórica. Responda só com JSON.

Citação (única evidência disponível):
"""${quote}"""

Afirmação proposta:
"""${statement}"""

A citação, sozinha e sem conhecimento externo, afirma isso? Responda "supported": true apenas se a citação disser explicitamente o que a afirmação diz, inclusive quem fez o quê; associação vaga, menção lado a lado ou inferência não bastam.
${wantReverse ? 'Inclua também "reverseLabel": a mesma relação lida no sentido inverso, em voz passiva curta (ex.: "criou" -> "foi criado por").' : ''}
Formato: {"supported": true|false, "reason": "frase curta"${wantReverse ? ', "reverseLabel": "..."' : ''}}`;
  const response = await fetch(`${endpoint}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: judgeModel,
      prompt,
      format: 'json',
      stream: false,
      options: { temperature: 0 },
    }),
  });
  if (!response.ok) throw Error(`Ollama respondeu ${response.status}`);
  const body = await response.json();
  let parsed;
  try {
    parsed = JSON.parse(body.response);
  } catch {
    parsed = { supported: false, reason: 'resposta sem JSON' };
  }
  const result = {
    supported: parsed.supported === true,
    reason: String(parsed.reason ?? '').slice(0, 200),
    reverseLabel: String(parsed.reverseLabel ?? '').trim(),
  };
  cache[key] = result;
  return result;
}

// --- drafts -----------------------------------------------------------------------------
async function readDrafts(directory) {
  const dir = join(queues, directory);
  const files = (await readdir(dir).catch(() => [])).filter(
    (file) => file.endsWith('.json') && file !== 'index.json',
  );
  return Promise.all(
    files.map(async (file) => ({
      path: join(dir, file),
      draft: JSON.parse(await readFile(join(dir, file), 'utf8')),
    })),
  );
}
const pending = ({ draft }) => !draft.applied && (retry || !draft.rejected);
const tally = { relations: 0, claims: 0, rejected: {} };
const reject = (draft, reason) => {
  draft.rejected = { at: new Date().toISOString(), reason, judge: judgeModel };
  tally.rejected[reason] = (tally.rejected[reason] ?? 0) + 1;
};
const decisions = { ...relationCategoryDecisions };
const touched = [];

for (const entry of (await readDrafts('relacoes-por-embedding-drafts')).filter(pending)) {
  const { draft } = entry;
  const proposal = draft.relation;
  if (!proposal) continue;
  touched.push(entry);
  const flip = proposal.direction === 'b->a';
  const from = entityById.get(flip ? proposal.toEntityId : proposal.fromEntityId);
  const to = entityById.get(flip ? proposal.fromEntityId : proposal.toEntityId);
  const family = FAMILY[String(proposal.family ?? '').toLocaleLowerCase('pt-BR')];
  const label = String(proposal.label ?? '').trim();
  const quote = String(proposal.quote ?? '').trim();
  if (!from || !to) {
    reject(draft, 'entidade ausente do grafo');
    continue;
  }
  if (!family || !label || label.length > 60 || isWeakLabel(label)) {
    reject(draft, 'família ou rótulo inválido');
    continue;
  }
  if (pairs.has([from.id, to.id].sort().join('|'))) {
    reject(draft, 'par já ligado no grafo');
    continue;
  }
  if (quote.length < 30) {
    reject(draft, 'sem citação literal');
    continue;
  }
  const doc = await documentFor(proposal.source_url);
  if (!doc || doc.item.usagePolicy !== 'open-reuse') {
    reject(draft, 'fonte fora do corpus aberto');
    continue;
  }
  const normalizedQuote = normalizeText(quote);
  if (!doc.text.includes(normalizedQuote)) {
    reject(draft, 'citação não está no documento');
    continue;
  }
  if (!namesEntity(normalizedQuote, from.title) || !namesEntity(normalizedQuote, to.title)) {
    reject(draft, 'citação não nomeia as duas pontas');
    continue;
  }
  const decision = guardDecision(family, from.kind, to.kind, from, to);
  if (decision === 'omit') {
    reject(draft, 'trava de tipos');
    continue;
  }
  const [finalFamily, reverseFlag] = decision.split(':');
  const statement = `${from.title} ${label} ${to.title}.`;
  const verdict = await judge(statement, quote, true);
  if (!verdict.supported || !verdict.reverseLabel || verdict.reverseLabel.length > 60) {
    reject(draft, 'segundo modelo não confirmou');
    draft.rejected.detail = verdict.reason;
    continue;
  }
  const reverse = reverseFlag === 'reverse';
  const head = reverse ? to : from;
  const tail = reverse ? from : to;
  const atlas = atlasByEntity.get(head.id);
  const { evidence } = citeQuote(atlas, doc, quote, draft.review?.model ?? 'modelo local');
  const id = freshId(`rel-fc-${head.id}-${tail.id}`);
  atlas.relations.push({
    id,
    fromEntityId: head.id,
    toEntityId: tail.id,
    type: TYPE_BY_FAMILY[finalFamily] ?? 'documented-association',
    label: reverse ? verdict.reverseLabel : label,
    reverseLabel: reverse ? label : verdict.reverseLabel,
    context: `[conferência de IA] ${proposal.claim ?? statement}`,
    temporalExtent: null,
    uncertainty: 'moderate',
    evidenceIds: [evidence.id],
    editorialStatus: 'pending',
    ...(/wikipedia\.org/i.test(doc.item.url)
      ? { provenance: { source: 'wikipedia', url: doc.item.url, retrievedAt: evidence.accessedAt } }
      : {}),
  });
  pairs.add([head.id, tail.id].sort().join('|'));
  decisions[id] = finalFamily;
  draft.applied = { at: new Date().toISOString(), relationId: id, judge: judgeModel };
  tally.relations++;
}

for (const entry of (await readDrafts('enrichment-claims')).filter(pending)) {
  const { draft } = entry;
  const entity = entityById.get(draft.entityId);
  if (!Array.isArray(draft.claims) || draft.claims.length === 0) continue;
  touched.push(entry);
  if (!entity) {
    reject(draft, 'entidade ausente do grafo');
    continue;
  }
  const atlas = atlasByEntity.get(entity.id);
  const applied = [];
  const refused = [];
  for (const proposal of draft.claims) {
    const text = String(proposal.text ?? '').trim();
    const quote = String(proposal.quote ?? '').trim();
    const doc = await documentFor(proposal.source_url);
    const normalizedQuote = normalizeText(quote);
    const known = claimTexts.get(entity.id) ?? [];
    let reason = null;
    if (!text || quote.length < 30) reason = 'sem texto ou citação';
    else if (!CLASSIFICATIONS.has(proposal.classification)) reason = 'classificação inválida';
    else if (!doc || doc.item.usagePolicy !== 'open-reuse') reason = 'fonte fora do corpus aberto';
    else if (!doc.text.includes(normalizedQuote)) reason = 'citação não está no documento';
    else if (known.includes(normalizeText(text))) reason = 'afirmação repetida';
    else {
      const verdict = await judge(`${entity.title}: ${text}`, quote, false);
      if (!verdict.supported) reason = 'segundo modelo não confirmou';
    }
    if (reason) {
      refused.push({ text, reason });
      tally.rejected[reason] = (tally.rejected[reason] ?? 0) + 1;
      continue;
    }
    const { citation } = citeQuote(atlas, doc, quote, draft.review?.model ?? 'modelo local');
    const claimId = freshId(`claim-fc-${entity.id}-${shortHash(text)}`);
    atlas.claims.push({
      id: claimId,
      entityId: entity.id,
      text,
      classification: proposal.classification,
      editorialStatus: 'pending',
      citationIds: [citation.id],
    });
    atlas.reviews.push({
      id: freshId(`rev-${claimId}`),
      claimId,
      status: 'pending',
      reviewer: null,
      reviewedAt: null,
      note: `[conferência de IA] Proposta por ${draft.review?.model ?? 'modelo local'} e confirmada por ${judgeModel}; revisão humana não registrada.`,
    });
    known.push(normalizeText(text));
    claimTexts.set(entity.id, known);
    applied.push(claimId);
    tally.claims++;
  }
  if (applied.length)
    draft.applied = { at: new Date().toISOString(), claimIds: applied, judge: judgeModel };
  if (refused.length) draft.refusedClaims = refused;
  if (!applied.length)
    draft.rejected = {
      at: new Date().toISOString(),
      reason: 'nenhuma afirmação confirmada',
      judge: judgeModel,
    };
}

await writeFile(cachePath, JSON.stringify(cache), 'utf8');
console.log(
  `${dryRun ? '[dry-run] ' : ''}relações: ${tally.relations} · afirmações: ${tally.claims}`,
  tally.rejected,
);
if (dryRun) process.exit(0);

if (tally.relations || tally.claims) {
  await writeSourceGraph(graph);
  const sorted = Object.entries(decisions).sort(([a], [b]) => a.localeCompare(b));
  await writeFile(
    decisionsPath,
    `// Gerado por scripts/content/classify-relations.mjs, expand-relations.mjs e apply-enrichment-drafts.mjs. Não editar à mão.
// Revisão: conferência de IA (modelos locais, ${today}), sem revisão humana.

/** Decisão por relação: família (\`creation\`, \`participation\`…, \`:reverse\` inverte a seta) ou \`omit\`. */
export const relationCategoryDecisions: Readonly<Record<string, string>> = {
${sorted.map(([key, value]) => `  '${key}': '${value}',`).join('\n')}
};
`,
    'utf8',
  );
}
for (const { path, draft } of touched)
  await writeFile(path, `${JSON.stringify(draft, null, 2)}\n`, 'utf8');
