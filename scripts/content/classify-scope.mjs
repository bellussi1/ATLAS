#!/usr/bin/env node
// Marca o escopo editorial dos verbetes: nucleo, contexto ou fora.
// As listas vivem em docs/research/auditoria-verbetes-2026-11/. Nada é apagado:
// o campo apenas permite filtrar o catálogo e o grafo.
//
//   node scripts/content/classify-scope.mjs --dry-run
//   node scripts/content/classify-scope.mjs
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { readSourceGraph, writeSourceGraph } from './source-graph.mjs';

const TODAY = '2026-11-09';
const DIRECTORY = 'docs/research/auditoria-verbetes-2026-11';

async function readTitles(root, file) {
  const text = await readFile(resolve(root, DIRECTORY, file), 'utf8');
  const [, ...lines] = text.trim().split(/\r?\n/);
  return lines.map((line) => line.split('\t')[0].trim()).filter(Boolean);
}

export async function classifyScope(graph, root = process.cwd()) {
  const fora = new Set(await readTitles(root, 'fora-de-escopo.tsv'));
  const contexto = new Set(await readTitles(root, 'contexto.tsv'));
  const changes = [];
  for (const atlas of graph.atlases) {
    for (const entity of atlas.entities) {
      const scope = fora.has(entity.title)
        ? 'fora'
        : contexto.has(entity.title)
          ? 'contexto'
          : 'nucleo';
      if (entity.scope === scope) continue;
      changes.push({ id: entity.id, title: entity.title, from: entity.scope, to: scope });
      entity.scope = scope;
    }
  }
  if (changes.length) graph.updatedAt = TODAY;
  return changes;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const graph = await readSourceGraph();
  const changes = await classifyScope(graph);
  if (!dryRun && changes.length) await writeSourceGraph(graph);
  for (const change of changes)
    console.log(`${change.from} -> ${change.to}\t${change.title}\t${change.id}`);
  console.log(`${changes.length} mudanças${dryRun ? ' (dry-run)' : ''}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
