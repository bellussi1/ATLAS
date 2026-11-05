import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createHttp } from '../ingestion/wiki-extract/http.mjs';
import {
  createNeighbors,
  expandableTypes,
  labelStatements,
  linkPositions,
  mergeCandidates,
  readItem,
} from './discover.mjs';
import { commonsInfoUrl, collectImages, fileDecision, iconFor, imageFiles } from './images.mjs';
import { decide, expand, regionalReason, regionalRules } from './scoring.mjs';

const claim = (id, rank = 'normal') => ({ rank, mainsnak: { datavalue: { value: { id } } } });
const file = (value, rank = 'normal') => ({ rank, mainsnak: { datavalue: { value } } });
const sites = (...keys) => Object.fromEntries(keys.map((key) => [key, { title: key }]));
const item = (id, { title, claims = {}, languages = 3, en = false }) => ({
  id,
  labels: { pt: { value: title } },
  claims,
  sitelinks: {
    ...(en ? {} : { ptwiki: { title } }),
    enwiki: { title },
    ...sites(...Array.from({ length: languages }, (_, i) => `x${i}wiki`)),
    commonswiki: { title: 'ignorado' },
  },
});

const PERSON = 'Q5';
const wikidata = {
  Q100: item('Q100', {
    title: 'Fascismo',
    claims: { P737: [claim('Q101')], P1142: [claim('Q102')] },
    languages: 100,
  }),
  Q101: item('Q101', { title: 'Influenciador', claims: { P31: [claim(PERSON)] }, languages: 80 }),
  Q102: item('Q102', { title: 'Corrente', claims: { P31: [claim('Q7257')] }, languages: 80 }),
  Q103: item('Q103', {
    title: 'Ação Integralista Brasileira',
    claims: { P31: [claim('Q7278')], P17: [claim('Q155')] },
    languages: 8,
  }),
  Q104: item('Q104', { title: 'Citado no fim', claims: { P31: [claim(PERSON)] }, languages: 70 }),
  Q105: item('Q105', {
    title: 'Registro de autoridade',
    claims: { P31: [claim('Q999')] },
    languages: 70,
  }),
  Q106: item('Q106', {
    title: 'Sem artigo',
    claims: { P31: [claim(PERSON)] },
    languages: 70,
    en: true,
  }),
  Q999: item('Q999', { title: 'Classe qualquer', languages: 0 }),
  [PERSON]: item(PERSON, { title: 'Ser humano', languages: 0 }),
  Q7257: item('Q7257', { title: 'Ideologia', languages: 0 }),
  Q7278: item('Q7278', { title: 'Partido', languages: 0 }),
  Q155: item('Q155', { title: 'Brasil', languages: 200 }),
};
delete wikidata.Q106.sitelinks.enwiki;
delete wikidata.Q106.sitelinks.ptwiki;

function fakeHttp() {
  const urls = [];
  return {
    urls,
    http: createHttp(async (url) => {
      urls.push(String(url));
      const parsed = new URL(url);
      let body = {};
      if (parsed.searchParams.get('action') === 'wbgetentities') {
        const ids = parsed.searchParams.get('ids').split('|');
        body = {
          entities: Object.fromEntries(ids.map((id) => [id, wikidata[id] ?? { id, missing: '' }])),
        };
      } else if (parsed.searchParams.get('list') === 'search') {
        const query = parsed.searchParams.get('srsearch');
        const hits = query.includes('P17=Q155')
          ? ['Q103']
          : query.includes('P1142=') && !query.includes('P27') && !query.includes('P17')
            ? ['Q105']
            : [];
        body = { query: { search: hits.map((title) => ({ title })) } };
      }
      return { bytes: Buffer.from(JSON.stringify(body)), contentType: 'application/json' };
    }),
  };
}

const article = {
  sections: [
    { index: 0, heading: '', text: 'x' },
    { index: 1, heading: 'Fim', text: 'y' },
  ],
  links: [
    { target: 'Primeiro', section: 0 },
    { target: 'Citado no fim', section: 1 },
    { target: 'Bibliografia', section: 9 },
    { target: 'Primeiro', section: 1 },
  ],
  targets: [
    { title: 'Citado no fim', qid: 'Q104', type: 'pessoa' },
    { title: 'Bibliografia', qid: 'Q105', type: 'obra' },
  ],
};

test('leitura do item: idiomas só de Wikipedias, títulos pt e en e regiões sem declaração obsoleta', () => {
  const read = readItem(
    item('Q1', {
      title: 'T',
      languages: 3,
      claims: { P17: [claim('Q155'), claim('Q30', 'deprecated')] },
    }),
  );
  assert.equal(read.languages, 5, '3 + ptwiki + enwiki, sem commonswiki');
  assert.deepEqual(read.regions, ['Q155']);
  assert.deepEqual(read.titles, { pt: 'T', en: 'T' });
});

test('posição do link: primeira ocorrência, só no corpo do artigo', () => {
  const positions = linkPositions(article);
  assert.equal(positions.get('Primeiro'), 0);
  assert.equal(positions.get('Citado no fim'), 0.5);
  assert.equal(positions.has('Bibliografia'), false);
});

test('P737 e P1142 viram rótulo guardado, para entrar como associação', () => {
  assert.deepEqual(labelStatements(wikidata.Q100), [
    {
      qid: 'Q100',
      property: 'P737',
      targetQid: 'Q101',
      url: 'https://www.wikidata.org/wiki/Q100#P737',
    },
    {
      qid: 'Q100',
      property: 'P1142',
      targetQid: 'Q102',
      url: 'https://www.wikidata.org/wiki/Q100#P1142',
    },
  ]);
});

test('coletor: parte só do QID, une propriedades, texto, rótulos e sondas regionais; sem artigo sai', async () => {
  const { http, urls } = fakeHttp();
  const { neighbors, statements } = createNeighbors({
    http,
    root: 'Q100',
    readArticle: async () => article,
  });
  const found = await neighbors('Q100');
  const by = Object.fromEntries(found.map((c) => [c.qid, c]));
  assert.equal(by.Q101.type, 'pessoa');
  assert.equal(by.Q101.linkPosition, 0);
  assert.deepEqual(by.Q101.via, ['influenciado por']);
  assert.equal(by.Q102.type, 'ideologia');
  assert.equal(by.Q103.type, 'partido', 'partido brasileiro achado pela sonda, sem semente');
  assert.deepEqual(by.Q103.regions, ['Q155']);
  assert.equal(by.Q104.linkPosition, 0.5);
  assert.equal(by.Q106, undefined);
  assert.equal(statements.length, 2);
  assert.ok(urls.some((url) => url.includes('P17%3DQ155') || url.includes('P17=Q155')));
});

test('rede instável: repete a resposta lenta e relata a consulta perdida, sem perder o resto', async () => {
  const { http } = fakeHttp();
  const seen = new Map();
  const flaky = createHttp(async (url, kind) => {
    const count = (seen.get(url) ?? 0) + 1;
    seen.set(url, count);
    if (count === 1) throw new Error('This operation was aborted');
    if (url.includes('P27%3DQ155') || url.includes('P27=Q155')) throw new Error('sempre fora');
    return http.resource(url, kind);
  });
  const { neighbors, failures } = createNeighbors({
    http: flaky,
    root: 'Q100',
    readArticle: async () => article,
    retryDelayMs: 0,
  });
  const found = await neighbors('Q100');
  assert.ok(
    found.some((c) => c.qid === 'Q103'),
    'a sonda por P17 sobreviveu',
  );
  assert.equal(failures.length, 1);
  assert.match(failures[0].query, /P27=Q155/);
});

test('expansão real sobre o coletor: faixas, regional e tipo fora de escopo', async () => {
  const { http } = fakeHttp();
  const { neighbors } = createNeighbors({ http, root: 'Q100', readArticle: async () => article });
  const found = await expand(['Q100'], neighbors, {
    maxRing: 1,
    expandable: (entry) => expandableTypes.has(entry.type),
  });
  const by = Object.fromEntries(found.map((c) => [c.qid, c]));
  assert.equal(by.Q101.decision, 'accept');
  assert.equal(by.Q103.regional, 'América Latina ou Brasil');
  assert.notEqual(by.Q103.decision, 'discard', 'poucos idiomas não apagam o nicho brasileiro');
  assert.equal(by.Q105.decision, 'discard');
  assert.match(by.Q105.reason, /tipo fora do escopo|genérico/);
  assert.equal(
    by.Q104.decision,
    'review',
    'famoso, citado uma vez e no meio do texto: lista curta',
  );
});

test('lugar é aceito, mas não abre o anel seguinte; a lista curta tem teto', async () => {
  const opened = [];
  const graph = {
    Q1: [
      { qid: 'Q2', title: 'Brasil', languages: 80, linkPosition: 0, type: 'lugar', via: ['país'] },
      { qid: 'Q3', title: 'Pessoa', languages: 80, linkPosition: 0, type: 'pessoa' },
      ...Array.from({ length: 5 }, (_, i) => ({
        qid: `Q${10 + i}`,
        title: `Médio ${i}`,
        languages: 30,
        linkPosition: 1,
        type: 'conceito',
      })),
    ],
  };
  const found = await expand(
    ['Q1'],
    async (qid) => {
      opened.push(qid);
      return graph[qid] ?? [];
    },
    { expandable: (entry) => expandableTypes.has(entry.type), reviewCap: 2 },
  );
  assert.deepEqual(opened, ['Q1', 'Q3']);
  assert.equal(found.filter((c) => c.decision === 'review').length, 2);
  assert.equal(found.filter((c) => /lista curta/.test(c.reason ?? '')).length, 3);
});

test('página genérica citada no texto vai para a lista curta; pessoa no início do artigo é aceita', async () => {
  const graph = {
    Q1: [
      {
        qid: 'Q2',
        title: 'Política',
        languages: 80,
        linkPosition: 0,
        type: 'conceito',
        via: ['link no texto'],
      },
      {
        qid: 'Q3',
        title: 'Marx',
        languages: 80,
        linkPosition: 0.1,
        type: 'pessoa',
        via: ['link no texto'],
      },
      {
        qid: 'Q4',
        title: 'Trabalhismo',
        languages: 80,
        linkPosition: 0.9,
        type: 'conceito',
        via: ['parte de'],
      },
    ],
  };
  const found = await expand(['Q1'], async (qid) => graph[qid] ?? [], { maxRing: 1 });
  const by = Object.fromEntries(found.map((c) => [c.qid, c]));
  assert.equal(by.Q2.decision, 'review');
  assert.equal(by.Q3.decision, 'accept');
  assert.equal(by.Q4.decision, 'accept');
});

test('nicho regional tem vagas próprias: páginas famosas não o tiram do teto do anel', async () => {
  const graph = {
    Q1: [
      ...Array.from({ length: 5 }, (_, i) => ({
        qid: `Q${10 + i}`,
        title: `Famosa ${i}`,
        languages: 80,
        linkPosition: 0,
        type: 'pessoa',
      })),
      {
        qid: 'Q2',
        title: 'Partido dos Trabalhadores',
        languages: 40,
        linkPosition: 0.5,
        type: 'partido',
        regions: ['Q155'],
      },
    ],
  };
  const found = await expand(['Q1'], async (qid) => graph[qid] ?? [], {
    maxRing: 1,
    ringCaps: { 1: 3 },
  });
  const party = found.find((c) => c.qid === 'Q2');
  assert.equal(party.decision, 'accept');
  assert.equal(party.regional, 'América Latina ou Brasil');
  assert.equal(found.filter((c) => /teto do anel/.test(c.reason)).length, 2);
});

test('a raiz não abre as próprias classes nem as classes dos tipos', async () => {
  const { http } = fakeHttp();
  const table = { ...wikidata };
  table.Q100 = item('Q100', {
    title: 'Fascismo',
    claims: {
      P31: [claim('Q7257')],
      P279: [claim('Q101')],
      P737: [claim('Q101')],
      P102: [claim('Q7278')],
    },
    languages: 100,
  });
  const scoped = createHttp(async (url, kind) => {
    const parsed = new URL(url);
    if (parsed.searchParams.get('action') === 'wbgetentities') {
      const ids = parsed.searchParams.get('ids').split('|');
      return {
        bytes: Buffer.from(
          JSON.stringify({
            entities: Object.fromEntries(ids.map((id) => [id, table[id] ?? { id, missing: '' }])),
          }),
        ),
      };
    }
    return http.resource(url, kind);
  });
  const { neighbors } = createNeighbors({
    http: scoped,
    root: 'Q100',
    readArticle: async () => ({}),
  });
  const qids = (await neighbors('Q100')).map((c) => c.qid);
  assert.ok(!qids.includes('Q7257'));
  assert.ok(!qids.includes('Q7278'));
  assert.ok(!qids.includes('Q101'), 'classe da qual a raiz é subclasse');
});

test('regra regional cobre o Brasil e a região; Europa não recebe bônus', () => {
  for (const qid of ['Q155', 'Q298', 'Q12585']) assert.ok(regionalReason({ regions: [qid] }), qid);
  assert.equal(regionalReason({ regions: ['Q183'] }), null);
  assert.ok(regionalReason({ regions: ['Q8683'] }).includes('Guerra Fria'));
  assert.equal(new Set(regionalRules.regions).size, regionalRules.regions.length);
});

test('tipo fora de escopo nunca é aceito, por maior que seja a pontuação', () => {
  assert.equal(
    decide({ title: 'Biblioteca Nacional', type: 'outro', score: 999 }).decision,
    'discard',
  );
  assert.equal(decide({ title: 'Página', type: 'sem-item', score: 999 }).decision, 'discard');
  assert.equal(decide({ title: 'Marx', type: 'pessoa', score: 999 }).decision, 'accept');
});

test('reconciliação por QID: decisão de pessoa sobrevive e entidade do grafo é marcada', () => {
  const merged = mergeCandidates(
    [
      { qid: 'Q1', title: 'A', decision: 'discard' },
      { qid: 'Q2', title: 'B', decision: 'accept' },
      { qid: 'Q3', title: 'C', decision: 'review' },
    ],
    {
      previous: [{ qid: 'Q1', decision: 'accept', decidedBy: 'editor', reason: 'fica' }],
      knownQids: new Map([['Q2', 'person-b']]),
    },
  );
  assert.equal(merged[0].decision, 'accept');
  assert.equal(merged[0].decidedBy, 'editor');
  assert.equal(merged[1].decidedBy, 'rule:expansao');
  assert.equal(merged[1].existingEntityId, 'person-b');
  assert.equal(merged[2].decidedBy, null);
});

// Imagens

const license = (short, url, artist = 'Fulana') => ({
  thumburl: 'https://upload.wikimedia.org/thumb/x.jpg',
  url: 'https://upload.wikimedia.org/x.jpg',
  extmetadata: {
    LicenseShortName: { value: short },
    ...(url ? { LicenseUrl: { value: url } } : {}),
    ...(artist ? { Artist: { value: `<a href="#">${artist}</a>` } } : {}),
  },
});

test('licença por arquivo: livre passa; NC, ND, sem autor, não livre e sem miniatura viram ícone', () => {
  const free = fileDecision(
    'a.jpg',
    license('CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/'),
  );
  assert.ok(free.ok);
  assert.equal(free.asset.creator, 'Fulana');
  assert.equal(free.asset.assetPath, 'https://upload.wikimedia.org/thumb/x.jpg');
  assert.match(free.asset.filePageUrl, /File:a\.jpg$/);
  assert.ok(fileDecision('a.jpg', license('Public domain', null)).ok);
  const refused = [
    ['CC BY-NC 4.0', 'https://creativecommons.org/licenses/by-nc/4.0/'],
    ['CC BY-ND 4.0', 'https://creativecommons.org/licenses/by-nd/4.0/'],
    ['All rights reserved', 'https://example.com/'],
    ['Fair use', null],
  ];
  for (const [short, url] of refused)
    assert.equal(fileDecision('a', license(short, url)).ok, false, short);
  assert.match(
    fileDecision('a', license('CC0', 'https://creativecommons.org/publicdomain/zero/1.0/', null))
      .reason,
    /autor/,
  );
  const nonFree = license('CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/');
  nonFree.extmetadata.NonFree = { value: 'true' };
  assert.match(fileDecision('a', nonFree).reason, /não livre/);
  assert.match(
    fileDecision('a', {
      ...nonFree,
      extmetadata: license('CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/').extmetadata,
      thumburl: 'https://evil.example/x.jpg',
    }).reason,
    /miniatura/,
  );
  assert.match(fileDecision('a', undefined).reason, /metadados/);
});

test('ícone por tipo cobre todos os tipos; tipo desconhecido vira conceito', () => {
  for (const [type, icon] of [
    ['pessoa', 'person'],
    ['partido', 'party'],
    ['lugar', 'place'],
    ['acontecimento', 'event'],
  ])
    assert.equal(iconFor(type), icon);
  assert.equal(iconFor('outro'), 'concept');
});

test('imagem por tipo: partido prefere logo, ideologia prefere símbolo; obsoleta não conta', () => {
  const entity = {
    claims: {
      P18: [file('foto.jpg')],
      P154: [file('logo.svg')],
      P41: [file('velha.svg', 'deprecated')],
    },
  };
  assert.deepEqual(imageFiles(entity, 'partido'), ['logo.svg', 'foto.jpg']);
  assert.deepEqual(imageFiles(entity, 'ideologia'), ['foto.jpg']);
  assert.deepEqual(imageFiles(entity, 'pessoa'), ['foto.jpg']);
  assert.deepEqual(imageFiles(undefined, 'pessoa'), []);
});

test('coleta: tenta o próximo arquivo, usa cada imagem uma vez e cai no ícone com motivo', async () => {
  const items = {
    Q1: { id: 'Q1', claims: { P18: [file('livre.jpg')] } },
    Q2: { id: 'Q2', claims: { P18: [file('livre.jpg')] } },
    Q3: { id: 'Q3', claims: { P154: [file('fechado.png')], P18: [file('segunda.jpg')] } },
    Q4: { id: 'Q4', claims: {} },
  };
  const infos = {
    'livre.jpg': license('CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/'),
    'fechado.png': license('Trademark', 'https://example.com/'),
    'segunda.jpg': {
      ...license('CC0', 'https://creativecommons.org/publicdomain/zero/1.0/'),
      thumburl: 'https://upload.wikimedia.org/thumb/2.jpg',
    },
  };
  const http = createHttp(async (url) => {
    const parsed = new URL(url);
    const body =
      parsed.searchParams.get('action') === 'wbgetentities'
        ? {
            entities: Object.fromEntries(
              parsed.searchParams
                .get('ids')
                .split('|')
                .map((id) => [id, items[id]]),
            ),
          }
        : {
            query: {
              pages: { 1: { imageinfo: [infos[parsed.searchParams.get('titles').slice(5)]] } },
            },
          };
    return { bytes: Buffer.from(JSON.stringify(body)) };
  });
  const result = await collectImages(
    [
      { id: 'p', type: 'pessoa', qid: 'Q1' },
      { id: 'c', type: 'conceito', qid: 'Q2' },
      { id: 'q', type: 'partido', qid: 'Q3' },
      { id: 'v', type: 'lugar', qid: 'Q4' },
    ],
    { http, retrievedAt: '2026-11-04' },
  );
  assert.equal(result.p.status, 'licensed');
  assert.equal(result.c.status, 'icon');
  assert.equal(result.c.icon, 'concept');
  assert.match(result.c.reason, /já usada/);
  assert.equal(result.q.asset.fileTitle, 'segunda.jpg');
  assert.equal(result.v.icon, 'place');
  assert.match(commonsInfoUrl('a b.jpg'), /iiurlwidth=640/);
});
