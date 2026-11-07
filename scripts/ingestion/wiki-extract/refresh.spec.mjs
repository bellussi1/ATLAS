import assert from 'node:assert/strict';
import test from 'node:test';
import { refreshPlan } from './refresh.mjs';

const stored = (id, targets) => ({
  id,
  record: {
    entity: { id, label: id, type: 'ideology', qid: `Q${id.length}` },
    article: { lang: 'pt', title: `Artigo ${id}`, targets },
  },
});
const declared = (id) => ({ entity: { id, qid: `Q${id.length}` }, lang: null, title: null });

test('sem --refresh só entram os alvos declarados ainda não baixados', () => {
  const plan = refreshPlan(
    [stored('a', undefined), stored('b', [])],
    [declared('a'), declared('c')],
  );
  assert.deepEqual(
    plan.map((target) => target.entity.id),
    ['c'],
  );
});

test('--refresh reabre todo registro sem targets, inclusive fora da seleção', () => {
  const plan = refreshPlan(
    [stored('a', undefined), stored('b', undefined), stored('c', [{ title: 'X', qid: 'Q1' }])],
    [declared('c'), declared('d')],
    { refresh: true },
  );
  assert.deepEqual(
    plan.map((target) => target.entity.id),
    ['a', 'b', 'd'],
  );
  assert.deepEqual(plan[0], {
    entity: { id: 'a', label: 'a', type: 'ideology', qid: 'Q1' },
    lang: 'pt',
    title: 'Artigo a',
  });
  assert.equal(
    plan.filter((target) => target.entity.id === 'c').length,
    0,
    'quem já tem targets não é baixado de novo',
  );
});

test('alvo declarado sem registro entra uma vez só', () => {
  const plan = refreshPlan([], [declared('a'), declared('a')], { refresh: true });
  assert.deepEqual(
    plan.map((target) => target.entity.id),
    ['a'],
  );
});
