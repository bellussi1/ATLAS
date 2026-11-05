import assert from 'node:assert/strict';
import test from 'node:test';
import { positionFromArticle, valuesIn } from './position.mjs';

const article = (text) => ({
  url: 'https://pt.wikipedia.org/wiki/X',
  sections: [{ index: 0, heading: '', text }],
});

test('a forma composta não conta como a simples', () => {
  assert.deepEqual(valuesIn('Uma corrente de centro-esquerda.'), ['centro-esquerda']);
  assert.deepEqual(valuesIn('Posição de extrema-direita.'), ['extrema-direita']);
  assert.deepEqual(valuesIn('Filosofia política de esquerda.'), ['esquerda']);
});

test('lê a posição que o verbete atribui, com a frase literal', () => {
  const found = positionFromArticle(
    article(
      'A Terceira Via é uma corrente política predominantemente centrista. Tenta reconciliar centro-direita e centro-esquerda.',
    ),
  );
  assert.equal(found.value, 'centro');
  assert.equal(found.quote, 'A Terceira Via é uma corrente política predominantemente centrista.');
});

test('mais de um valor na mesma frase é variável, sem escolher', () => {
  const found = positionFromArticle(
    article('Existe tanto à esquerda quanto de direita em várias versões.'),
  );
  assert.equal(found.value, 'variavel');
  assert.deepEqual(found.candidates.sort(), ['direita', 'esquerda']);
});

test('sem menção na abertura, sem posição', () => {
  assert.equal(
    positionFromArticle(article('Doutrina filosófica da Grécia antiga. Defende a virtude.')),
    null,
  );
  assert.equal(positionFromArticle({ sections: [] }), null);
});
