#!/usr/bin/env node
// Consolida no grafo as arestas curadas de `content/graph/<slug>.json`. Elas já têm contexto e
// fonte no suplemento da leitura; aqui viram relação + evidência no atlas da página. Idempotente:
// não repete tripla (from, to, type) nem o id `rel-reading-*`.
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { readSourceGraph, writeSourceGraph } from './source-graph.mjs';

const TODAY = '2026-11-08';
const readings = ['marxismo', 'liberalismo', 'social-democracia', 'anarquismo'];
const edgeTypes = {
  'divergencia-ou-critica': {
    type: 'reacted_against',
    label: 'criticou',
    reverseLabel: 'foi criticado por',
  },
  'influencia-documentada': {
    type: 'influenced',
    label: 'influenciou',
    reverseLabel: 'foi influenciado por',
  },
  desenvolvimento: {
    type: 'developed_into',
    label: 'deu origem a',
    reverseLabel: 'surgiu de',
  },
};

const tripleKey = (from, to, type) => `${from}>${to}>${type}`;

/** Pure consolidation over a graph and the reading files; returns what changed. */
export function consolidateReadingEdges(graph, { pages, supplements }) {
  const entities = new Set(
    graph.atlases.flatMap((atlas) => atlas.entities.map((entity) => entity.id)),
  );
  const triples = new Set(
    graph.atlases.flatMap((atlas) =>
      atlas.relations.map((relation) =>
        tripleKey(relation.fromEntityId, relation.toEntityId, relation.type),
      ),
    ),
  );
  const ids = new Set(
    graph.atlases.flatMap((atlas) => atlas.relations.map((relation) => relation.id)),
  );
  const added = [];
  for (const slug of readings) {
    const page = pages[slug];
    const supplement = supplements[slug];
    if (!page || !supplement) continue;
    const atlas = graph.atlases.find((item) => item.id === page.atlasId);
    if (!atlas) continue;
    let changed = false;
    for (const edge of supplement.edges ?? []) {
      const mapping = edgeTypes[edge.type];
      const source = supplement.sources?.find((item) => item.id === edge.sources?.[0]);
      if (!mapping || !source || !entities.has(edge.from) || !entities.has(edge.to)) continue;
      if (triples.has(tripleKey(edge.from, edge.to, mapping.type))) continue;
      const relationId = `rel-reading-${edge.id}`;
      if (ids.has(relationId)) continue;
      if (!atlas.sources.some((item) => item.id === source.id)) {
        atlas.sources.push(source);
        changed = true;
      }
      const evidenceId = `ev-reading-${edge.id}`;
      if (!atlas.evidences.some((item) => item.id === evidenceId)) {
        atlas.evidences.push({
          id: evidenceId,
          sourceId: source.id,
          locator: edge.context || edge.label,
          accessedAt: TODAY,
          note: `Tema: ${edge.label}`,
        });
      }
      atlas.relations.push({
        id: relationId,
        fromEntityId: edge.from,
        toEntityId: edge.to,
        type: mapping.type,
        label: mapping.label,
        reverseLabel: mapping.reverseLabel,
        context: `${edge.context} Tema: ${edge.label}.`,
        temporalExtent: null,
        uncertainty: edge.certainty === 'estabelecida' ? 'low' : 'moderate',
        evidenceIds: [evidenceId],
        editorialStatus: 'pending',
      });
      ids.add(relationId);
      triples.add(tripleKey(edge.from, edge.to, mapping.type));
      added.push({
        reading: slug,
        edge: edge.id,
        from: edge.from,
        to: edge.to,
        type: mapping.type,
      });
      changed = true;
    }
    if (changed) atlas.updatedAt = TODAY;
  }
  if (added.length) graph.updatedAt = TODAY;
  return { added };
}

async function main() {
  const pages = {};
  const supplements = {};
  for (const slug of readings) {
    pages[slug] = JSON.parse(await readFile(join('content/ideologies', slug, 'page.json'), 'utf8'));
    supplements[slug] = JSON.parse(await readFile(join('content/graph', `${slug}.json`), 'utf8'));
  }
  const graph = await readSourceGraph();
  const { added } = consolidateReadingEdges(graph, { pages, supplements });
  if (added.length) await writeSourceGraph(graph);
  for (const item of added) console.log(`${item.reading}: ${item.edge} (${item.type})`);
  console.log(`${added.length} arestas consolidadas.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
