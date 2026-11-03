import assert from 'node:assert/strict';
import { test } from 'node:test';

import { articleText, linkedTitle, parseArticle, parseWikiUrl, targetRecords } from './article.mjs';
import { parseExtraction, verifyQuotes } from './extraction.mjs';
import { rankCandidates } from './discovery.mjs';
import { classifyItem, mapResolution, targetKind } from './targets.mjs';

const html = `<html><body>
<section><p>Karl Marx<sup class="reference"><a href="./Karl_Marx#cite_note-1">[1]</a></sup> foi um <a rel="mw:WikiLink" href="./Filósofo_alemão">filósofo</a> alemão.</p><table><tr><td><a rel="mw:WikiLink" href="./Caixa">caixa</a></td></tr></table></section>
<section><h2>Vida<span class="mw-editsection">editar</span></h2><p>Nasceu em   Trier em 1818, veja <a rel="mw:WikiLink" href="./Friedrich_Engels#Obra">Engels</a>.</p><ul><li>Item com <a rel="mw:WikiLink" href="./Trier">Trier</a></li></ul></section>
<section><h2>Ver também</h2><ul><li><a rel="mw:WikiLink" href="./Socialismo">Socialismo</a></li></ul></section>
<section><h2>Referências</h2><ul><li>Livro citado</li></ul></section>
<ol class="references"><li id="cite_note-1"><span class="mw-cite-backlink"><a href="#cite_ref-1">↑</a></span> <span class="reference-text">Biografia citada.</span></li></ol>
</body></html>`;

test('reads prose sections without footnotes, tables or bibliography', () => {
  assert.deepEqual(parseArticle(html).sections, [
    { index: 0, heading: '', text: 'Karl Marx foi um filósofo alemão.' },
    { index: 1, heading: 'Vida', text: 'Nasceu em Trier em 1818, veja Engels.\nItem com Trier' },
  ]);
});

test('keeps body links with their section, heading, paragraph and written title', () => {
  assert.deepEqual(parseArticle(html).links, [
    { text: 'filósofo', written: 'Filósofo alemão', section: 0, heading: '', paragraph: 0 },
    { text: 'Engels', written: 'Friedrich Engels', section: 1, heading: 'Vida', paragraph: 0 },
    { text: 'Trier', written: 'Trier', section: 1, heading: 'Vida', paragraph: 1 },
    { text: 'Socialismo', written: 'Socialismo', section: 2, heading: 'Ver também', paragraph: 0 },
  ]);
});

test('keeps footnotes and bibliography apart from the prose, with where each is cited', () => {
  const { references } = parseArticle(html);
  assert.deepEqual(references.notes, [
    { id: 'cite_note-1', text: 'Biografia citada.', cites: [{ section: 0, paragraph: 0 }] },
  ]);
  assert.deepEqual(references.bibliography, [
    { index: 2, heading: 'Ver também', text: 'Socialismo' },
    { index: 3, heading: 'Referências', text: 'Livro citado' },
  ]);
});

test('reads the written title from a Parsoid wikilink without fragment or query', () => {
  assert.equal(linkedTitle('./Karl_Marx#Vida'), 'Karl Marx');
  assert.equal(linkedTitle('./Pagina_inexistente?action=edit&redlink=1'), 'Pagina inexistente');
});

test('resolves redirects and missing pages from one MediaWiki response', () => {
  const resolved = mapResolution(['karl marx', 'Socialismo', 'Capitalista', 'Não existe'], {
    query: {
      normalized: [{ from: 'karl marx', to: 'Karl marx' }],
      redirects: [{ from: 'Capitalista', to: 'Capitalismo' }],
      pages: [
        { title: 'Karl marx', pageprops: { wikibase_item: 'Q9061' } },
        { title: 'Socialismo', pageprops: {} },
        { title: 'Capitalismo', pageprops: { wikibase_item: 'Q4' } },
        { title: 'Não existe', missing: true },
      ],
    },
  });
  assert.deepEqual(resolved, [
    ['karl marx', { title: 'Karl marx', qid: 'Q9061', missing: false }],
    ['Socialismo', { title: 'Socialismo', qid: null, missing: false }],
    ['Capitalista', { title: 'Capitalismo', qid: 'Q4', missing: false }],
    ['Não existe', { title: 'Não existe', qid: null, missing: true }],
  ]);
});

test('lists each canonical target once, with its type and the titles that reached it', () => {
  const resolved = new Map([
    ['Capitalista', { title: 'Capitalismo', qid: 'Q4', missing: false }],
    ['Capitalismo', { title: 'Capitalismo', qid: 'Q4', missing: false }],
    ['Socialismo', { title: 'Socialismo', qid: null, missing: false }],
    ['Não existe', { title: 'Não existe', qid: null, missing: true }],
  ]);
  const kinds = new Map([['Q4', { type: 'conceito', classes: ['Q151885'], distance: 1 }]]);
  assert.deepEqual(targetRecords(resolved, kinds), [
    {
      title: 'Capitalismo',
      qid: 'Q4',
      missing: false,
      type: 'conceito',
      classes: ['Q151885'],
      distance: 1,
      redirectedFrom: ['Capitalista'],
    },
    {
      title: 'Socialismo',
      qid: null,
      missing: false,
      type: 'sem-item',
      classes: [],
      distance: null,
      redirectedFrom: [],
    },
    {
      title: 'Não existe',
      qid: null,
      missing: true,
      type: 'ausente',
      classes: [],
      distance: null,
      redirectedFrom: [],
    },
  ]);
});

test('types an item by the first target type reached through P31 and P279', () => {
  const graph = new Map([
    ['Q9061', { instanceOf: ['Q5'], subclassOf: [] }],
    ['Q5', { instanceOf: ['Q55983715'], subclassOf: [] }],
    ['Q7264', { instanceOf: ['Q12909644'], subclassOf: [] }],
    ['Q12909644', { instanceOf: [], subclassOf: ['Q7257'] }],
    ['Q7257', { instanceOf: [], subclassOf: ['Q151885'] }],
    ['Qpartido', { instanceOf: ['Q7278'], subclassOf: [] }],
    ['Q7278', { instanceOf: [], subclassOf: ['Q43229'] }],
    ['Q999', { instanceOf: ['Q9999'], subclassOf: [] }],
    ['Q9999', { instanceOf: [], subclassOf: [] }],
  ]);
  assert.deepEqual(classifyItem(graph, 'Q9061'), { type: 'pessoa', distance: 1, classes: ['Q5'] });
  assert.equal(classifyItem(graph, 'Q7264').type, 'ideologia');
  assert.equal(classifyItem(graph, 'Qpartido').type, 'partido');
  assert.deepEqual(classifyItem(graph, 'Q999'), {
    type: 'outro',
    distance: null,
    classes: ['Q9999'],
  });
});

test('prefers the nearest target type, not the earlier one in the list', () => {
  const graph = new Map([
    ['Qmix', { instanceOf: ['Qa', 'Q151885'], subclassOf: [] }],
    ['Qa', { instanceOf: [], subclassOf: ['Q43229'] }],
  ]);
  assert.deepEqual(classifyItem(graph, 'Qmix'), {
    type: 'conceito',
    distance: 1,
    classes: ['Qa', 'Q151885'],
  });
  assert.deepEqual(classifyItem(new Map([['Qsem', { instanceOf: [], subclassOf: [] }]]), 'Qsem'), {
    type: 'sem-classe',
    distance: null,
    classes: [],
  });
});

test('stops following classes after four links, so a deep chain stays unclassified', () => {
  const chain = ['Qc0', 'Qc1', 'Qc2', 'Qc3', 'Qc4', 'Qc5', 'Qc6'];
  const graph = new Map(
    chain.map((qid, index) => [
      qid,
      { instanceOf: [], subclassOf: index + 1 < chain.length ? [chain[index + 1]] : ['Q151885'] },
    ]),
  );
  graph.set('Qitem', { instanceOf: ['Qc0'], subclassOf: [] });
  assert.equal(classifyItem(graph, 'Qitem').type, 'outro');
  assert.equal(classifyItem(graph, 'Qc3').type, 'conceito');
});

test('marks wiki pages, missing pages and targets without an item explicitly', () => {
  const none = new Map();
  assert.equal(
    targetKind({ title: 'Maurice Brinton', qid: null, missing: true }, none).type,
    'ausente',
  );
  assert.equal(
    targetKind({ title: 'Socialismo', qid: null, missing: false }, none).type,
    'sem-item',
  );
  assert.equal(
    targetKind({ title: 'Socialismo', qid: 'Q1', missing: false }, none).type,
    'não-classificado',
  );
  assert.equal(
    targetKind({ title: 'Especial:Fontes de livros/0521329221', qid: null, missing: false }, none)
      .type,
    'não-artigo',
  );
});

const section = (index, heading, text) => ({ index, heading, text });

test('reads whole sections in order and lists the ones that do not fit', () => {
  const article = {
    sections: [
      section(0, '', 'A'.repeat(50)),
      section(1, 'Vida', 'B'.repeat(50)),
      section(2, 'Obra', 'C'.repeat(50)),
    ],
  };
  const { text, truncated, coverage } = articleText(article, 130);
  assert.equal(truncated, true);
  assert.deepEqual(
    coverage.read.map(({ section, heading }) => [section, heading]),
    [
      [0, ''],
      [1, 'Vida'],
    ],
  );
  assert.deepEqual(
    coverage.skipped.map(({ section, heading }) => [section, heading]),
    [[2, 'Obra']],
  );
  assert.equal(text, `${'A'.repeat(50)}\n\n## Vida\n${'B'.repeat(50)}`);
});

test('divides a long section by paragraph and marks each part', () => {
  const paragraphs = ['p1', 'p2', 'p3'].map((name) => name.padEnd(40, '.')).join('\n');
  const { coverage } = articleText({ sections: [section(0, 'Longa', paragraphs)] }, 100);
  assert.deepEqual(
    coverage.read.map(({ heading, part, parts }) => [heading, part, parts]),
    [['Longa', 1, 3]],
  );
  assert.deepEqual(
    coverage.skipped.map(({ part, parts }) => [part, parts]),
    [
      [2, 3],
      [3, 3],
    ],
  );
});

test('reports a paragraph larger than the budget as skipped, never cut', () => {
  const { text, truncated, coverage } = articleText(
    { sections: [section(0, 'Enorme', 'x'.repeat(200))] },
    100,
  );
  assert.equal(text, '');
  assert.equal(truncated, true);
  assert.equal(coverage.skipped[0].chars > 100, true);
});

test('reports a complete article with nothing skipped', () => {
  const { truncated, coverage } = articleText({ sections: [section(0, '', 'Curto.')] }, 1000);
  assert.equal(truncated, false);
  assert.deepEqual(coverage.skipped, []);
});

test('keeps only items whose quote appears literally in the source', () => {
  const source = 'Karl Marx foi um filósofo alemão.\nNasceu em Trier em 1818.';
  const { extraction, rejected } = verifyQuotes(
    {
      summary: 'Filósofo alemão.',
      dates: [{ date: '1818', event: 'Nascimento', quote: 'Nasceu em  Trier em 1818' }],
      relations: [],
      claims: [
        { statement: 'Foi filósofo.', kind: 'fact', quote: 'foi um filósofo alemão' },
        { statement: 'Inventado.', kind: 'fact', quote: 'escreveu cem romances' },
      ],
    },
    source,
  );
  assert.equal(extraction.dates.length, 1);
  assert.equal(extraction.claims.length, 1);
  assert.deepEqual(rejected, [{ list: 'claims', quote: 'escreveu cem romances' }]);
});

test('treats refusals and truncated outputs as errors', () => {
  assert.throws(() => parseExtraction({ stop_reason: 'refusal', content: [] }), /refusal/);
  assert.throws(() => parseExtraction({ stop_reason: 'max_tokens', content: [] }), /max_tokens/);
});

test('ranks pages linked from several seeds and drops seeds, years, lists and disambiguations', () => {
  const link = (title, extra = {}) => ({
    lang: 'pt',
    title,
    qid: `Q-${title}`,
    disambiguation: false,
    ...extra,
  });
  const seedA = { label: 'A', lang: 'pt', title: 'Seed A', qid: 'Q-seedA' };
  const seedB = { label: 'B', lang: 'pt', title: 'Seed B', qid: 'Q-seedB' };
  const ranked = rankCandidates(
    [
      {
        seed: seedA,
        links: [
          link('Seed B'),
          link('Revolução'),
          link('1917'),
          link('Lista de partidos'),
          link('Ambíguo', { disambiguation: true }),
          link('Comum'),
          link('Único'),
        ],
      },
      { seed: seedB, links: [link('Revolução'), link('Comum'), link('Seed A')] },
    ],
    { minShared: 2 },
  );
  assert.deepEqual(
    ranked.map((item) => [item.title, item.sharedByCount]),
    [
      ['Comum', 2],
      ['Revolução', 2],
    ],
  );
  assert.deepEqual(ranked[0].linkedFrom, ['A', 'B']);
  assert.equal(ranked[0].decision, null);
});

test('reads lang and title from Wikipedia article URLs and rejects other URLs', () => {
  assert.deepEqual(parseWikiUrl('https://pt.wikipedia.org/wiki/Marxismo'), {
    lang: 'pt',
    title: 'Marxismo',
  });
  assert.deepEqual(parseWikiUrl('https://en.wikipedia.org/wiki/Karl_Marx%27s_theory'), {
    lang: 'en',
    title: "Karl Marx's theory",
  });
  assert.throws(() => parseWikiUrl('https://example.org/wiki/Marxismo'), /inválida/);
  assert.throws(() => parseWikiUrl('http://pt.wikipedia.org/wiki/Marxismo'), /inválida/);
});
