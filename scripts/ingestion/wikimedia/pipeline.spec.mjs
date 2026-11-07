import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { runIngestion } from './pipeline.mjs';
import { isCommonsHost, isWikidataHost } from './hosts.mjs';
import { readSourceGraph, readSourceGraphBytes } from '../../content/source-graph.mjs';

const baselinePath = new URL('./raw/liberalism/2026-11-01/baseline.json', import.meta.url);
const config = {
  id: 'atlas-liberalism',
  slug: 'atlas-liberalismo',
  title: 'Atlas do Liberalismo',
  description: 'Coleção em revisão.',
  mediaDirectory: 'liberalism',
  entities: [['person-locke-alias', 'John Locke', 'John Locke', 'person', 'Q9353']],
};

// Synthetic transport fixtures for failure and determinism tests, not archival source data.
function transport() {
  return async (url) => ({
    contentType: 'application/json',
    bytes: Buffer.from(
      JSON.stringify(
        isWikidataHost(url)
          ? {
              entities: {
                Q9353: {
                  id: 'Q9353',
                  descriptions: { pt: { value: 'Descrição de teste' } },
                  aliases: { pt: [{ value: 'Locke' }, { value: 'Locke' }] },
                  sitelinks: { ptwiki: { title: 'John Locke' } },
                  claims: {
                    P737: [
                      {
                        mainsnak: { datavalue: { value: { id: 'Q9381' } } },
                        references: [
                          {
                            snaks: {
                              P854: [{ datavalue: { value: 'https://example.org/reference-a' } }],
                            },
                          },
                        ],
                      },
                      {
                        mainsnak: { datavalue: { value: { id: 'Q9381' } } },
                        references: [
                          {
                            snaks: {
                              P854: [{ datavalue: { value: 'https://example.org/reference-b' } }],
                            },
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            }
          : {
              query: {
                pages: {
                  1: {
                    title: 'John Locke',
                    categories: [],
                    links: [{ title: 'Adam Smith' }, { title: 'Adam_Smith' }],
                  },
                },
              },
            },
      ),
    ),
  });
}

async function scenario() {
  const directory = await mkdtemp(join(tmpdir(), 'atlas-ingestion-'));
  return {
    directory,
    archiveDir: join(directory, 'capture'),
    baselinePath,
    collectionKey: 'liberalism',
    config,
    mediaMode: 'preserve',
    outputPath: join(directory, 'graph.json'),
    fetchResource: transport(),
  };
}

test('captured input replays twice byte for byte with network forbidden; canonical IDs and references survive', async () => {
  const options = await scenario();
  const captured = await runIngestion({ ...options, mode: 'capture' });
  const first = await readFile(options.outputPath);
  const offline = {
    ...options,
    mode: 'offline',
    fetchResource: () => {
      throw Error('NETWORK FORBIDDEN');
    },
  };
  const replay = await runIngestion(offline);
  await runIngestion({ ...offline, outputPath: join(options.directory, 'second.json') });
  assert.deepEqual(await readFile(options.outputPath), first);
  assert.deepEqual(await readFile(join(options.directory, 'second.json')), first);
  assert.equal(replay.snapshotHash, captured.snapshotHash);
  const graph = JSON.parse(first);
  const entities = graph.atlases.flatMap((a) => a.entities);
  assert.equal(entities.filter((e) => e.externalIds?.wikidata === 'Q9353').length, 1);
  assert.equal(entities.find((e) => e.id === 'person-john-locke').title, 'John Locke');
  const atlas = graph.atlases.find((a) => a.id === 'atlas-liberalism');
  const relation = atlas.relations.find(
    (r) => r.id === 'liberalism-statement-person-john-locke-p737-person-adam-smith',
  );
  assert.equal(atlas.relations.filter((r) => r.id === relation.id).length, 1);
  const evidence = atlas.evidences.find((e) => e.id === relation.evidenceIds[0]);
  assert.match(evidence.note, /reference-a/);
  assert.match(evidence.note, /reference-b/);
  const original = JSON.parse(await readFile(baselinePath));
  assert.deepEqual(
    graph.atlases.find((a) => a.id === 'atlas-marx-valor').claims,
    original.atlases.find((a) => a.id === 'atlas-marx-valor').claims,
  );
});

test('tampered raw response fails offline and leaves the destination unchanged', async () => {
  const options = await scenario();
  await runIngestion({ ...options, mode: 'capture' });
  const before = await readFile(options.outputPath);
  const manifest = JSON.parse(await readFile(join(options.archiveDir, 'manifest.json')));
  await writeFile(join(options.archiveDir, 'blobs', `${manifest.requests[0].sha256}.bin`), '{}');
  await assert.rejects(runIngestion({ ...options, mode: 'offline' }), /hash|integridade/i);
  assert.deepEqual(await readFile(options.outputPath), before);
});

test('invalid graph or obsolete baseline cannot replace an existing snapshot', async () => {
  const options = await scenario();
  await runIngestion({ ...options, mode: 'capture' });
  await writeFile(options.outputPath, 'curadoria posterior');
  await assert.rejects(runIngestion({ ...options, mode: 'offline' }), /destino|alterado/i);
  assert.equal(await readFile(options.outputPath, 'utf8'), 'curadoria posterior');
  const invalid = await scenario();
  const badGraph = JSON.parse(await readFile(baselinePath));
  badGraph.atlases[0].relations.push({ id: 'bad' });
  const badPath = join(invalid.directory, 'invalid.json');
  await writeFile(badPath, JSON.stringify(badGraph));
  await writeFile(invalid.outputPath, 'snapshot preservado');
  await assert.rejects(runIngestion({ ...invalid, baselinePath: badPath, mode: 'capture' }));
  assert.equal(await readFile(invalid.outputPath, 'utf8'), 'snapshot preservado');
});

test('a Windows checkout with CRLF preserves the same baseline identity', async () => {
  const options = await scenario();
  await runIngestion({ ...options, mode: 'capture' });
  const baseline = (await readFile(baselinePath, 'utf8')).replace(/\r?\n/g, '\r\n');
  await writeFile(options.outputPath, baseline);
  await runIngestion({ ...options, mode: 'offline' });
  const manifest = JSON.parse(await readFile(join(options.archiveDir, 'manifest.json')));
  assert.equal(JSON.parse(await readFile(options.outputPath)).updatedAt, manifest.capturedAt);
});

test('default publication atomically replaces the source manifest and preserves offline replay', async () => {
  const options = await scenario();
  const sourceRoot = join(options.directory, 'knowledge');
  await runIngestion({ ...options, mode: 'capture', sourceRoot, outputPath: undefined });
  const first = await readSourceGraphBytes(sourceRoot);
  await runIngestion({ ...options, mode: 'offline', sourceRoot, outputPath: undefined });
  assert.deepEqual(await readSourceGraphBytes(sourceRoot), first);
  assert.equal((await readSourceGraph(sourceRoot)).atlases.length, 5);
  const manifest = JSON.parse(await readFile(join(sourceRoot, 'manifest.json')));
  assert.equal(manifest.collections.length, 5);
  assert.equal(
    (await readdir(sourceRoot)).some((name) => name.includes('.pending-')),
    false,
  );
});

test('missing response, changed configuration or API error fails closed without network fallback', async () => {
  const options = await scenario();
  await runIngestion({ ...options, mode: 'capture' });
  await assert.rejects(runIngestion({ ...options, mode: 'capture' }), /já existe/);
  await assert.rejects(
    runIngestion({
      ...options,
      mode: 'offline',
      config: { ...config, title: 'Configuração diferente' },
    }),
    /incompatível/,
  );
  const manifest = JSON.parse(await readFile(join(options.archiveDir, 'manifest.json')));
  await unlink(join(options.archiveDir, 'blobs', `${manifest.requests[0].sha256}.bin`));
  await assert.rejects(
    runIngestion({
      ...options,
      mode: 'offline',
      fetchResource: () => assert.fail('Offline attempted network'),
    }),
    /Blob ausente/,
  );
  const invalid = await scenario();
  await assert.rejects(
    runIngestion({
      ...invalid,
      mode: 'capture',
      fetchResource: async () => ({
        contentType: 'application/json',
        bytes: Buffer.from('{"error":{"code":"bad"}}'),
      }),
    }),
    /inválida/,
  );
  assert.equal((await readdir(invalid.directory)).includes('graph.json'), false);
  assert.equal((await readdir(invalid.directory)).includes('capture'), false);
});

test('validation of the generated graph happens before publishing the archive or snapshot', async () => {
  const options = await scenario();
  const badPath = join(options.directory, 'new-baseline.json');
  const graph = JSON.parse(await readFile(baselinePath));
  const atlas = graph.atlases.find((a) => a.id === 'atlas-liberalism');
  atlas.entities = atlas.entities.filter((e) => e.id !== 'person-john-locke');
  atlas.entityIds = atlas.entities.map((e) => e.id);
  for (const a of graph.atlases)
    a.relations = a.relations.filter(
      (r) => ![r.fromEntityId, r.toEntityId].includes('person-john-locke'),
    );
  await writeFile(badPath, JSON.stringify(graph));
  await assert.rejects(
    runIngestion({
      ...options,
      mode: 'capture',
      baselinePath: badPath,
      config: { ...config, entities: [['INVALID-ID', 'Locke', 'Locke', 'person', 'Q9353']] },
    }),
    /identificador|slug/i,
  );
  assert.equal((await readdir(options.directory)).includes('graph.json'), false);
  assert.equal((await readdir(options.directory)).includes('capture'), false);
});

test('reviewed relations and their evidence/source metadata survive a refresh', async () => {
  const options = await scenario();
  const graph = JSON.parse(await readFile(baselinePath));
  const atlas = graph.atlases.find((a) => a.id === 'atlas-liberalism');
  const source = {
    id: 'liberalism-source-wikidata-person-john-locke',
    title: 'Fonte revisada',
    url: 'https://www.wikidata.org/wiki/Q9353',
    edition: 'Edição editorial',
    publicationDate: null,
  };
  atlas.sources = atlas.sources.filter((s) => s.id !== source.id);
  atlas.sources.push(source);
  const evidence = {
    id: 'liberalism-evidence-person-john-locke-p737-person-adam-smith',
    sourceId: source.id,
    locator: 'Localizador revisado',
    accessedAt: '2026-10-31',
    note: 'Nota autoral',
  };
  atlas.evidences.push(evidence);
  const relation = {
    id: 'liberalism-statement-person-john-locke-p737-person-adam-smith',
    fromEntityId: 'person-john-locke',
    toEntityId: 'person-adam-smith',
    type: 'influenced_by',
    label: 'Rótulo autoral',
    reverseLabel: 'Reverso autoral',
    context: 'Recorte editorial',
    temporalExtent: null,
    uncertainty: 'high',
    evidenceIds: [evidence.id],
    editorialStatus: 'contested',
  };
  atlas.relations.push(relation);
  const inputPath = join(options.directory, 'curated.json');
  await writeFile(inputPath, JSON.stringify(graph));
  await runIngestion({ ...options, baselinePath: inputPath, mode: 'capture' });
  const updated = JSON.parse(await readFile(options.outputPath));
  const result = updated.atlases.find((a) => a.id === atlas.id);
  assert.deepEqual(
    result.relations.find((r) => r.id === relation.id),
    relation,
  );
  assert.deepEqual(
    result.evidences.find((e) => e.id === evidence.id),
    evidence,
  );
  assert.deepEqual(
    result.sources.find((s) => s.id === source.id),
    source,
  );
});

test('evidence already cited by an editorial claim is not overwritten by an imported statement', async () => {
  const options = await scenario();
  const graph = JSON.parse(await readFile(baselinePath));
  const atlas = graph.atlases.find((a) => a.id === 'atlas-liberalism');
  const evidence = {
    id: 'liberalism-evidence-person-john-locke-p737-person-adam-smith',
    sourceId: 'liberalism-source-wikidata-person-john-locke',
    locator: 'Localizador editorial',
    accessedAt: '2026-10-31',
    note: 'Nota que sustenta um recorte autoral',
  };
  atlas.evidences.push(evidence);
  atlas.citations.push({
    id: 'citation-preserved',
    evidenceId: evidence.id,
    relation: 'contextualizes',
  });
  atlas.claims.push({
    id: 'claim-preserved',
    entityId: 'person-john-locke',
    text: 'Recorte de teste',
    classification: 'unverified',
    editorialStatus: 'pending',
    citationIds: ['citation-preserved'],
  });
  atlas.reviews.push({
    id: 'review-preserved',
    claimId: 'claim-preserved',
    status: 'pending',
    reviewer: null,
    reviewedAt: null,
    note: null,
  });
  const inputPath = join(options.directory, 'curated-claim.json');
  await writeFile(inputPath, JSON.stringify(graph));
  await runIngestion({ ...options, baselinePath: inputPath, mode: 'capture' });
  const updated = JSON.parse(await readFile(options.outputPath));
  assert.deepEqual(
    updated.atlases.find((a) => a.id === atlas.id).evidences.find((e) => e.id === evidence.id),
    evidence,
  );
});

function mediaTransport({ failImage = false, blockedLicense = false } = {}) {
  const base = transport();
  return async (url, kind) => {
    if (kind === 'image') {
      if (failImage) throw Error('Download interrompido');
      return { bytes: Buffer.from('synthetic image fixture'), contentType: 'image/png' };
    }
    if (isCommonsHost(url))
      return {
        contentType: 'application/json',
        bytes: Buffer.from(
          JSON.stringify({
            query: {
              pages: {
                1: {
                  imageinfo: [
                    {
                      thumburl: 'https://upload.wikimedia.org/test.png',
                      url: 'https://upload.wikimedia.org/original.png',
                      extmetadata: {
                        LicenseShortName: {
                          value: blockedLicense ? 'All rights reserved' : 'CC BY-SA 4.0',
                        },
                        LicenseUrl: {
                          value: blockedLicense
                            ? 'https://example.org/proprietary'
                            : 'https://creativecommons.org/licenses/by-sa/4.0/',
                        },
                        Artist: { value: 'Fixture author' },
                      },
                    },
                  ],
                },
              },
            },
          }),
        ),
      };
    const response = await base(url);
    const body = JSON.parse(response.bytes);
    if (body.entities)
      body.entities.Q9353.claims.P18 = [{ mainsnak: { datavalue: { value: 'Fixture.png' } } }];
    return { ...response, bytes: Buffer.from(JSON.stringify(body)) };
  };
}

test('licensed image bytes replay offline; collisions leave images and snapshots untouched', async () => {
  const options = await scenario();
  const mediaRoot = join(options.directory, 'public');
  await runIngestion({
    ...options,
    mode: 'capture',
    mediaRoot,
    mediaMode: 'refresh',
    fetchResource: mediaTransport(),
  });
  const graph = JSON.parse(await readFile(options.outputPath));
  const asset = graph.atlases
    .find((a) => a.id === 'atlas-liberalism')
    .assetLicenses.find((a) => a.id === 'liberalism-asset-person-john-locke');
  const path = join(mediaRoot, asset.assetPath);
  const image = await readFile(path);
  const offline = {
    ...options,
    mediaRoot,
    mode: 'offline',
    fetchResource: () => assert.fail('Offline media attempted network'),
  };
  await runIngestion(offline);
  assert.deepEqual(await readFile(path), image);
  await writeFile(path, 'imagem local alterada');
  const outputPath = join(options.directory, 'blocked.json');
  await assert.rejects(runIngestion({ ...offline, outputPath }), /Colisão de mídia/);
  assert.equal(await readFile(path, 'utf8'), 'imagem local alterada');
  assert.equal(
    (await readdir(options.directory)).some(
      (name) => name.includes('.pending-') || name === 'blocked.json',
    ),
    false,
  );
});

test('failed image capture aborts publication and blocked licenses never download bytes', async () => {
  const options = await scenario();
  await assert.rejects(
    runIngestion({
      ...options,
      mode: 'capture',
      mediaRoot: join(options.directory, 'public'),
      mediaMode: 'refresh',
      fetchResource: mediaTransport({ failImage: true }),
    }),
    /Download interrompido/,
  );
  assert.equal((await readdir(options.directory)).includes('graph.json'), false);
  const blocked = await scenario();
  await runIngestion({
    ...blocked,
    mode: 'capture',
    mediaMode: 'refresh',
    mediaRoot: join(blocked.directory, 'public'),
    fetchResource: mediaTransport({ failImage: true, blockedLicense: true }),
  });
  assert.equal((await readdir(blocked.directory)).includes('public'), false);
});
