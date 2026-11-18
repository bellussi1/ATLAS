#!/usr/bin/env node
/**
 * Higieniza aliases colidentes, reclassifica tipos incorretos, remove relações ruidosas
 * e promove relações órfãs de alta confiança da fila RAG sem alterar os arquivos da fila.
 */
import './register-source-modules.mjs';
import { readdir, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { readSourceGraph, sourceDirectory, writeSourceGraph } from './source-graph.mjs';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const candidatesPath = join(projectRoot, 'experiments/rag/eval/queues/relacoes-candidatas.json');

const normalize = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();

const CANONICAL_ALIAS_OWNERS = new Map([
  ['marx', 'person-karl-marx'],
  ['weber', 'wiki-topic-max-weber'],
  ['vargas', 'wiki-topic-getulio-vargas'],
  ['locke', 'person-john-locke'],
  ['montesquieu', 'person-montesquieu'],
  ['lenin', 'person-vladimir-lenin'],
  ['trotsky', 'person-leon-trotsky'],
  ['stalin', 'person-joseph-stalin'],
  ['bakunin', 'wiki-topic-mikhail-bakunin'],
  ['kropotkin', 'wiki-topic-piotr-kropotkin'],
  ['proudhon', 'wiki-topic-pierre-joseph-proudhon'],
  ['keynes', 'wiki-topic-john-maynard-keynes'],
  ['hayek', 'person-friedrich-hayek'],
  ['smith', 'person-adam-smith'],
]);

const CLASSE_SOCIAL_STRIP = new Set(['sorokin', 'abep', 'ipea', 'cbo', 'cceb']);

const KIND_OVERRIDES = {
  'wiki-topic-capitalismo': 'concept',
  'wiki-topic-cidadania': 'concept',
  'wiki-topic-britanicos': 'concept',
  'wiki-topic-economia-politica': 'concept',
  'wiki-topic-castilhismo': 'ideology',
  'wiki-topic-tenentismo': 'ideology',
};

const REMOVE_RELATIONS = new Set([
  'rel-wiki-topic-karl-marx-002',
  'rel-ai-exp-person-karl-marx-wiki-topic-casamento-42324b',
  'rel-wd-person-karl-marx-p50-wiki-topic-o-capital',
  'rel-ai-exp-wiki-topic-getulio-v-wiki-topic-1945-a091da',
]);

function reverseLabelFor(type) {
  if (type === 'reacted_against') return 'foi criticado ou contestado por';
  if (type === 'participated_in') return 'teve participação de';
  if (type === 'influenced') return 'foi influenciado por';
  if (type === 'influenced_by') return 'influenciou';
  if (type === 'authored') return 'foi escrito por';
  return 'tem associação documentada com';
}

export async function cleanGraphQuality() {
  const beforeManifest = JSON.parse(await readFile(join(sourceDirectory, 'manifest.json'), 'utf8'));
  const graph = await readSourceGraph(sourceDirectory);

  const entities = graph.atlases.flatMap((atlas) => atlas.entities);
  const titleOwners = new Map();
  for (const entity of entities) {
    const key = normalize(entity.title);
    if (key && !titleOwners.has(key)) titleOwners.set(key, entity.id);
  }

  let aliasesRemoved = 0;
  let kindsUpdated = 0;
  let relationsRemoved = 0;
  let relationsUpdated = 0;
  let relationsPromoted = 0;

  for (const atlas of graph.atlases) {
    for (const entity of atlas.entities) {
      const nextKind = KIND_OVERRIDES[entity.id];
      if (nextKind && entity.kind !== nextKind) {
        entity.kind = nextKind;
        kindsUpdated += 1;
      }

      const seenAliases = new Set();
      const keptAliases = [];
      for (const alias of entity.aliases) {
        const key = normalize(alias);
        if (!key || seenAliases.has(key)) {
          aliasesRemoved += 1;
          continue;
        }
        const preserveCapital = entity.id === 'work-capital-volume-i' && key === 'o capital';
        if (!preserveCapital) {
          const titleOwner = titleOwners.get(key);
          const canonicalOwner = CANONICAL_ALIAS_OWNERS.get(key);
          const isClasseSocialNoise =
            entity.id === 'wiki-topic-classe-social' && CLASSE_SOCIAL_STRIP.has(key);
          if (
            (titleOwner && titleOwner !== entity.id) ||
            (canonicalOwner && canonicalOwner !== entity.id) ||
            isClasseSocialNoise
          ) {
            aliasesRemoved += 1;
            continue;
          }
        }
        seenAliases.add(key);
        keptAliases.push(alias);
      }
      entity.aliases = keptAliases;
    }

    const methodologyIds =
      atlas.id === 'atlas-methodology' ? new Set(atlas.entities.map((e) => e.id)) : null;
    const nextRelations = [];
    for (const rel of atlas.relations) {
      if (
        REMOVE_RELATIONS.has(rel.id) ||
        (methodologyIds &&
          rel.id.startsWith('rel-rag-') &&
          (!methodologyIds.has(rel.fromEntityId) || !methodologyIds.has(rel.toEntityId)))
      ) {
        relationsRemoved += 1;
        continue;
      }
      if (rel.id === 'rel-wiki-topic-presidente-do-brasil-001') {
        if (rel.label !== 'exerceu o cargo de' || rel.reverseLabel !== 'foi exercido por') {
          rel.label = 'exerceu o cargo de';
          rel.reverseLabel = 'foi exercido por';
          relationsUpdated += 1;
        }
      }
      nextRelations.push(rel);
    }
    atlas.relations = nextRelations;
  }

  const allEntityIds = new Set(entities.map((e) => e.id));
  const existingPairs = new Set();
  const existingRelationIds = new Set();
  const claimById = new Map();
  const citationById = new Map();
  const atlasByEvidenceId = new Map();
  const atlasByEntityId = new Map();

  for (const atlas of graph.atlases) {
    for (const entity of atlas.entities) atlasByEntityId.set(entity.id, atlas);
    for (const rel of atlas.relations) {
      existingRelationIds.add(rel.id);
      existingPairs.add(`${rel.fromEntityId}|${rel.toEntityId}`);
      existingPairs.add(`${rel.toEntityId}|${rel.fromEntityId}`);
    }
    for (const claim of atlas.claims) claimById.set(claim.id, claim);
    for (const citation of atlas.citations) citationById.set(citation.id, citation);
    for (const evidence of atlas.evidences) atlasByEvidenceId.set(evidence.id, atlas);
  }

  const rawCandidates = JSON.parse(await readFile(candidatesPath, 'utf8'));
  const candidates = Array.isArray(rawCandidates) ? rawCandidates : (rawCandidates.items ?? []);
  for (const candidate of candidates) {
    const quote = candidate.literal_quote?.trim() ?? '';
    if (
      candidate.from_is_orphan !== true ||
      (candidate.rerank_score ?? 0) < 0.75 ||
      quote.length < 40
    ) {
      continue;
    }
    const fromId = candidate.from?.id;
    const toId = candidate.to?.id;
    if (!fromId || !toId || fromId === toId) continue;
    if (!allEntityIds.has(fromId) || !allEntityIds.has(toId)) continue;
    if (existingPairs.has(`${fromId}|${toId}`)) continue;

    const claim = candidate.quote_origin ? claimById.get(candidate.quote_origin) : undefined;
    const evidenceIds = [
      ...new Set(
        (claim?.citationIds ?? []).map((cid) => citationById.get(cid)?.evidenceId).filter(Boolean),
      ),
    ];
    if (!evidenceIds.length) continue;

    const toAtlas = atlasByEntityId.get(toId);
    const fromAtlas = atlasByEntityId.get(fromId);
    const evidenceAtlas = atlasByEvidenceId.get(evidenceIds[0]);
    const targetAtlas =
      toAtlas && toAtlas.id !== 'atlas-methodology'
        ? toAtlas
        : fromAtlas && fromAtlas.id !== 'atlas-methodology'
          ? fromAtlas
          : evidenceAtlas;
    if (!targetAtlas) continue;

    const sameAtlasEvidenceIds = evidenceIds.filter(
      (evId) => atlasByEvidenceId.get(evId)?.id === targetAtlas.id,
    );
    const chosenEvidenceIds = sameAtlasEvidenceIds.length ? sameAtlasEvidenceIds : evidenceIds;
    const relId = `rel-rag-${String(candidate.id).toLowerCase()}`;
    if (existingRelationIds.has(relId)) continue;

    targetAtlas.relations.push({
      id: relId,
      fromEntityId: fromId,
      toEntityId: toId,
      type: candidate.suggested_type,
      label: candidate.suggested_label,
      reverseLabel: reverseLabelFor(candidate.suggested_type),
      context: `${quote} [conferência de IA]`,
      temporalExtent: null,
      uncertainty: 'moderate',
      evidenceIds: chosenEvidenceIds,
      editorialStatus: 'pending',
    });
    existingRelationIds.add(relId);
    existingPairs.add(`${fromId}|${toId}`);
    existingPairs.add(`${toId}|${fromId}`);
    relationsPromoted += 1;
  }

  const nextManifest = await writeSourceGraph(graph, { directory: sourceDirectory });
  const activeFiles = new Set(nextManifest.collections.map((c) => c.file));
  const oldFiles = beforeManifest.collections.map((c) => c.file).filter((f) => !activeFiles.has(f));
  const collectionsDir = join(sourceDirectory, 'collections');
  const existingOnDisk = new Set(
    (await readdir(collectionsDir)).map((name) => `collections/${name}`),
  );
  let filesRemoved = 0;
  for (const oldFile of oldFiles) {
    if (existingOnDisk.has(oldFile)) {
      await unlink(join(sourceDirectory, oldFile));
      filesRemoved += 1;
    }
  }

  return {
    aliasesRemoved,
    kindsUpdated,
    relationsRemoved,
    relationsUpdated,
    relationsPromoted,
    filesRemoved,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const summary = await cleanGraphQuality();
  console.log('Saneamento do grafo concluído:', summary);
}
