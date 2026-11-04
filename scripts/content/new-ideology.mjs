#!/usr/bin/env node
/**
 * Scaffolds an unpublished reading: `content/ideologies/<slug>/page.json` and
 * `content/graph/<slug>.json`. Chapters get only the blocks the atlas records support and stay
 * `pending`/`partial`; no text is invented. Publishing remains a separate, explicit step.
 */
import './register-source-modules.mjs';

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { format } from 'prettier';

const { ideologyGraphSchema, ideologyPageSchema } =
  await import('../../src/app/features/ideologies/models/ideology-page.schema.ts');
const { ideologyDraftFromGraph } =
  await import('../../src/app/features/ideologies/utils/ideology-draft-from-graph.ts');

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const exists = (path) =>
  access(path).then(
    () => true,
    () => false,
  );

async function loadAtlas(root, atlasId) {
  const directory = join(root, 'content/knowledge');
  const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
  const entry = manifest.collections.find((item) => item.id === atlasId);
  if (!entry) {
    const known = manifest.collections.map((item) => item.id).join(', ');
    throw new Error(`Atlas "${atlasId}" não está no manifesto. Disponíveis: ${known}.`);
  }
  return JSON.parse(await readFile(join(directory, entry.file), 'utf8'));
}

/** Writes the two draft files and returns their paths. Never overwrites an existing reading. */
export async function createIdeologyDraft(input, root = projectRoot) {
  const atlas = await loadAtlas(root, input.atlasId);
  const page = ideologyPageSchema.parse(ideologyDraftFromGraph(input, atlas));
  const supplement = ideologyGraphSchema.parse({ sources: [], edges: [] });
  const files = [
    [join(root, 'content/ideologies', input.slug, 'page.json'), page],
    [join(root, 'content/graph', `${input.slug}.json`), supplement],
  ];
  for (const [path] of files) {
    if (await exists(path)) throw new Error(`Já existe: ${path}. Nada foi alterado.`);
  }
  for (const [path, value] of files) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, await format(JSON.stringify(value), { parser: 'json' }));
  }
  return { page, paths: files.map(([path]) => path) };
}

async function main() {
  const { values } = parseArgs({
    options: {
      slug: { type: 'string' },
      title: { type: 'string' },
      kind: { type: 'string' },
      atlas: { type: 'string' },
      palette: { type: 'string' },
      note: { type: 'string' },
    },
  });
  const missing = ['slug', 'title', 'kind', 'atlas', 'palette', 'note'].filter((k) => !values[k]);
  if (missing.length) {
    throw new Error(
      `Faltam: ${missing.join(', ')}.\nUso: npm run ideology:new -- --slug anarquismo --title Anarquismo ` +
        '--kind tradicao --atlas atlas-anarquismo --palette anarquismo --note "Recorte e classificação"',
    );
  }
  const { page, paths } = await createIdeologyDraft({
    slug: values.slug,
    title: values.title,
    kind: values.kind,
    atlasId: values.atlas,
    palette: values.palette,
    classificationNote: values.note,
  });
  const count = (coverage) => page.chapters.filter((c) => c.coverage === coverage).length;
  console.log(`Rascunho criado (não publicado):\n  ${paths.join('\n  ')}`);
  console.log(`Capítulos: ${count('partial')} parciais, ${count('pending')} pendentes.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
