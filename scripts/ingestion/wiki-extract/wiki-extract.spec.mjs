import assert from 'node:assert/strict';
import { test } from 'node:test';

import { articleText, linkedTitle, parseArticle, parseWikiUrl, targetRecords } from './article.mjs';
import { parseExtraction, verifyQuotes } from './extraction.mjs';
import { rankCandidates } from './discovery.mjs';
import { mapResolution } from './targets.mjs';

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

test('lists each canonical target once, with the titles that reached it', () => {
  const resolved = new Map([
    ['Capitalista', { title: 'Capitalismo', qid: 'Q4', missing: false }],
    ['Capitalismo', { title: 'Capitalismo', qid: 'Q4', missing: false }],
    ['Socialismo', { title: 'Socialismo', qid: null, missing: false }],
  ]);
  assert.deepEqual(targetRecords(resolved), [
    { title: 'Capitalismo', qid: 'Q4', missing: false, redirectedFrom: ['Capitalista'] },
    { title: 'Socialismo', qid: null, missing: false, redirectedFrom: [] },
  ]);
});

test('marks a capped article as truncated instead of cutting silently', () => {
  const article = { sections: parseArticle(html).sections };
  assert.equal(articleText(article, 1000).truncated, false);
  assert.deepEqual(articleText(article, 10), { text: 'Karl Marx ', truncated: true });
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
