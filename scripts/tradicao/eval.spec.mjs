import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { BudgetExceeded } from './cost.mjs';
import {
  armMetrics,
  buildReport,
  decideModel,
  relationUpgrade,
  residualErrors,
  reviewItems,
  runEval,
  sampleRecords,
  scoreEval,
} from './eval.mjs';
import { totalSpent } from './state.mjs';

const record = (
  id,
  type = 'pessoa',
  lang = 'pt',
  qid = `Q${[...id].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 7)}`,
) => ({
  id,
  entity: { id, label: 'Eduard Bernstein', type, qid },
  retrievedAt: '2026-11-04T00:00:00.000Z',
  article: {
    lang,
    title: id,
    url: `https://${lang}.wikipedia.org/wiki/${id}`,
    revision: '1',
    sections: [
      {
        index: 0,
        heading: '',
        text: 'Bernstein criticou Karl Kautsky por sua leitura ortodoxa do marxismo.\nBernstein nasceu em Berlim em 1850, filho de um maquinista.',
      },
    ],
    targets: [{ title: 'Karl Kautsky', qid: 'Q60025', type: 'pessoa', redirectedFrom: [] }],
    links: [],
    references: { bibliography: [] },
  },
});

const answer = {
  oneLine: 'Teórico do revisionismo.',
  summary: 'Resumo.',
  sections: [
    { kind: 'origem', text: 'Nasceu em Berlim.', quote: 'Bernstein nasceu em Berlim em 1850' },
  ],
  glossary: [],
  relations: [
    {
      target: 'Karl Kautsky',
      nature: 'reagiu-contra',
      direction: 'entidade-para-alvo',
      sentence: 'Criticou Kautsky.',
      quote: 'Bernstein criticou Karl Kautsky por sua leitura',
    },
    {
      target: 'Karl Kautsky',
      nature: 'fundou',
      direction: 'entidade-para-alvo',
      sentence: 'Fundou Kautsky.',
      quote: 'Bernstein criticou Karl Kautsky por sua leitura',
    },
    {
      target: 'Karl Kautsky',
      nature: 'influenciou',
      direction: 'entidade-para-alvo',
      sentence: 'Inventada.',
      quote: 'Bernstein inspirou profundamente Karl Kautsky em toda sua obra',
    },
  ],
  dates: [{ date: '1850', event: 'Nascimento', quote: 'Bernstein nasceu em Berlim em 1850' }],
  claims: [
    { statement: 'Inventada.', kind: 'fact', quote: 'frase que não existe no artigo fonte' },
  ],
};
const message = (value) => ({
  stop_reason: 'end_turn',
  usage: { input_tokens: 5000, output_tokens: 2000 },
  content: [{ type: 'text', text: JSON.stringify(value) }],
});

function fakeClient() {
  const stored = new Map();
  const batches = [];
  return {
    batches,
    messages: {
      batches: {
        create: async ({ requests }) => {
          for (const { custom_id } of requests)
            assert.match(custom_id, /^[a-zA-Z0-9_-]{1,64}$/, 'padrão de custom_id da API');
          const id = `b${batches.length}`;
          batches.push(requests);
          stored.set(id, requests);
          return { id };
        },
        retrieve: async () => ({ processing_status: 'ended' }),
        results: async function* results(id) {
          for (const { custom_id } of stored.get(id))
            yield {
              custom_id,
              result: {
                type: 'succeeded',
                message: message(
                  custom_id.startsWith('verify__')
                    ? { verdicts: [{ index: 0, verdict: 'confirma', reason: 'lido' }] }
                    : answer,
                ),
              },
            };
        },
      },
    },
  };
}

async function project(t, ids = ['a', 'b', 'c']) {
  const root = await mkdtemp(join(tmpdir(), 'atlas-eval-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const articles = join(root, 'generated/wiki-extract/x/articles');
  await mkdir(articles, { recursive: true });
  for (const id of ids) await writeFile(join(articles, `${id}.json`), JSON.stringify(record(id)));
  await mkdir(join(root, 'scripts/tradicao'), { recursive: true });
  return root;
}

const quiet = { log: () => {}, pollMs: 0 };

test('amostra: determinística, estratificada por tipo e idioma, um QID só', () => {
  const records = [
    ...Array.from({ length: 30 }, (_, i) => record(`p${i}`, 'pessoa', 'pt', `Q${i}`)),
    ...Array.from({ length: 5 }, (_, i) => record(`e${i}`, 'partido', 'en', `Q${100 + i}`)),
    record('dup', 'pessoa', 'en', 'Q1'),
    record('c0', 'conceito', 'pt', 'Q200'),
  ];
  const one = sampleRecords(records, 10);
  assert.equal(one.length, 10);
  assert.deepEqual(
    one.map((r) => r.id),
    sampleRecords([...records].reverse(), 10).map((r) => r.id),
  );
  const types = one.map((r) => r.entity.type);
  assert.ok(types.includes('conceito'));
  assert.ok(types.filter((type) => type === 'partido').length >= 3);
  assert.equal(new Set(one.map((r) => r.entity.qid)).size, 10);
  assert.equal(sampleRecords(records.slice(0, 2), 10).length, 2);
});

test('métricas: rejeições por citação, por código e pela segunda passada, com motivos', () => {
  const metrics = armMetrics(
    [
      {
        oneLine: 'x',
        summary: 'y',
        counts: { quotes: 10, relations: 4 },
        relations: [{ targetQid: 'Q1' }, { targetQid: null }],
        rejected: [
          { list: 'claims', reason: 'citacao-nao-literal' },
          { list: 'relations', reason: 'citacao-nao-literal' },
          { list: 'relations', reason: 'segunda-passada:inverte' },
        ],
      },
    ],
    { spend: { usd: 0.02, outputTokens: 100 }, entities: { a: { extract: { status: 'failed' } } } },
  );
  assert.equal(metrics.quotesRejected, 2);
  assert.equal(metrics.quotesRejectedRate, 0.2);
  assert.equal(metrics.relationsRejectedByCode, 1);
  assert.equal(metrics.relationsRejectedBySecondPass, 1);
  assert.equal(metrics.relationsRejectedRate, 0.5);
  assert.equal(metrics.relationsWithQid, 1);
  assert.equal(metrics.failed, 1);
});

test('conferência humana: nasce em branco; só marca de pessoa conta', () => {
  const draft = {
    entity: { id: 'a', label: 'A' },
    source: { url: 'u' },
    relations: [
      {
        target: 'B',
        nature: 'fundou',
        direction: 'alvo-para-entidade',
        sentence: 's',
        quote: 'trecho inteiro aqui',
      },
    ],
    sections: [{ text: 't1', quote: 'q1' }],
    claims: [{ statement: 't2', quote: 'q2' }],
    dates: [{ date: '1900', event: 'e', quote: 'q3' }],
  };
  const items = reviewItems(
    'haiku-low',
    [draft],
    new Map([['a', 'linha\ntrecho inteiro aqui e mais']]),
  );
  assert.equal(items.filter((item) => item.kind === 'relation').length, 1);
  assert.equal(items.filter((item) => item.kind === 'text').length, 2);
  assert.ok(items.every((item) => item.ok === null));
  assert.equal(items[0].statement, 'B fundou A');
  assert.equal(items[0].passage, 'trecho inteiro aqui e mais');
  const errors = residualErrors(
    [
      { arm: 'x', kind: 'relation', ok: true },
      { arm: 'x', kind: 'relation', ok: false },
      { arm: 'x', kind: 'text', ok: null },
      { arm: 'y', kind: 'relation', ok: false },
    ],
    'x',
  );
  assert.equal(errors.relation.error, 0.5);
  assert.equal(errors.text.checked, 0);
  assert.equal(errors.overall.checked, 2);
});

const scored = (relation, text, checked = 50) => ({
  relation: { checked, error: relation },
  text: { checked, error: text },
  overall: { checked: checked * 2, error: (relation + text) / 2 },
});

test('regra de decisão: Haiku fica abaixo de 5%, o mais barato primeiro; senão só relações sobe', () => {
  const lowOk = decideModel({
    'haiku-low': scored(0.03, 0.02),
    'haiku-medium': scored(0.01, 0.01),
  });
  assert.equal(lowOk.outcome, 'haiku-fica');
  assert.equal(lowOk.chosen.extracao.effort, 'low');
  const mediumOk = decideModel({
    'haiku-low': scored(0.08, 0.02),
    'haiku-medium': scored(0.04, 0.03),
  });
  assert.equal(mediumOk.chosen.extracao.effort, 'medium');
  assert.equal(mediumOk.chosen.relacoes, undefined);
  const limit = decideModel({
    'haiku-low': scored(0.05, 0.02),
    'haiku-medium': scored(0.05, 0.04),
  });
  assert.equal(
    limit.outcome,
    'so-relacoes-sobe',
    'exatamente 5% não passa: a regra é abaixo de 5%',
  );
  assert.equal(limit.chosen.extracao.model, 'claude-haiku-5-5');
  assert.equal(limit.chosen.relacoes.model, relationUpgrade);
  const bad = decideModel({ 'haiku-low': scored(0.2, 0.2), 'haiku-medium': scored(0.1, 0.1) });
  assert.equal(bad.outcome, 'revisar-prompt');
  assert.equal(bad.chosen, undefined);
  const few = decideModel({ 'haiku-low': scored(0, 0, 3), 'haiku-medium': scored(0, 0, 50) });
  assert.equal(few.outcome, 'insuficiente');
});

test('dry-run não chama a API nem grava; teto conjunto aborta antes do primeiro pedido', async (t) => {
  const root = await project(t);
  const client = fakeClient();
  const plan = await runEval({ root, from: ['x'], size: 3, dryRun: true, client, ...quiet });
  assert.equal(client.batches.length, 0);
  assert.ok(plan.worst > 0 && plan.expected < plan.worst);
  assert.equal(existsSync(join(root, 'generated/eval')), false);
  await assert.rejects(
    runEval({ root, from: ['x'], size: 3, client, maxUsd: 1e-6, ...quiet }),
    BudgetExceeded,
  );
  assert.equal(client.batches.length, 0);
  await assert.rejects(runEval({ root, from: ['vazio'], client, ...quiet }), /Sem artigos/);
});

test('ponta a ponta com cliente falso: dois braços, travas, relatório, conferência e decisão', async (t) => {
  const root = await project(
    t,
    Array.from({ length: 10 }, (_, i) => `art${i}`),
  );
  const client = fakeClient();
  await runEval({ root, from: ['x'], size: 10, client, ...quiet });
  assert.equal(client.batches.length, 4, 'extração e conferência por braço');
  const efforts = client.batches.map((requests) => requests[0].params.output_config.effort);
  assert.deepEqual(efforts, ['low', 'low', 'medium', 'medium']);
  assert.ok((await totalSpent(root)) > 0);

  const { metrics, items, directory } = await buildReport({ root });
  const low = metrics['haiku-low'];
  assert.equal(low.drafts, 10);
  assert.equal(low.relationsProposed, 30);
  assert.equal(low.relationsAccepted, 10);
  assert.equal(low.reasons['sem-verbo-do-tipo'], 10);
  assert.equal(low.reasons['citacao-nao-literal'], 20, 'relação inventada e afirmação inventada');
  assert.ok(low.relationsRejectedRate > 0.6);
  assert.ok(existsSync(join(directory, 'revisao.md')));
  assert.ok(items.length >= 40);
  assert.ok(items.every((item) => item.ok === null));

  const insufficient = await scoreEval({ root, minimum: 1000, today: '2026-11-04' });
  assert.equal(insufficient.decision.outcome, 'insuficiente');
  assert.equal(insufficient.wrote, false);

  // Uma pessoa marca: tudo certo no braço low. A marca sobrevive a um novo relatório.
  const path = join(directory, 'revisao.json');
  const marked = JSON.parse(await readFile(path, 'utf8')).map((item) => ({ ...item, ok: true }));
  await writeFile(path, JSON.stringify(marked));
  const again = await buildReport({ root });
  assert.ok(again.items.every((item) => item.ok === true));

  const final = await scoreEval({ root, minimum: 5, today: '2026-11-04' });
  assert.equal(final.decision.outcome, 'haiku-fica');
  assert.equal(final.wrote, true);
  const choice = JSON.parse(
    await readFile(join(root, 'scripts/tradicao/model-choice.json'), 'utf8'),
  );
  assert.deepEqual(choice.chosen.extracao, { model: 'claude-haiku-5-5', effort: 'low' });
  assert.equal(choice.candidates.length, 2);
});

test('retomada da avaliação: segunda execução não paga de novo', async (t) => {
  const root = await project(t);
  const client = fakeClient();
  await runEval({ root, from: ['x'], size: 2, client, ...quiet });
  const spent = await totalSpent(root);
  await runEval({ root, from: ['x'], size: 2, client, ...quiet });
  assert.equal(client.batches.length, 4);
  assert.equal(await totalSpent(root), spent);
});
