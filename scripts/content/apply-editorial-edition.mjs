import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { readSourceGraph, writeSourceGraph, validateSourceGraph } from './source-graph.mjs';
import { atlasSchema } from '../../src/app/core/content/models/content-schema.ts';

const file = process.argv[2];
if (!file) throw Error('Informe um arquivo JSON de edição editorial.');
const edition = z
  .object({ updatedAt: z.iso.date(), atlas: atlasSchema })
  .parse(JSON.parse(await readFile(file, 'utf8')));
const graph = await readSourceGraph();
const previous = graph.atlases.find((a) => a.id === edition.atlas.id);
if (previous && JSON.stringify(previous) !== JSON.stringify(edition.atlas))
  throw Error(
    'Coleção existente: publique uma revisão explícita, sem sobrescrever a edição atual.',
  );
if (!previous) graph.atlases.push(edition.atlas);
if (edition.updatedAt > graph.updatedAt) graph.updatedAt = edition.updatedAt;
validateSourceGraph(graph);
await writeSourceGraph(graph);
console.log(`Edição validada e aplicada: ${edition.atlas.id}`);
