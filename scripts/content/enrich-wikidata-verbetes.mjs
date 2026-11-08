#!/usr/bin/env node
// Enriquece `atlas-verbetes-citados` com declarações do Wikidata que apontam para entidades já
// existentes no grafo. Não cria entidades, não usa API paga e não duplica par já ligado. Cada
// aresta carrega fonte, evidência, procedência e fica em revisão pendente.
//
//   node scripts/content/enrich-wikidata-verbetes.mjs --dry-run
//   node scripts/content/enrich-wikidata-verbetes.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { getJson } from '../ingestion/wikimedia/client.mjs';
import { readSourceGraph, writeSourceGraph } from './source-graph.mjs';

const TODAY = '2026-11-08';
const ATLAS_ID = 'atlas-verbetes-citados';
const SOURCE_ID = 'src-wikidata-verbetes';
const BATCH = 50;

/** Properties that create a useful historical link between two existing records. */
const PROPERTIES = {
  P737: {
    type: 'associated_with',
    label: 'é classificado em associação com',
    reverseLabel: 'recebe classificação de associação de',
    context: 'Classificação de catálogo colaborativo do Wikidata; não é influência documentada.',
    uncertainty: 'unknown',
  },
  P1142: {
    type: 'associated_with',
    label: 'é classificado com a ideologia',
    reverseLabel: 'é a ideologia atribuída a',
    context: 'Classificação de catálogo colaborativo do Wikidata; não é influência documentada.',
    uncertainty: 'unknown',
  },
  P463: {
    type: 'documented-association',
    label: 'é membro de',
    reverseLabel: 'tem como membro',
    context: 'Membro declarado no Wikidata; pode incluir vínculo administrativo ou temporal.',
    uncertainty: 'low',
  },
  P102: {
    type: 'documented-association',
    label: 'foi filiado a',
    reverseLabel: 'teve como filiado',
    context: 'Filiação partidária declarada no Wikidata; datas e rupturas podem faltar.',
    uncertainty: 'low',
  },
  P50: {
    type: 'authored',
    label: 'escreveu',
    reverseLabel: 'foi escrito por',
    context: 'Autoria declarada no Wikidata.',
    uncertainty: 'low',
  },
  P112: {
    type: 'documented-association',
    label: 'fundou',
    reverseLabel: 'foi fundado por',
    context: 'Fundador declarado no Wikidata.',
    uncertainty: 'low',
  },
  P1344: {
    type: 'participated_in',
    label: 'participou de',
    reverseLabel: 'teve como participante',
    context: 'Participação declarada no Wikidata; a extensão pode variar.',
    uncertainty: 'low',
  },
  P800: {
    type: 'authored',
    label: 'escreveu',
    reverseLabel: 'foi escrito por',
    context: 'Obra notável declarada no Wikidata.',
    uncertainty: 'low',
  },
  P135: {
    type: 'associated_with',
    label: 'é associado ao movimento',
    reverseLabel: 'tem como associado',
    context: 'Movimento declarado no Wikidata.',
    uncertainty: 'unknown',
  },
  P710: {
    type: 'participated_in',
    label: 'participou de',
    reverseLabel: 'teve como participante',
    context: 'Participante declarado no Wikidata.',
    uncertainty: 'low',
  },
  P607: {
    type: 'participated_in',
    label: 'participou de',
    reverseLabel: 'teve como participante',
    context: 'Conflito declarado no Wikidata.',
    uncertainty: 'low',
  },
  P276: {
    type: 'documented-association',
    label: 'ocorreu em',
    reverseLabel: 'foi palco de',
    context: 'Local declarado no Wikidata.',
    uncertainty: 'low',
  },
  P155: {
    type: 'documented-association',
    label: 'sucedeu',
    reverseLabel: 'foi sucedido por',
    context: 'Sucessão declarada no Wikidata.',
    uncertainty: 'low',
  },
  P156: {
    type: 'documented-association',
    label: 'sucedeu',
    reverseLabel: 'foi sucedido por',
    context: 'Sucessão declarada no Wikidata.',
    uncertainty: 'low',
  },
};

/** Wikidata subject -> target shape. P50 is work -> author; P800 is creator -> work. */
function shape(property, subject, target) {
  if (property === 'P50') return { from: target, to: subject };
  if (property === 'P112') return { from: target, to: subject };
  if (property === 'P710') return { from: target, to: subject };
  if (property === 'P156') return { from: target, to: subject };
  return { from: subject, to: target };
}

const pairKey = (a, b) => [a, b].sort().join('|');

export function applyWikidata(graph, { batches, report = {} }) {
  const atlas = graph.atlases.find((item) => item.id === ATLAS_ID);
  if (!atlas) throw new Error(`Atlas ausente: ${ATLAS_ID}`);
  const byQid = new Map(
    graph.atlases
      .flatMap((item) => item.entities)
      .filter((entity) => entity.externalIds?.wikidata)
      .map((entity) => [entity.externalIds.wikidata, entity]),
  );
  const byId = new Map(
    graph.atlases.flatMap((item) => item.entities).map((entity) => [entity.id, entity]),
  );
  // Correct the first P800 pass: the statement sits on the creator, so the pair must be swapped.
  let normalized = 0;
  atlas.relations = atlas.relations.filter((relation) => {
    if (!relation.id.startsWith('rel-wd-') || !relation.id.includes('-p800-')) return true;
    for (const id of relation.evidenceIds) {
      const index = atlas.evidences.findIndex((item) => item.id === id);
      if (index >= 0) atlas.evidences.splice(index, 1);
    }
    normalized += 1;
    return false;
  });
  // Correct the first P276 pass: events stay, institutions become "sede", other kinds leave.
  atlas.relations = atlas.relations.filter((relation) => {
    if (!relation.id.startsWith('rel-wd-') || !relation.id.includes('-p276-')) return true;
    const subject = byId.get(relation.fromEntityId);
    if (!subject) return true;
    if (subject.kind === 'event') return true;
    if (subject.kind === 'institution') {
      relation.label = 'está sediado em';
      relation.reverseLabel = 'abriga';
      relation.context = 'Sede declarada no Wikidata.';
      for (const id of relation.evidenceIds) {
        const evidence = atlas.evidences.find((item) => item.id === id);
        if (evidence?.note)
          evidence.note = evidence.note.replace(' — ocorreu em — ', ' — está sediado em — ');
      }
      normalized += 1;
      return true;
    }
    for (const id of relation.evidenceIds) {
      const index = atlas.evidences.findIndex((item) => item.id === id);
      if (index >= 0) atlas.evidences.splice(index, 1);
    }
    normalized += 1;
    return false;
  });
  const pairs = new Set(
    graph.atlases.flatMap((item) =>
      item.relations.map((relation) => pairKey(relation.fromEntityId, relation.toEntityId)),
    ),
  );
  const relationIds = new Set(graph.atlases.flatMap((item) => item.relations.map((r) => r.id)));
  if (!atlas.sources.some((source) => source.id === SOURCE_ID))
    atlas.sources.push({
      id: SOURCE_ID,
      title: 'Wikidata — dados estruturados',
      url: 'https://www.wikidata.org/',
      edition: 'Wikidata, dados sob CC0; consulta em 08/11/2026',
      publicationDate: null,
    });
  let added = 0;
  let skippedExisting = 0;
  let skippedOutside = 0;
  for (const claims of batches) {
    for (const [qid, statements] of Object.entries(claims)) {
      const subject = byQid.get(qid);
      if (!subject) continue;
      for (const [property, list] of Object.entries(statements ?? {})) {
        const mapping = PROPERTIES[property];
        if (!mapping) continue;
        for (const statement of list) {
          if (statement.rank === 'deprecated') continue;
          const targetQid = statement.mainsnak?.datavalue?.value?.id;
          if (!targetQid) continue;
          const target = byQid.get(targetQid);
          if (!target) {
            skippedOutside += 1;
            continue;
          }
          // P1142 on a person is often a contributor label, not an affiliation; P463 on a
          // country/place is usually administrative membership and would flood the map.
          if (property === 'P1142' && subject.kind === 'person') continue;
          if (property === 'P463' && ['country', 'place', 'concept'].includes(subject.kind))
            continue;
          if (property === 'P276' && !['event', 'institution'].includes(subject.kind)) continue;
          const current =
            property === 'P276' && subject.kind === 'institution'
              ? {
                  ...mapping,
                  label: 'está sediado em',
                  reverseLabel: 'abriga',
                  context: 'Sede declarada no Wikidata.',
                }
              : mapping;
          const { from, to } = shape(property, subject.id, target.id);
          if (from === to) continue;
          const fromEntity = from === subject.id ? subject : target;
          const toEntity = to === subject.id ? subject : target;
          const key = pairKey(from, to);
          if (pairs.has(key)) {
            skippedExisting += 1;
            continue;
          }
          const relationId = `rel-wd-${from}-${property.toLowerCase()}-${to}`;
          if (relationIds.has(relationId)) continue;
          const evidenceId = `ev-wd-${from}-${property.toLowerCase()}-${to}`;
          atlas.evidences.push({
            id: evidenceId,
            sourceId: SOURCE_ID,
            locator: `${property} = ${targetQid}`,
            accessedAt: TODAY,
            note: `${fromEntity.title} — ${current.label} — ${toEntity.title}`,
          });
          atlas.relations.push({
            id: relationId,
            fromEntityId: from,
            toEntityId: to,
            type: current.type,
            label: current.label,
            reverseLabel: current.reverseLabel,
            context: current.context,
            temporalExtent: null,
            uncertainty: current.uncertainty,
            evidenceIds: [evidenceId],
            editorialStatus: 'pending',
            provenance: {
              source: 'wikidata',
              url: `https://www.wikidata.org/wiki/${qid}`,
              retrievedAt: TODAY,
            },
          });
          pairs.add(key);
          relationIds.add(relationId);
          report[property] = (report[property] ?? 0) + 1;
          added += 1;
        }
      }
    }
  }
  if (added || normalized) {
    atlas.updatedAt = TODAY;
    graph.updatedAt = TODAY;
  }
  return { added, normalized, skippedExisting, skippedOutside, byProperty: report };
}

async function fetchClaims(qids) {
  const batches = [];
  for (let index = 0; index < qids.length; index += BATCH) {
    const batch = qids.slice(index, index + BATCH);
    const data = await getJson(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${batch.join('|')}&props=claims&format=json`,
    );
    const claims = {};
    for (const qid of batch)
      if (data.entities?.[qid]?.claims) claims[qid] = data.entities[qid].claims;
    batches.push(claims);
  }
  return batches;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const graph = await readSourceGraph();
  const atlas = graph.atlases.find((item) => item.id === ATLAS_ID);
  if (!atlas) throw new Error(`Atlas ausente: ${ATLAS_ID}`);
  const qids = atlas.entities
    .map((entity) => entity.externalIds?.wikidata)
    .filter((qid) => /^Q\d+$/.test(qid ?? ''));
  const batches = await fetchClaims(qids);
  const report = {};
  const result = applyWikidata(graph, { batches, report });
  if (!dryRun && (result.added || result.normalized)) await writeSourceGraph(graph);
  await writeFile(
    join('generated', 'wikidata-verbetes-report.json'),
    `${JSON.stringify({ dryRun, qids: qids.length, ...result }, null, 2)}\n`,
  );
  console.log(JSON.stringify({ dryRun, qids: qids.length, ...result }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
