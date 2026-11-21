#!/usr/bin/env node
/**
 * Une duas entidades do grafo que representam o mesmo objeto (ex.: o país tipado e o
 * verbete enciclopédico "Brasil"), sem perder referência:
 *
 * - relações, afirmações e blocos de dossiê que apontavam para a entidade absorvida passam a
 *   apontar para a canônica; relações que ficam idênticas (mesmas pontas e tipo) viram uma só,
 *   somando as evidências; relações que viram laço (ponta = ponta) são removidas e listadas;
 * - a canônica herda apelidos, identificadores externos e metadados de descoberta que ela
 *   não tinha; título, resumo, contexto, seções, tipo, coordenadas, ISO e perfil de país da canônica não mudam;
 * - fontes, evidências, citações e revisões da absorvida ficam, com os mesmos IDs.
 *
 * Uso: node scripts/content/merge-entities.mjs --from <id> --into <id> [--dry-run]
 */
import './register-source-modules.mjs';
import { readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readSourceGraph, sourceDirectory, writeSourceGraph } from './source-graph.mjs';

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const from = option('--from');
const into = option('--into');
const dryRun = args.includes('--dry-run');
if (!from || !into || from === into) {
  console.error('Uso: merge-entities.mjs --from <id> --into <id> [--dry-run]');
  process.exit(2);
}
const root = fileURLToPath(new URL('../../', import.meta.url));

const graph = await readSourceGraph();
const entities = graph.atlases.flatMap((atlas) => atlas.entities);
const source = entities.find((entity) => entity.id === from);
const target = entities.find((entity) => entity.id === into);
if (!source || !target) throw Error('Entidade não encontrada no grafo.');

const report = { relationsRepointed: 0, relationsMerged: [], loops: [], claimsRepointed: 0 };

// 1. A canônica herda o que lhe falta.
const aliasKey = (value) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const known = new Set([target.title, ...target.aliases].map(aliasKey));
for (const alias of [source.title, ...source.aliases]) {
  if (!known.has(aliasKey(alias))) {
    target.aliases.push(alias);
    known.add(aliasKey(alias));
  }
}
if (source.externalIds) target.externalIds = { ...source.externalIds, ...target.externalIds };
if (source.discoveryMetadata && !target.discoveryMetadata) {
  target.discoveryMetadata = source.discoveryMetadata;
}
// Título, resumo, contexto e seções da canônica não mudam: a tradução aprovada depende deles.

// 2. Remove a absorvida e reaponta tudo para a canônica. O esquema exige que a afirmação
// esteja na mesma coleção da entidade: a cadeia afirmação → revisão → citação → evidência →
// fonte da absorvida muda para a coleção da canônica, com os mesmos IDs.
const targetAtlas = graph.atlases.find((atlas) =>
  atlas.entities.some((entity) => entity.id === into),
);
for (const atlas of graph.atlases) {
  const movedClaims = atlas.claims.filter((claim) => claim.entityId === from);
  atlas.entities = atlas.entities.filter((entity) => entity.id !== from);
  atlas.entityIds = atlas.entityIds.filter((id) => id !== from);
  for (const claim of movedClaims) claim.entityId = into;
  report.claimsRepointed += movedClaims.length;
  for (const license of atlas.assetLicenses ?? []) {
    if (license.entityId === from) license.entityId = into;
  }
  if (atlas === targetAtlas || movedClaims.length === 0) continue;
  const claimIds = new Set(movedClaims.map((claim) => claim.id));
  const citationIds = new Set(movedClaims.flatMap((claim) => claim.citationIds));
  const stay = atlas.claims.filter((claim) => !claimIds.has(claim.id));
  if (stay.some((claim) => claim.citationIds.some((id) => citationIds.has(id)))) {
    throw Error('Citação compartilhada com afirmação que fica; mover à mão.');
  }
  const citations = atlas.citations.filter((item) => citationIds.has(item.id));
  const evidenceIdsMoved = new Set(citations.map((item) => item.evidenceId));
  const keptCitations = atlas.citations.filter((item) => !citationIds.has(item.id));
  // Relações validam evidências no grafo inteiro; só citações que ficam impedem a mudança.
  // Evidência valida a fonte na própria coleção: as demais evidências da mesma fonte
  // (as das relações) acompanham a fonte.
  const sourceIdsMoved = new Set(
    atlas.evidences.filter((item) => evidenceIdsMoved.has(item.id)).map((item) => item.sourceId),
  );
  for (const item of atlas.evidences) {
    if (sourceIdsMoved.has(item.sourceId)) evidenceIdsMoved.add(item.id);
  }
  const outsideCitation = keptCitations.find((item) => evidenceIdsMoved.has(item.evidenceId));
  if (outsideCitation) throw Error(`Citação fica com evidência movida: ${outsideCitation.id}`);
  const evidences = atlas.evidences.filter((item) => evidenceIdsMoved.has(item.id));
  const keptEvidences = atlas.evidences.filter((item) => !evidenceIdsMoved.has(item.id));
  const sources = atlas.sources.filter((item) => sourceIdsMoved.has(item.id));
  targetAtlas.claims.push(...movedClaims);
  targetAtlas.reviews.push(...atlas.reviews.filter((item) => claimIds.has(item.claimId)));
  targetAtlas.citations.push(...citations);
  targetAtlas.evidences.push(...evidences);
  targetAtlas.sources.push(...sources);
  atlas.claims = stay;
  atlas.reviews = atlas.reviews.filter((item) => !claimIds.has(item.claimId));
  atlas.citations = keptCitations;
  atlas.evidences = keptEvidences;
  atlas.sources = atlas.sources.filter((item) => !sourceIdsMoved.has(item.id));
  report.claimsMovedTo = targetAtlas.id;
}
const relationKey = (relation) =>
  `${relation.fromEntityId}|${relation.toEntityId}|${relation.type}`;
const survivors = new Map();
const touchedIds = new Set();
for (const atlas of graph.atlases) {
  atlas.relations = atlas.relations.filter((relation) => {
    const touches = relation.fromEntityId === from || relation.toEntityId === from;
    if (touches) {
      if (relation.fromEntityId === from) relation.fromEntityId = into;
      if (relation.toEntityId === from) relation.toEntityId = into;
      report.relationsRepointed += 1;
      touchedIds.add(relation.id);
    }
    if (relation.fromEntityId === relation.toEntityId) {
      report.loops.push(relation.id);
      return false;
    }
    const key = relationKey(relation);
    const kept = survivors.get(key);
    if (kept && (touches || touchedIds.has(kept.id))) {
      kept.evidenceIds = [...new Set([...kept.evidenceIds, ...relation.evidenceIds])];
      report.relationsMerged.push(`${relation.id} -> ${kept.id}`);
      return false;
    }
    if (!kept) survivors.set(key, relation);
    return true;
  });
}

// 3. Resumo (a validação Zod roda em writeSourceGraph).
console.log(JSON.stringify(report, null, 2));

// 4. Dossiês publicados citam a entidade em blocos.
const ideologies = join(root, 'content/ideologies');
const edits = [];
for (const dir of await readdir(ideologies, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const path = join(ideologies, dir.name, 'page.json');
  const text = await readFile(path, 'utf8').catch(() => null);
  if (!text?.includes(`"${from}"`)) continue;
  const page = JSON.parse(text);
  let touched = 0;
  const visit = (node) => {
    if (Array.isArray(node)) node.forEach(visit);
    else if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        if (key === 'entityIds' && Array.isArray(value) && value.includes(from)) {
          node[key] = [...new Set(value.map((id) => (id === from ? into : id)))];
          touched += 1;
        } else visit(value);
      }
    }
  };
  visit(page);
  if (touched) {
    edits.push({ path, text: text.replaceAll(`"${from}"`, `"${into}"`), name: dir.name });
  }
}
console.log('dossiês:', edits.map((edit) => edit.name).join(', ') || '—');

if (dryRun) process.exit(0);

const previous = JSON.parse(await readFile(join(sourceDirectory, 'manifest.json'), 'utf8'));
const before = new Set(previous.collections.map((item) => item.file.replace('collections/', '')));
const manifest = await writeSourceGraph(graph);
const live = new Set(manifest.collections.map((item) => item.file.replace('collections/', '')));
for (const file of before) {
  if (!live.has(file)) await unlink(join(sourceDirectory, 'collections', file));
}
for (const edit of edits) await writeFile(edit.path, edit.text, 'utf8');
console.log('gravado.');
