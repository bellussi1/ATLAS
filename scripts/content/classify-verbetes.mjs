#!/usr/bin/env node
// Aplica as correções de tipo de alta confiança da auditoria dos verbetes.
// A lista vive em docs/research/auditoria-verbetes-2026-11/tipos-candidatos.tsv.
// Não cria, apaga nem reclassifica itens de baixa confiança; a decisão editorial fica no TSV.
//
//   node scripts/content/classify-verbetes.mjs --dry-run
//   node scripts/content/classify-verbetes.mjs
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { readSourceGraph, writeSourceGraph } from './source-graph.mjs';

const TODAY = '2026-11-09';
const TSV = 'docs/research/auditoria-verbetes-2026-11/tipos-candidatos.tsv';

export async function readTypeCandidates(root = process.cwd()) {
  const text = await readFile(resolve(root, TSV), 'utf8');
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const columns = header.split('\t');
  const at = (name) => columns.indexOf(name);
  return lines.flatMap((line) => {
    const values = line.split('\t');
    if (values[at('confianca')] !== 'alta') return [];
    return [
      {
        current: values[at('kind_atual')],
        suggested: values[at('kind_sugerido')],
        title: values[at('titulo')],
      },
    ];
  });
}

export async function classifyVerbetes(graph, root = process.cwd()) {
  const candidates = await readTypeCandidates(root);
  const byTitle = new Map(candidates.map((candidate) => [candidate.title, candidate]));
  const changes = [];
  for (const atlas of graph.atlases) {
    for (const entity of atlas.entities) {
      const candidate = byTitle.get(entity.title);
      if (!candidate || entity.kind === candidate.suggested) continue;
      changes.push({
        id: entity.id,
        title: entity.title,
        from: entity.kind,
        to: candidate.suggested,
      });
      entity.kind = candidate.suggested;
      // A concept is not a place: drop the geographic facets that only made sense there.
      if (candidate.suggested === 'concept') {
        delete entity.placeCategory;
        delete entity.placeType;
      }
    }
  }
  if (changes.length) graph.updatedAt = TODAY;
  return changes;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const graph = await readSourceGraph();
  const changes = await classifyVerbetes(graph);
  if (!dryRun && changes.length) await writeSourceGraph(graph);
  for (const change of changes)
    console.log(`${change.from} -> ${change.to}\t${change.title}\t${change.id}`);
  console.log(`${changes.length} mudanças${dryRun ? ' (dry-run)' : ''}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
