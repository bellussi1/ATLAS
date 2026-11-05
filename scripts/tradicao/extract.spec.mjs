import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { BudgetExceeded, costOfUsage, createBudget, estimateRun, estimateTokens } from './cost.mjs';
import { customIdFor, planRun, reapplyGuards, renderPlan, runExtraction } from './extract.mjs';
import { loadStateFile, withStateDefaults } from './state.mjs';

const sentence = 'Bernstein criticou Karl Kautsky por sua leitura ortodoxa do marxismo.';
const record = (id) => ({
  id,
  entity: { id, label: 'Eduard Bernstein', type: 'pessoa', qid: 'Q1' },
  retrievedAt: '2026-11-04T00:00:00.000Z',
  article: {
    lang: 'pt',
    title: 'Eduard Bernstein',
    qid: 'Q1',
    url: 'https://pt.wikipedia.org/wiki/Eduard_Bernstein',
    revision: '1',
    sections: [{ index: 0, heading: '', text: sentence }],
    targets: [{ title: 'Karl Kautsky', qid: 'Q60025', type: 'pessoa', redirectedFrom: [] }],
    links: [],
    references: { bibliography: [] },
  },
});

const modelText = (value) => ({
  stop_reason: 'end_turn',
  usage: { input_tokens: 10_000, output_tokens: 1_000, cache_read_input_tokens: 500 },
  content: [{ type: 'text', text: JSON.stringify(value) }],
});
const extraction = {
  oneLine: 'Teórico do revisionismo.',
  summary: 'Resumo.',
  sections: [],
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
      nature: 'semelhante-a',
      direction: 'entidade-para-alvo',
      sentence: 'x',
      quote: 'Bernstein criticou Karl Kautsky por sua leitura',
    },
  ],
  dates: [],
  claims: [],
};

/** Double of the Anthropic client: answers by phase and records every paid-for request. */
function fakeClient({ failIds = [], verdict = 'confirma', textVerdicts = [] } = {}) {
  const calls = { batches: [], sync: [], retrieve: 0 };
  const stored = new Map();
  const answer = (customId) => {
    if (customId.startsWith('verifytext__')) return modelText({ verdicts: textVerdicts });
    if (customId.startsWith('verify__'))
      return modelText({ verdicts: [{ index: 0, verdict, reason: 'lido' }] });
    return modelText(extraction);
  };
  return {
    calls,
    messages: {
      create: async (params) => {
        calls.sync.push(params);
        return params.max_tokens === 3000
          ? modelText({ verdicts: [{ index: 0, verdict, reason: 'lido' }] })
          : modelText(extraction);
      },
      batches: {
        create: async ({ requests }) => {
          for (const { custom_id } of requests)
            assert.match(custom_id, /^[a-zA-Z0-9_-]{1,64}$/, 'padrão de custom_id da API');
          const id = `batch-${calls.batches.length}`;
          calls.batches.push({ id, requests });
          stored.set(id, requests);
          return { id };
        },
        retrieve: async () => {
          calls.retrieve += 1;
          return { processing_status: 'ended' };
        },
        results: async function* results(id) {
          for (const { custom_id } of stored.get(id)) {
            if (failIds.includes(custom_id))
              yield { custom_id, result: { type: 'errored', error: { message: 'erro de teste' } } };
            else yield { custom_id, result: { type: 'succeeded', message: answer(custom_id) } };
          }
        },
      },
    },
  };
}

async function workspace(t) {
  const dir = await mkdtemp(join(tmpdir(), 'atlas-extract-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const stateFile = join(dir, 'STATE.json');
  return {
    stateFile,
    outDirectory: join(dir, 'extracts'),
    responsesDirectory: join(dir, 'responses'),
    loadStateFile: () => loadStateFile(stateFile),
    pollMs: 0,
    log: () => {},
    maxUsd: 1,
  };
}

test('custom_id segue o padrão da API, mesmo com id longo ou fora do padrão', () => {
  assert.equal(customIdFor('extract', 'topic-karl-marx'), 'extract__topic-karl-marx');
  for (const id of ['x'.repeat(80), 'topic-organização:1']) {
    const custom = customIdFor('verify', id);
    assert.match(custom, /^verify__[a-f0-9]{32}$/);
    assert.notEqual(custom, customIdFor('verify', `${id}2`));
  }
});

test('custo: entrada estimada para mais, pior caso usa todo max_tokens e toda escrita de cache', () => {
  assert.equal(estimateTokens(2700), 1000);
  const run = estimateRun(
    [
      {
        fixedChars: 2700,
        variableChars: 27_000,
        maxOutputTokens: 12_000,
        expectedOutputTokens: 5_000,
      },
      {
        fixedChars: 2700,
        variableChars: 27_000,
        maxOutputTokens: 12_000,
        expectedOutputTokens: 5_000,
      },
    ],
    { model: 'claude-haiku-5-5' },
  );
  // Pior caso: (1000×2 + 10000) × $0,10 + 12000 × $0,50, por pedido, com 50% de lote.
  assert.ok(Math.abs(run.worstCaseUsd - (2 * (12_000 * 0.1 + 12_000 * 0.5)) / 1e6 / 2) < 1e-9);
  assert.ok(run.expectedUsd < run.worstCaseUsd);
  assert.throws(
    () =>
      estimateRun(
        [{ fixedChars: 1, variableChars: 1, maxOutputTokens: 1, expectedOutputTokens: 1 }],
        { model: 'gpt' },
      ),
    /sem preço/,
  );
});

test('custo: prompt acima de 100 mil tokens usa a tabela longa do Haiku 5.5', () => {
  const short = estimateRun(
    [{ fixedChars: 0, variableChars: 270_000, maxOutputTokens: 0, expectedOutputTokens: 0 }],
    { model: 'claude-haiku-5-5', batch: false, cached: false },
  );
  const long = estimateRun(
    [{ fixedChars: 0, variableChars: 270_100, maxOutputTokens: 0, expectedOutputTokens: 0 }],
    { model: 'claude-haiku-5-5', batch: false, cached: false },
  );
  assert.ok(long.worstCaseUsd > short.worstCaseUsd * 4);
});

test('custo real: lote, leitura e escrita de cache entram na conta', () => {
  const usd = costOfUsage(
    {
      input_tokens: 1000,
      output_tokens: 1000,
      cache_read_input_tokens: 1000,
      cache_creation_input_tokens: 1000,
      cache_creation: { ephemeral_1h_input_tokens: 1000, ephemeral_5m_input_tokens: 0 },
    },
    { model: 'claude-haiku-5-5', batch: true },
  );
  assert.ok(Math.abs(usd - ((1000 + 100 + 2000) * 0.1 + 1000 * 0.5) / 1e6 / 2) < 1e-12);
});

test('teto: reserva acima do limite aborta; o razão anterior conta no teto total', () => {
  const budget = createBudget({ maxUsd: 1, maxTotalUsd: 10, spentBefore: 9.5 });
  assert.throws(() => budget.reserve(1.5, 'x'), BudgetExceeded);
  assert.throws(() => budget.reserve(0.6, 'x'), /teto total/);
  budget.reserve(0.4, 'x');
  budget.charge(0.1);
  assert.equal(budget.spent, 0.1);
});

test('dry-run monta o plano sem cliente e o teto aborta antes de qualquer envio', async (t) => {
  const paths = await workspace(t);
  const records = [record('a'), record('b')];
  const options = { model: 'claude-haiku-5-5', effort: 'low' };
  const plan = planRun({ records, state: withStateDefaults({}), ...options });
  assert.equal(plan.extract.requests, 2);
  assert.match(renderPlan(plan, options), /pior caso/);
  const client = fakeClient();
  await assert.rejects(
    runExtraction({ records, client, ...paths, ...options, maxUsd: 0.000001 }),
    BudgetExceeded,
  );
  assert.equal(client.calls.batches.length, 0, 'nada foi enviado');
  assert.equal(existsSync(paths.stateFile), false);
});

test('lote: duas passadas, cache, rascunho com travas e STATE.json como razão', async (t) => {
  const paths = await workspace(t);
  const client = fakeClient();
  const { state, spent } = await runExtraction({
    records: [record('a'), record('b'), record('c')],
    client,
    ...paths,
    effort: 'low',
  });
  assert.equal(
    client.calls.batches.length,
    2,
    'sem item de texto, a conferência do texto não paga',
  );
  const [extract, verify] = client.calls.batches;
  assert.equal(extract.requests.length, 3);
  assert.deepEqual(extract.requests[0].params.system[0].cache_control, {
    type: 'ephemeral',
    ttl: '1h',
  });
  assert.equal(verify.requests[0].custom_id, 'verify__a');
  const draft = JSON.parse(await readFile(join(paths.outDirectory, 'a.json'), 'utf8'));
  assert.equal(draft.contract, 'rich-v1');
  assert.equal(draft.review.by, 'assistant');
  assert.equal(draft.relations.length, 1);
  assert.equal(draft.relations[0].verified, true);
  assert.equal(draft.relations[0].targetQid, 'Q60025');
  assert.equal(draft.rejected[0].reason, 'tipo-fora-da-lista');
  assert.ok(
    existsSync(join(paths.responsesDirectory, 'extract', 'a.json')),
    'resposta crua guardada',
  );
  assert.equal(state.entities.a.extract.status, 'done');
  assert.equal(state.entities.a.verify.status, 'done');
  assert.ok(spent > 0);
  assert.ok(Math.abs(state.spend.usd - spent) < 1e-12);
  assert.ok(state.spend.byPhase.extract > 0 && state.spend.byPhase.verify > 0);
  const saved = JSON.parse(await readFile(paths.stateFile, 'utf8'));
  assert.ok(saved.batches.every((batch) => batch.status === 'ended'));
});

test('retomada: rodar de novo não reenvia o que está pronto nem paga duas vezes', async (t) => {
  const paths = await workspace(t);
  const records = [record('a'), record('b')];
  const client = fakeClient();
  const first = await runExtraction({ records, client, ...paths });
  const again = await runExtraction({ records, client, ...paths });
  assert.equal(client.calls.batches.length, 2, 'nenhum lote novo');
  assert.equal(again.spent, 0);
  assert.ok(Math.abs(again.state.spend.usd - first.state.spend.usd) < 1e-12);
  // Revisão nova do artigo: só ela é refeita.
  const newer = record('b');
  newer.article.revision = '2';
  await runExtraction({ records: [records[0], newer], client, ...paths });
  assert.equal(client.calls.batches.at(-2).requests.length, 1);
  assert.equal(client.calls.batches.at(-2).requests[0].custom_id, 'extract__b');
});

test('lote aberto é retomado, sem reenvio; resposta ainda não baixada não se perde', async (t) => {
  const paths = await workspace(t);
  const client = fakeClient();
  const first = await client.messages.batches.create({
    requests: [{ custom_id: 'extract__a', params: {} }],
  });
  const { writeJsonAtomic } = await import('./state.mjs');
  await writeJsonAtomic(
    paths.stateFile,
    withStateDefaults({
      batches: [
        {
          id: first.id,
          phase: 'extract',
          status: 'open',
          ids: ['extract__a'],
          model: 'claude-haiku-5-5',
        },
      ],
    }),
  );
  const { state } = await runExtraction({ records: [record('a')], client, ...paths });
  assert.equal(
    client.calls.batches.filter((b) => b.requests[0].custom_id === 'extract__a').length,
    1,
  );
  assert.equal(state.entities.a.extract.status, 'done');
});

test('envio interrompido antes de registrar o lote para e pede conferência, em vez de pagar de novo', async (t) => {
  const paths = await workspace(t);
  const { writeJsonAtomic } = await import('./state.mjs');
  await writeJsonAtomic(
    paths.stateFile,
    withStateDefaults({
      submitting: { phase: 'extract', at: '2026-11-04T00:00:00Z', ids: ['extract__a'] },
    }),
  );
  const client = fakeClient();
  await assert.rejects(runExtraction({ records: [record('a')], client, ...paths }), /interrompido/);
  assert.equal(client.calls.batches.length, 0);
});

test('falha fica no STATE e só volta com --retry-failed; quem não falhou segue', async (t) => {
  const paths = await workspace(t);
  const records = [record('a'), record('b')];
  const client = fakeClient({ failIds: ['extract__a'] });
  const { state } = await runExtraction({ records, client, ...paths });
  assert.equal(state.entities.a.extract.status, 'failed');
  assert.equal(state.entities.b.extract.status, 'done');
  const before = client.calls.batches.length;
  await runExtraction({ records, client, ...paths });
  assert.equal(client.calls.batches.length, before, 'sem retentativa automática');
  const healthy = fakeClient();
  const retried = await runExtraction({ records, client: healthy, ...paths, retryFailed: true });
  assert.equal(healthy.calls.batches[0].requests.length, 1);
  assert.equal(retried.state.entities.a.extract.status, 'done');
});

test('reaplicar travas: sem cliente, reaproveita veredito e só a relação nova volta à segunda passada', async (t) => {
  const paths = await workspace(t);
  const client = fakeClient();
  const records = [record('a')];
  await runExtraction({ records, client, ...paths });
  const path = join(paths.outDirectory, 'a.json');
  // Simula uma trava antiga mais rígida: a relação tinha caído antes da segunda passada.
  const raw = join(paths.responsesDirectory, 'extract', 'a.json');
  const message = JSON.parse(await readFile(raw, 'utf8'));
  const body = JSON.parse(message.content[0].text);
  body.relations.push({
    target: 'Karl Kautsky',
    nature: 'reagiu-contra',
    direction: 'alvo-para-entidade',
    sentence: 'Kautsky reagiu.',
    quote: 'Bernstein criticou Karl Kautsky por sua leitura',
  });
  message.content[0].text = JSON.stringify(body);
  await writeFile(raw, JSON.stringify(message));
  const before = JSON.parse(await readFile(paths.stateFile, 'utf8')).spend.usd;
  const totals = await reapplyGuards({ records, ...paths });
  assert.equal(totals.reused, 1);
  assert.equal(totals.pending, 1);
  const state = JSON.parse(await readFile(paths.stateFile, 'utf8'));
  assert.equal(state.spend.usd, before, 'não gasta');
  assert.equal(state.entities.a.verify, undefined);
  const draft = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(draft.relations.length, 2);
  assert.equal(draft.relations.filter((r) => r.verified).length, 1);
  // Rodar de novo não muda nada.
  const again = await reapplyGuards({ records, ...paths });
  assert.deepEqual(again, totals);
});

test('segunda passada paga só o que está pendente e mantém o que já foi confirmado', async (t) => {
  const paths = await workspace(t);
  const client = fakeClient();
  const records = [record('a')];
  await runExtraction({ records, client, ...paths });
  const path = join(paths.outDirectory, 'a.json');
  const draft = JSON.parse(await readFile(path, 'utf8'));
  draft.relations.push({
    ...draft.relations[0],
    nature: 'reagiu-contra',
    target: 'Outro',
    verified: false,
  });
  await writeFile(path, JSON.stringify(draft));
  const state = JSON.parse(await readFile(paths.stateFile, 'utf8'));
  delete state.entities.a.verify;
  await writeFile(paths.stateFile, JSON.stringify(state));
  await runExtraction({ records, client, ...paths });
  const request = client.calls.batches.at(-1).requests[0];
  assert.equal(request.custom_id, 'verify__a');
  assert.equal(
    JSON.parse(request.params.messages[0].content.match(/<relacoes>([\s\S]*)<\/relacoes>/)[1])
      .length,
    1,
  );
  const after = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(after.relations.length, 2);
  assert.ok(after.relations.every((r) => r.verified));
});

test('conferência do texto: só fica o item confirmado, e a etapa não paga duas vezes', async (t) => {
  const paths = await workspace(t);
  const longSentence = 'Bernstein nasceu em Berlim em 1850, filho de um maquinista ferroviário.';
  const withText = record('a');
  withText.article.sections[0].text = `${sentence}\n${longSentence}`;
  const body = {
    ...extraction,
    claims: [
      { statement: 'Nasceu em Berlim.', kind: 'fact', quote: 'nasceu em Berlim em 1850' },
      {
        statement: 'Era filho de um rei.',
        kind: 'fact',
        quote: 'filho de um maquinista ferroviário',
      },
    ],
  };
  const client = fakeClient({ textVerdicts: [{ index: 0, verdict: 'confirma', reason: 'ok' }] });
  const inner = client.messages.batches.results;
  client.messages.batches.results = async function* results(id) {
    for await (const item of await inner(id)) {
      if (item.custom_id.startsWith('extract__')) item.result.message = modelText(body);
      yield item;
    }
  };
  const records = [withText];
  const { state } = await runExtraction({ records, client, ...paths });
  const draft = JSON.parse(await readFile(join(paths.outDirectory, 'a.json'), 'utf8'));
  assert.deepEqual(
    draft.claims.map((c) => c.statement),
    ['Nasceu em Berlim.'],
  );
  assert.ok(draft.rejected.some((r) => r.reason === 'segunda-passada-texto:sem-veredito'));
  assert.equal(state.entities.a.verifytext.status, 'done');
  assert.ok(state.spend.byPhase.verifytext > 0);
  const count = client.calls.batches.length;
  await runExtraction({ records, client, ...paths });
  assert.equal(client.calls.batches.length, count, 'retomada não reenvia');
});

test('modo síncrono: teto vale a cada pedido e a segunda passada descarta o que não confirma', async (t) => {
  const paths = await workspace(t);
  const client = fakeClient({ verdict: 'nao-sustenta' });
  const { state } = await runExtraction({ records: [record('a')], client, ...paths, sync: true });
  assert.equal(client.calls.sync.length, 2);
  assert.equal(state.entities.a.verify.confirmed, 0);
  const draft = JSON.parse(await readFile(join(paths.outDirectory, 'a.json'), 'utf8'));
  assert.equal(draft.relations.length, 0);
  assert.ok(draft.rejected.some((r) => r.reason === 'segunda-passada:nao-sustenta'));
});
