import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeCandidates, rankCited } from './wave.mjs';

const target = (qid, title, type) => ({ qid, title, type, missing: false });
const article = (...targets) => ({ targets });

test('conta em quantos artigos o item é citado, uma vez por artigo', () => {
  const ranked = rankCited(
    [
      article(target('Q1', 'Rosa Luxemburgo', 'pessoa'), target('Q1', 'Rosa Luxemburgo', 'pessoa')),
      article(target('Q1', 'Rosa Luxemburgo', 'pessoa')),
      article(target('Q2', 'Karl Kautsky', 'pessoa')),
    ],
    { min: 2 },
  );
  assert.deepEqual(
    ranked.map((entry) => [entry.qid, entry.n]),
    [['Q1', 2]],
  );
});

test('o que já está no grafo, tema geral e tipo fora da lista não entram', () => {
  const articles = [1, 2, 3].map(() =>
    article(
      target('Q1', 'Rosa Luxemburgo', 'pessoa'),
      target('Q2', 'Política', 'acontecimento'),
      target('Q3', 'Lista de partidos', 'organização'),
      target('Q4', 'Algo', 'outro'),
    ),
  );
  assert.deepEqual(rankCited(articles, { min: 2, known: new Set(['Q1']) }), []);
  assert.equal(rankCited(articles, { min: 2 }).length, 1);
});

test('lugar e conceito exigem limite maior', () => {
  const articles = [1, 2, 3].map(() =>
    article(target('Q1', 'Chile', 'lugar'), target('Q2', 'Sindicato', 'organização')),
  );
  const ranked = rankCited(articles, { min: 3, minBroad: 5 });
  assert.deepEqual(
    ranked.map((entry) => entry.qid),
    ['Q2'],
  );
  assert.equal(rankCited(articles, { min: 3, minBroad: 3 }).length, 2);
});

test('a onda soma aos candidatos sem repetir nem apagar o que já havia', () => {
  const existing = [{ qid: 'Q1', title: 'A', decision: 'accept' }];
  const { candidates, added } = mergeCandidates(existing, [
    { qid: 'Q1', title: 'A', type: 'pessoa', n: 9 },
    { qid: 'Q2', title: 'B', type: 'pessoa', n: 7 },
  ]);
  assert.deepEqual(
    added.map((entry) => entry.qid),
    ['Q2'],
  );
  assert.equal(candidates.length, 2);
  assert.equal(added[0].decidedBy, 'citação');
  assert.equal(added[0].type, 'pessoa');
});

test('idioma e identificador de catálogo não são verbete', () => {
  const articles = [1, 2, 3].map(() =>
    article(target('Q1', 'Língua inglesa', 'conceito'), target('Q2', 'ISBN', 'conceito')),
  );
  assert.deepEqual(rankCited(articles, { min: 2, minBroad: 2 }), []);
});
