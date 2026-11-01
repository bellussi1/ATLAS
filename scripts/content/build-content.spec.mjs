import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { buildContent } from './build-content.mjs';
import { buildExplorationLayout } from './exploration-layout.mjs';
import {
  readSourceGraph,
  readSourceGraphBytes,
  sourceDirectory,
  writeSourceGraph,
} from './source-graph.mjs';

test('source shards round-trip the complete canonical graph without a second global JSON', async () => {
  const graph = await readSourceGraph();
  const directory = await mkdtemp(join(tmpdir(), 'atlas-source-roundtrip-'));
  const manifest = await writeSourceGraph(graph, { directory });
  const originalManifest = JSON.parse(await readFile(join(sourceDirectory, 'manifest.json')));
  assert.deepEqual(manifest, originalManifest);
  assert.deepEqual(await readSourceGraph(directory), graph);
  assert.deepEqual(await readSourceGraphBytes(directory), await readSourceGraphBytes());
  await assert.rejects(
    readFile(new URL('../../src/content/atlas.json', import.meta.url)),
    /ENOENT/,
  );
});

test('build is deterministic offline and emits search, directed adjacency and stable geometry', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw Error('Build attempted network');
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const first = await mkdtemp(join(tmpdir(), 'atlas-content-first-'));
  const second = await mkdtemp(join(tmpdir(), 'atlas-content-second-'));
  const manifest = await buildContent({ outputDirectory: first });
  await buildContent({ outputDirectory: second });
  const files = (await readdir(first)).sort();
  assert.deepEqual(files, (await readdir(second)).sort());
  for (const file of files)
    assert.deepEqual(await readFile(join(first, file)), await readFile(join(second, file)));
  const read = async (asset) => JSON.parse(await readFile(join(first, asset.file)));
  const adjacency = await read(manifest.adjacency);
  assert.ok(
    adjacency['person-karl-marx'].some(
      (r) => r.relationId === 'relation-marx-capital' && r.direction === 'outgoing',
    ),
  );
  assert.ok(
    adjacency['work-capital-volume-i'].some(
      (r) => r.relationId === 'relation-marx-capital' && r.label === 'foi escrito por',
    ),
  );
  const search = await read(manifest.search);
  assert.ok(
    search.some((entry) => entry.id === 'person-karl-marx' && entry.searchText.includes('marx')),
  );
  const layouts = await read(manifest.layouts);
  assert.deepEqual(layouts.atlases.center, {
    x: 460,
    y: 286,
  });
  assert.ok(layouts.editorial.marxismo.graphs['correntes-1'].nodes.length > 0);
  assert.equal(
    Object.keys(layouts.exploration.networks.all.nodes).length,
    (await readSourceGraph()).atlases.flatMap((a) => a.entities).length,
  );
  assert.ok(layouts.exploration.networks.all.edges['relation-marx-capital']);
  assert.ok(Object.keys(layouts.exploration.networks).length > 1);
  const manifesto = layouts.exploration.timeline.markers['work-communist-manifesto'];
  assert.equal(manifesto.width, 0);
  assert.equal(manifesto.partial, true);
  assert.ok(layouts.exploration.timeline.markers['person-john-locke'].width > 0);
});

test('invalid references fail the build instead of emitting an inconsistent manifest', async () => {
  const graph = await readSourceGraph();
  graph.atlases[0].relations.push({ id: 'invalid-reference' });
  const outputDirectory = await mkdtemp(join(tmpdir(), 'atlas-content-invalid-'));
  await assert.rejects(buildContent({ graph, outputDirectory }));
  assert.deepEqual(await readdir(outputDirectory), []);
  const duplicate = await readSourceGraph();
  const locke = duplicate.atlases
    .flatMap((atlas) => atlas.entities)
    .find((entity) => entity.id === 'person-john-locke');
  duplicate.atlases[0].entities[0].externalIds = locke.externalIds;
  await assert.rejects(buildContent({ graph: duplicate, outputDirectory }), /Q9353/);
  assert.deepEqual(await readdir(outputDirectory), []);
});

test('exploration geometry is keyed by stable IDs and handles missing or single dates', async () => {
  const graph = await readSourceGraph();
  const first = buildExplorationLayout(graph);
  for (const atlas of graph.atlases) {
    atlas.entities.reverse();
    atlas.relations.reverse();
  }
  assert.deepEqual(buildExplorationLayout(graph), first);
  for (const atlas of graph.atlases)
    for (const entity of atlas.entities) entity.temporalExtent = null;
  const noDates = buildExplorationLayout(graph);
  assert.deepEqual(noDates.timeline, { ticks: [], markers: {} });
  graph.atlases[0].entities[0].temporalExtent = {
    startYear: 1800,
    endYear: null,
    precision: 'year',
    label: null,
  };
  const oneDate = buildExplorationLayout(graph).timeline;
  assert.deepEqual(oneDate.ticks, [{ year: 1800, x: 50 }]);
  assert.deepEqual(Object.values(oneDate.markers), [{ x: 50, width: 0, partial: true }]);
});

test('a new edition changes only affected hashes and a failed rebuild preserves the last manifest', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'atlas-content-edition-'));
  const graph = await readSourceGraph();
  const first = await buildContent({ graph, outputDirectory });
  graph.atlases[0].entities[0].summary += ' Recorte sintético para o teste de edição.';
  const second = await buildContent({ graph, outputDirectory });
  assert.notEqual(second.release, first.release);
  assert.notEqual(second.collections[0].file, first.collections[0].file);
  assert.deepEqual(second.collections.slice(1), first.collections.slice(1));
  assert.notEqual(second.search.file, first.search.file);
  assert.equal(second.adjacency.file, first.adjacency.file);
  assert.equal(second.layouts.file, first.layouts.file);
  const before = await readFile(join(outputDirectory, 'manifest.json'));
  graph.atlases[0].relations.push({ id: 'invalid-after-valid-edition' });
  await assert.rejects(buildContent({ graph, outputDirectory }));
  assert.deepEqual(await readFile(join(outputDirectory, 'manifest.json')), before);
  assert.ok((await readFile(join(outputDirectory, first.collections[0].file))).length > 0);
});
