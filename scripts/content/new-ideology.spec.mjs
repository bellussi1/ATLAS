import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { createIdeologyDraft } from './new-ideology.mjs';

const input = {
  slug: 'teste',
  title: 'Teste',
  kind: 'tradicao',
  atlasId: 'atlas-teste',
  palette: 'anarquismo',
  classificationNote: 'Nota de recorte.',
};

async function project(t) {
  const root = await mkdtemp(join(tmpdir(), 'atlas-new-ideology-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'content/knowledge'), { recursive: true });
  await writeFile(
    join(root, 'content/knowledge/manifest.json'),
    JSON.stringify({ collections: [{ id: 'atlas-teste', file: 'atlas.json' }] }),
  );
  await writeFile(
    join(root, 'content/knowledge/atlas.json'),
    JSON.stringify({ entities: [], relations: [], sources: [] }),
  );
  return root;
}

test('creates an unpublished draft carrying its palette and no invented content', async (t) => {
  const root = await project(t);
  await createIdeologyDraft(input, root);
  const page = JSON.parse(await readFile(join(root, 'content/ideologies/teste/page.json'), 'utf8'));
  assert.equal(page.published, false);
  assert.equal(page.identity.palette, 'anarquismo');
  assert.equal(page.chapters.length, 12);
  assert.ok(page.chapters.every((c) => c.coverage === 'pending' && c.blocks.length === 0));
  const graph = JSON.parse(await readFile(join(root, 'content/graph/teste.json'), 'utf8'));
  assert.deepEqual(graph, { sources: [], edges: [], positions: [] });
});

test('refuses to overwrite a reading and leaves it intact', async (t) => {
  const root = await project(t);
  await createIdeologyDraft(input, root);
  const path = join(root, 'content/ideologies/teste/page.json');
  await cp(path, `${path}.bak`);
  await assert.rejects(createIdeologyDraft({ ...input, title: 'Outro' }, root), /Já existe/);
  assert.equal(await readFile(path, 'utf8'), await readFile(`${path}.bak`, 'utf8'));
});

test('rejects an unknown palette or atlas before writing', async (t) => {
  const root = await project(t);
  await assert.rejects(createIdeologyDraft({ ...input, palette: 'neon' }, root));
  await assert.rejects(createIdeologyDraft({ ...input, atlasId: 'nada' }, root), /Disponíveis/);
});
