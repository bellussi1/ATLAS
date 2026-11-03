import assert from 'node:assert/strict';
import { test } from 'node:test';

import { articleSections, articleText } from './article.mjs';
import { parseExtraction, verifyQuotes } from './extraction.mjs';

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
