import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { describe, it } from 'node:test';

import './register-source-modules.mjs';

const { readSourceGraph } = await import('./source-graph.mjs');
const { validateIdeologyDossier } =
  await import('../../src/app/features/ideologies/models/ideology-page.schema.ts');

const contentRoot = new URL('../../content/', import.meta.url);

async function pageSlugs() {
  const entries = await readdir(new URL('ideologies/', contentRoot));
  const slugs = [];
  for (const name of entries) {
    if (name === 'examples') continue;
    const pagePath = new URL(`ideologies/${name}/page.json`, contentRoot);
    if (
      await stat(pagePath).then(
        () => true,
        () => false,
      )
    )
      slugs.push(name);
  }
  return slugs;
}

describe('páginas de leitura de ideologias', () => {
  it('validam contra o grafo de coleções, publicadas ou em rascunho', async () => {
    const graph = await readSourceGraph();
    const slugs = await pageSlugs();
    assert.ok(slugs.length > 0, 'há pelo menos uma página');
    for (const slug of slugs) {
      const page = JSON.parse(
        await readFile(new URL(`ideologies/${slug}/page.json`, contentRoot), 'utf8'),
      );
      const supplement = JSON.parse(
        await readFile(new URL(`graph/${slug}.json`, contentRoot), 'utf8'),
      );
      assert.doesNotThrow(() => validateIdeologyDossier(page, supplement, graph), slug);
    }
  });
});
