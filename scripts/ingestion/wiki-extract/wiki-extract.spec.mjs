import assert from 'node:assert/strict';
import { test } from 'node:test';

import { articleSections, articleText, parseWikiUrl } from './article.mjs';
import { parseExtraction, verifyQuotes } from './extraction.mjs';
import { rankCandidates } from './discovery.mjs';

const html = `<html><body>
<section><p>Karl Marx<sup class="reference">[1]</sup> foi um filósofo alemão.</p><table><tr><td>caixa</td></tr></table></section>
<section><h2>Vida<span class="mw-editsection">editar</span></h2><p>Nasceu em   Trier em 1818.</p></section>
<section><h2>Referências</h2><ul><li>Livro citado</li></ul></section>
</body></html>`;

test('reduces Parsoid HTML to prose sections without footnotes, tables or bibliography', () => {
  assert.deepEqual(articleSections(html), [
    { heading: '', text: 'Karl Marx foi um filósofo alemão.' },
    { heading: 'Vida', text: 'Nasceu em Trier em 1818.' },
  ]);
});

test('marks a capped article as truncated instead of cutting silently', () => {
  const article = { sections: articleSections(html) };
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
