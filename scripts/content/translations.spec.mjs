import './register-source-modules.mjs';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { compileTranslations } from './translations.mjs';
import { readSourceGraph } from './source-graph.mjs';
import { buildContent } from './build-content.mjs';

const catalogue = JSON.parse(
  await readFile(new URL('../../src/content/translations/catalogue.json', import.meta.url)),
);
test('translation reviews explicitly identify assistant review and reject source drift', async () => {
  const graph = await readSourceGraph();
  const approved = compileTranslations(catalogue, graph);
  assert.equal(approved.length, 4);
  assert.ok(
    approved.every(
      (t) => t.review.method === 'assistant' && t.review.note.includes('Sem revisão humana'),
    ),
  );
  graph.atlases.flatMap((a) => a.entities).find((e) => e.id === approved[0].entityId).summary +=
    ' Alteração sintética.';
  assert.throws(() => compileTranslations(catalogue, graph), /desatualizada/);
});
test('pending drafts do not enter public assets or the search index and invalid reviews keep the last manifest', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'atlas-translations-'));
  const draft = structuredClone(catalogue);
  draft.entries[0].review = { status: 'pending', note: 'Não publicar este rascunho.' };
  draft.entries[0].text.summary = 'SENTINEL-UNPUBLISHED-TRANSLATION';
  const manifest = await buildContent({ translationCatalogue: draft, outputDirectory: directory });
  for (const file of await readdir(directory))
    assert.equal(
      (await readFile(join(directory, file), 'utf8')).includes('SENTINEL-UNPUBLISHED-TRANSLATION'),
      false,
    );
  const previous = await readFile(join(directory, 'manifest.json'));
  const invalid = structuredClone(catalogue);
  invalid.entries[0].sourceDigest = '0'.repeat(64);
  await assert.rejects(
    buildContent({ translationCatalogue: invalid, outputDirectory: directory }),
    /desatualizada/,
  );
  assert.deepEqual(await readFile(join(directory, 'manifest.json')), previous);
  assert.ok(manifest.search.file);
});
