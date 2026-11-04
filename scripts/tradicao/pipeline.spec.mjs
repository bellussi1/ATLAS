import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { planStage, runStage } from './pipeline.mjs';
import { hashPaths, loadState, statePath } from './state.mjs';
import { estimateExtractionCost, registrationGaps, registrationPoints, stages } from './stages.mjs';

async function project(t) {
  const root = await mkdtemp(join(tmpdir(), 'atlas-tradicao-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

/** Two fake stages: `a` writes a file from `in.txt`; `b` needs `a`'s output. */
function fakeStages(root) {
  const file = (name) => join(root, name);
  const exists = (name) => existsSync(file(name));
  const a = {
    n: 1,
    id: 'a',
    title: 'A',
    kind: 'auto',
    cost: 'grátis',
    inputs: () => [file('in.txt')],
    outputs: () => [file('a.out')],
    commands: () => [
      {
        label: 'gera a.out',
        argv: [
          process.execPath,
          '-e',
          "require('fs').appendFileSync('runs.log','a\\n');require('fs').copyFileSync('in.txt','a.out')",
        ],
      },
    ],
    gate: async () => [{ name: 'a.out existe', ok: exists('a.out'), detail: '' }],
  };
  const b = {
    n: 2,
    id: 'b',
    title: 'B',
    kind: 'auto',
    cost: 'grátis',
    inputs: () => [file('a.out')],
    outputs: () => [file('b.out')],
    commands: () => [
      {
        label: 'gera b.out',
        argv: [process.execPath, '-e', "require('fs').copyFileSync('a.out','b.out')"],
      },
    ],
    gate: async () => [{ name: 'b.out existe', ok: exists('b.out'), detail: '' }],
  };
  return { a, b };
}

test('hashPaths muda com o conteúdo e não depende de onde o projeto está', async (t) => {
  const one = await project(t);
  const two = await project(t);
  for (const root of [one, two]) {
    await mkdir(join(root, 'dir'));
    await writeFile(join(root, 'dir/x.json'), '{"a":1}');
  }
  const hashOf = (root) => hashPaths(root, [join(root, 'dir'), join(root, 'ausente.json')]);
  assert.equal(await hashOf(one), await hashOf(two));
  await writeFile(join(two, 'dir/x.json'), '{"a":2}');
  assert.notEqual(await hashOf(one), await hashOf(two));
});

test('dry-run mostra o plano sem executar comando nem gravar estado', async (t) => {
  const root = await project(t);
  await writeFile(join(root, 'in.txt'), 'um');
  const { a } = fakeStages(root);
  const ctx = { slug: 'x', root };
  const plan = await planStage(a, ctx, await loadState(root, 'x'));
  assert.equal(plan.gateOpen, false);
  assert.equal(plan.wouldRun, true);
  assert.deepEqual(plan.commands[0].argv.slice(0, 1), [process.execPath]);
  assert.equal(existsSync(join(root, 'a.out')), false);
  assert.equal(existsSync(statePath(root, 'x')), false);
});

test('retoma sem refazer: executa, pula com entradas iguais e refaz quando mudam', async (t) => {
  const root = await project(t);
  await writeFile(join(root, 'in.txt'), 'um');
  const { a } = fakeStages(root);
  const ctx = { slug: 'x', root };
  const run = async () => runStage(a, ctx, await loadState(root, 'x'), { previous: null });
  const runs = async () => (await readFile(join(root, 'runs.log'), 'utf8')).split('\n').length - 1;

  assert.equal((await run()).status, 'passed');
  assert.equal(await runs(), 1);
  const second = await run();
  assert.equal(second.status, 'passed');
  assert.match(second.note, /pulado/);
  assert.equal(await runs(), 1);

  await writeFile(join(root, 'in.txt'), 'dois');
  assert.equal((await run()).status, 'passed');
  assert.equal(await runs(), 2);
  assert.equal(await readFile(join(root, 'a.out'), 'utf8'), 'dois');

  const state = await loadState(root, 'x');
  assert.equal(state.stages[1].status, 'passed');
  assert.match(state.stages[1].inputsHash, /^[0-9a-f]{16}$/);
});

test('adota uma porta que já fecha sem executar comando', async (t) => {
  const root = await project(t);
  await writeFile(join(root, 'in.txt'), 'um');
  await writeFile(join(root, 'a.out'), 'um');
  const { a } = fakeStages(root);
  const result = await runStage(a, { slug: 'x', root }, await loadState(root, 'x'), {
    previous: null,
  });
  assert.equal(result.status, 'passed');
  assert.match(result.note, /adotado/);
  assert.equal(existsSync(join(root, 'runs.log')), false);
});

test('não entra num estágio com a porta do anterior aberta', async (t) => {
  const root = await project(t);
  await writeFile(join(root, 'in.txt'), 'um');
  const { a, b } = fakeStages(root);
  const result = await runStage(b, { slug: 'x', root }, await loadState(root, 'x'), {
    previous: a,
  });
  assert.equal(result.status, 'blocked');
  assert.equal(existsSync(join(root, 'b.out')), false);
  assert.equal(existsSync(statePath(root, 'x')), false);
});

test('a falha de um comando fecha o estágio como falho', async (t) => {
  const root = await project(t);
  await writeFile(join(root, 'in.txt'), 'um');
  const { a } = fakeStages(root);
  a.commands = () => [{ label: 'quebra', argv: [process.execPath, '-e', 'process.exit(3)'] }];
  const result = await runStage(a, { slug: 'x', root }, await loadState(root, 'x'), {
    previous: null,
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.commands[0].exitCode, 3);
});

test('estágio de API sem chave não executa e informa', async (t) => {
  const root = await project(t);
  await writeFile(join(root, 'in.txt'), 'um');
  const { a } = fakeStages(root);
  a.commands = () => [{ label: 'extrair', argv: [process.execPath, '-e', ''], api: true }];
  const saved = [process.env.ANTHROPIC_API_KEY, process.env.ANTHROPIC_AUTH_TOKEN];
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_AUTH_TOKEN;
  t.after(() => {
    if (saved[0]) process.env.ANTHROPIC_API_KEY = saved[0];
    if (saved[1]) process.env.ANTHROPIC_AUTH_TOKEN = saved[1];
  });
  const result = await runStage(a, { slug: 'x', root }, await loadState(root, 'x'), {
    previous: null,
  });
  assert.equal(result.status, 'failed');
  assert.match(result.commands[0].skipped, /ANTHROPIC_API_KEY/);
});

test('os estágios cobrem 0 a 12 em ordem e nenhum comando publica ou envia', () => {
  assert.deepEqual(
    stages.map((stage) => stage.n),
    Array.from({ length: 15 }, (_, i) => i),
  );
  const ctx = { slug: 'x', root: '/tmp', full: true };
  for (const stage of stages) {
    assert.ok(stage.contract?.needs && stage.contract?.produces, `estágio ${stage.n} sem contrato`);
    for (const command of stage.commands(ctx))
      assert.ok(
        !/publish|push/.test(command.argv.join(' ')),
        `estágio ${stage.n} executa ${command.argv.join(' ')}`,
      );
  }
  assert.equal(stages[14].kind, 'human');
  assert.equal(stages[14].commands(ctx).length, 0);
});

test('o custo estimado usa o preço do Haiku 5.5 em lote e o teto de entrada', () => {
  const small = estimateExtractionCost({ articleChars: [35_000] });
  assert.equal(small.articles, 1);
  assert.equal(small.inputTokens, 10_400);
  assert.equal(small.outputTokens, 2500);
  // (10.400 × 0,10 + 2.500 × 0,50) / 1e6 × 0,5
  assert.ok(Math.abs(small.usd - 0.001145) < 1e-9);
  const capped = estimateExtractionCost({ articleChars: [500_000] });
  assert.equal(capped.inputTokens, estimateExtractionCost({ articleChars: [60_000] }).inputTokens);
});

test('lacunas de registro: aponta cada ponto da aplicação que ainda não lista a leitura', async (t) => {
  const root = await project(t);
  const points = registrationPoints('nova');
  assert.equal(points.length, 6);
  assert.deepEqual((await registrationGaps(root, 'nova')).length, 6);
  for (const [file, needle] of points.slice(0, 2)) {
    await mkdir(join(root, file, '..'), { recursive: true });
    await writeFile(join(root, file), `// ${needle}`);
  }
  assert.equal((await registrationGaps(root, 'nova')).length, 4);
});

test('o trabalho em processo roda uma vez por execução e não depois de comando que falhou', async (t) => {
  const root = await project(t);
  await writeFile(join(root, 'in.txt'), 'um');
  const ctx = { slug: 'x', root };
  const { a } = fakeStages(root);
  let runs = 0;
  a.commands = () => [];
  a.run = async () => {
    runs += 1;
    await writeFile(join(root, 'a.out'), 'feito');
  };
  const first = await runStage(a, ctx, await loadState(root, 'x'), { previous: null });
  assert.equal(first.status, 'passed');
  assert.equal(runs, 1);

  const failing = fakeStages(root).a;
  failing.commands = () => [{ label: 'quebra', argv: [process.execPath, '-e', 'process.exit(1)'] }];
  let after = 0;
  failing.run = async () => {
    after += 1;
  };
  await rm(join(root, 'a.out'));
  await runStage(failing, ctx, await loadState(root, 'x'), { previous: null });
  assert.equal(after, 0);
});
