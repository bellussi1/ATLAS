import assert from 'node:assert/strict';
import { test } from 'node:test';

import { namesEntity, normalizeText } from './enrichment-grounding.mjs';

test('normalizeText ignores accents, case, markdown links and citation markers', () => {
  const corpus = normalizeText(
    'O termo **revisionismo** foi usado após a [Revolução Bolchevique](https://pt.wikipedia.org/wiki/X).[[2]](https://pt.wikipedia.org/wiki/Y#cite_note-2)',
  );
  assert.ok(corpus.includes(normalizeText('após a Revolução   Bolchevique')));
  assert.ok(!corpus.includes('wikipedia'));
});

test('namesEntity needs the full title, not a loose word of it', () => {
  const quote = normalizeText(
    'Vladimir Lenin, o fundador da União Soviética e o líder do partido bolchevique',
  );
  assert.equal(namesEntity(quote, 'Bolchevique'), true);
  assert.equal(namesEntity(quote, 'União Soviética'), true);
  assert.equal(namesEntity(quote, 'Partido Comunista da União Soviética'), false);
  assert.equal(namesEntity(quote, 'Revolução de Outubro'), false);
});

test('namesEntity drops a trailing parenthetical and accepts plural stems', () => {
  const quote = normalizeText('Os bolcheviques tomaram o poder do Partido Liberal');
  assert.equal(namesEntity(quote, 'Bolchevique'), true);
  assert.equal(namesEntity(quote, 'Partido Liberal (2006)'), true);
});
