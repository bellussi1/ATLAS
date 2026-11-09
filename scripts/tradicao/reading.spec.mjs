import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  buildReading,
  defaultAtlasId,
  entityClaims,
  generateReadings,
  generatedSignature,
  readerText,
  readingReport,
  readingRootIn,
  reportMarkdown,
} from './reading.mjs';

const ENTITY = {
  id: 'wiki-topic-teste',
  slug: 'teste',
  title: 'Teste',
  aliases: ['tst'],
  kind: 'ideology',
  sections: [
    { heading: 'Resumo', paragraphs: ['Corrente de teste. O artigo a situa em 1900.'] },
    { heading: 'Origem', paragraphs: ['Nasceu em 1900 com Fulano.'] },
    { heading: 'Controvérsias', paragraphs: ['Críticos a acusam de excesso.'] },
  ],
};
const claim = (n, text, classification = 'documented-fact', withEvidence = true) => ({
  id: `claim-${n}`,
  entityId: ENTITY.id,
  text,
  classification,
  editorialStatus: 'pending',
  citationIds: withEvidence ? [`cit-${n}`] : [],
});
const atlas = (claims, relations = []) => ({
  id: 'atlas-teste',
  entities: [ENTITY],
  sources: [{ id: 'src-wiki-topic-teste' }],
  claims,
  citations: claims.map((_, i) => ({ id: `cit-${i + 1}`, evidenceId: `ev-${i + 1}` })),
  evidences: claims.map((_, i) => ({ id: `ev-${i + 1}`, sourceId: 'src-wiki-topic-teste' })),
  relations,
});
const build = (claims, extra = {}) =>
  buildReading({
    entity: ENTITY,
    atlas: atlas(claims),
    entityIndex: new Map(),
    relations: [],
    today: '2026-11-05',
    ...extra,
  });
const chapter = (page, id) => page.chapters.find((c) => c.id === id);

test('readerText troca "o artigo" por "o verbete" e preserva "em artigo"', () => {
  assert.equal(readerText('Segundo o artigo, X.'), 'Segundo o verbete, X.');
  assert.equal(readerText('Disse isso em artigo de 1979.'), 'Disse isso em artigo de 1979.');
  assert.equal(readerText('Segundo a Wikipédia, X. Y vale.'), 'Y vale.');
});

test('entityClaims liga a afirmação à seção, tira o ano do texto e exige citação', () => {
  const list = entityClaims(
    ENTITY,
    atlas([
      claim(1, 'Nasceu em 1900 com Fulano.'),
      claim(2, 'Fundou o partido. (1905).'),
      claim(3, 'Sem citação.', 'documented-fact', false),
    ]),
  );
  assert.equal(list.length, 2);
  assert.equal(list[0].heading, 'Origem');
  assert.equal(list[1].text, 'Fundou o partido.');
  assert.deepEqual([list[1].start, list[1].end], [1905, 1905]);
});

test('capítulos são os 12 canônicos, não publicados e sem revisão humana', () => {
  const page = build([claim(1, 'Nasceu em 1900 com Fulano.')]);
  assert.equal(page.chapters.length, 12);
  assert.equal(page.published, false);
  assert.equal(page.review.status, 'rascunho');
  assert.equal(page.review.reviewer, null);
  assert.equal(page.identity.signature, generatedSignature);
  assert.ok(page.chapters.every((c) => c.question === null && c.bridge === null));
});

test('capítulo sem conteúdo fica pending, com motivo e sem blocos nem fontes', () => {
  const page = build([claim(1, 'Nasceu em 1900 com Fulano.')]);
  for (const id of ['pensadores', 'vertentes', 'experiencias', 'conexoes', 'leituras']) {
    const c = chapter(page, id);
    assert.equal(c.coverage, 'pending', id);
    assert.ok(c.gap, id);
    assert.deepEqual(c.blocks, []);
    assert.deepEqual(c.sourceIds, []);
  }
});

test('origens usa a seção Origem com a classificação da afirmação', () => {
  const page = build([claim(1, 'Nasceu em 1900 com Fulano.', 'interpretation')]);
  const origens = chapter(page, 'origens');
  assert.equal(origens.coverage, 'complete');
  assert.deepEqual(origens.sourceIds, ['src-wiki-topic-teste']);
  assert.equal(origens.blocks[0].items[0].classification, 'interpretação');
});

test('épocas só monta cronologia com datas; contexto sem data fica parcial', () => {
  const dated = build([claim(1, 'Fundou o partido. (1905).')]);
  const epocas = chapter(dated, 'epocas');
  assert.equal(epocas.coverage, 'complete');
  assert.equal(epocas.blocks[1].type, 'chronology');
  assert.deepEqual(epocas.blocks[1].epochs, [{ itemId: 'marco-1', start: 1905, end: 1905 }]);
  const range = build([claim(1, 'Guerra civil. (1914–1918).')]);
  assert.deepEqual(chapter(range, 'epocas').blocks[1].epochs[0], {
    itemId: 'marco-1',
    start: 1914,
    end: 1918,
  });
});

test('debates reúne controvérsias e fica parcial por falta de defesa e resposta', () => {
  const page = build([claim(1, 'Críticos a acusam de excesso.', 'contested-claim')]);
  const debates = chapter(page, 'debates');
  assert.equal(debates.coverage, 'partial');
  assert.match(debates.gap, /defesa e resposta/);
});

test('conceitos com só apelidos é parcial; sem apelidos, pending', () => {
  const claims = [claim(1, 'Nasceu em 1900 com Fulano.')];
  assert.equal(chapter(build(claims), 'conceitos').coverage, 'partial');
  const bare = buildReading({
    entity: { ...ENTITY, aliases: [] },
    atlas: atlas(claims),
    entityIndex: new Map(),
    relations: [],
    today: '2026-11-05',
  });
  assert.equal(chapter(bare, 'conceitos').coverage, 'pending');
});

test('relações viram pensadores, vertentes e experiências pelo tipo do outro registro', () => {
  const person = { id: 'person-a', kind: 'person', title: 'A' };
  const other = { id: 'wiki-topic-b', kind: 'ideology', title: 'B' };
  const rel = (id, from, context) => ({
    id,
    fromEntityId: from,
    toEntityId: ENTITY.id,
    context,
    evidenceIds: ['ev-1'],
  });
  const page = build([claim(1, 'Nasceu em 1900 com Fulano.')], {
    entityIndex: new Map([person, other].map((e) => [e.id, e])),
    relations: [
      rel('r1', 'person-a', 'Inspirou, segundo o artigo.'),
      rel('r2', 'wiki-topic-b', 'Ramo.'),
    ],
  });
  const pensadores = chapter(page, 'pensadores');
  assert.equal(pensadores.coverage, 'complete');
  assert.deepEqual(pensadores.blocks[0].entityIds, ['person-a']);
  assert.equal(pensadores.blocks[0].notes['person-a'], 'Inspirou, segundo o verbete.');
  assert.deepEqual(chapter(page, 'vertentes').blocks[0].entityIds, ['wiki-topic-b']);
});

test('a raiz da tradição é procurada no grafo inteiro, não só na coleção focal', () => {
  const root = { ...ENTITY, externalIds: { wikidata: 'Q1' } };
  const graph = {
    atlases: [
      { id: 'atlas-focal', entities: [] },
      { id: 'atlas-raiz', entities: [root] },
    ],
  };
  assert.equal(readingRootIn(graph, 'Q1').atlas.id, 'atlas-raiz');
  assert.equal(readingRootIn(graph, 'Q404'), null);
});

test('relação de outra coleção usa o índice global de evidências', () => {
  const person = { id: 'person-a', kind: 'person', title: 'A' };
  const page = buildReading({
    entity: ENTITY,
    atlas: atlas([]),
    entityIndex: new Map([[person.id, person]]),
    relations: [
      {
        id: 'r1',
        fromEntityId: 'person-a',
        toEntityId: ENTITY.id,
        context: 'Inspirou.',
        evidenceIds: ['ev-other'],
      },
    ],
    today: '2026-11-05',
    evidenceIndex: new Map([['ev-other', { id: 'ev-other', sourceId: 'src-other' }]]),
    atlasId: 'atlas-saida',
    palette: 'fascismo',
  });
  assert.deepEqual(chapter(page, 'pensadores').sourceIds, ['src-other']);
  assert.equal(page.atlasId, 'atlas-saida');
  assert.equal(page.identity.palette, 'fascismo');
});

test('a leitura pode usar o slug e o título do registro quando a raiz tem outro título', () => {
  const page = build([claim(1, 'Nasceu em 1900 com Fulano.')], {
    pageSlug: 'trabalhismo',
    pageTitle: 'Trabalhismo',
  });
  assert.equal(page.slug, 'trabalhismo');
  assert.equal(page.id, 'ideology-page-trabalhismo');
  assert.equal(page.title, 'Trabalhismo');
});

test('posição política da fonte entra na introdução como atribuída', () => {
  const claims = [claim(1, 'Nasceu em 1900 com Fulano.')];
  const withPosition = atlas([
    ...claims,
    { ...claim(2, 'Posição política descrita na fonte: direita.', 'attributed-thesis') },
  ]);
  const page = buildReading({
    entity: ENTITY,
    atlas: withPosition,
    entityIndex: new Map(),
    relations: [],
    today: '2026-11-05',
  });
  assert.ok(
    chapter(page, 'introducao').narrative.includes('Posição política descrita na fonte: direita.'),
  );
});

test('o texto ao leitor não menciona projeto, Wikipédia nem "o artigo"', () => {
  const page = build([claim(1, 'Nasceu em 1900 com Fulano.')]);
  const prose = page.chapters.flatMap((c) => c.narrative).join(' ');
  assert.doesNotMatch(prose, /Wikip[eé]dia|Wikidata|ATLAS|plataforma|\bo artigo\b/i);
});

test('relatório conta capítulos por cobertura e lista os motivos', () => {
  const page = build([claim(1, 'Nasceu em 1900 com Fulano.')]);
  const report = readingReport(page);
  assert.equal(report.complete.length + report.partial.length + report.pending.length, 12);
  assert.ok(report.pending.includes('pensadores'));
  assert.ok(report.gaps.pensadores);
  assert.match(reportMarkdown('atlas-teste', [report]), /1 leituras/);
});

test('gera uma leitura válida no schema do build para cada ideologia da coleção principal', async () => {
  const result = await generateReadings({ atlasId: defaultAtlasId, write: false });
  assert.equal(result.written.length, 53);
  assert.equal(result.kept.length, 0);
  assert.ok(result.reports.every((r) => r.complete.length >= 1));
});

test('nunca sobrescreve página escrita à mão e regera as geradas', async () => {
  const root = await mkdtemp(join(tmpdir(), 'reading-'));
  const real = new URL('../../content/knowledge/', import.meta.url);
  await mkdir(join(root, 'content/knowledge/collections'), { recursive: true });
  const manifest = JSON.parse(await readFile(new URL('manifest.json', real), 'utf8'));
  await writeFile(join(root, 'content/knowledge/manifest.json'), JSON.stringify(manifest));
  for (const entry of manifest.collections)
    await writeFile(
      join(root, 'content/knowledge', entry.file),
      await readFile(new URL(entry.file, real)),
    );
  const handmade = join(root, 'content/ideologies/nazismo');
  await mkdir(handmade, { recursive: true });
  await writeFile(join(handmade, 'page.json'), '{"identity":{"signature":"Escrita à mão"}}');
  const first = await generateReadings({ root, slugs: ['nazismo', 'juche'], write: true });
  assert.deepEqual(first.kept, ['nazismo']);
  assert.deepEqual(first.written, ['juche']);
  assert.equal(
    await readFile(join(handmade, 'page.json'), 'utf8'),
    '{"identity":{"signature":"Escrita à mão"}}',
  );
  const again = await generateReadings({ root, slugs: ['juche'], write: true });
  assert.deepEqual(again.written, ['juche']);
});
