#!/usr/bin/env node
/**
 * Orquestrador do pipeline de tradições.
 *
 *   npm run tradicao -- <slug> --stage N [--dry-run] [--force] [--full]
 *   npm run tradicao -- <slug> --all [--from N] [--to M] [--dry-run]
 *   npm run tradicao -- <slug> --status
 *
 * Regras: a porta de saída do estágio anterior é a porta de entrada do seguinte; um estágio cuja
 * porta já fecha e cujas entradas não mudaram desde a última passagem é pulado; `--dry-run` não
 * executa comando algum nem grava estado, só mostra o plano e o resultado atual das portas.
 * O orquestrador nunca publica no R2 e nunca faz push.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { hashPaths, loadState, statePath, writeJsonAtomic } from './state.mjs';
import { stageByNumber, stages } from './stages.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const passed = (checks) => checks.every((c) => c.ok);

async function evaluateGate(stage, ctx) {
  try {
    return await stage.gate(ctx);
  } catch (error) {
    return [
      { name: 'porta avaliada sem erro', ok: false, detail: String(error.message).split('\n')[0] },
    ];
  }
}

/** Plan of one stage without side effects: hashes, freshness, current gate, commands. */
export async function planStage(stage, ctx, state) {
  const inputsHash = await hashPaths(ctx.root, stage.inputs(ctx));
  const prior = state.stages[stage.n];
  const checks = await evaluateGate(stage, ctx);
  const gateOpen = passed(checks);
  const unchanged = prior?.status === 'passed' && prior.inputsHash === inputsHash;
  const standing = gateOpen
    ? unchanged
      ? 'fresco'
      : prior
        ? 'entradas mudaram'
        : 'porta já fechada, sem execução registrada'
    : 'porta aberta';
  return {
    n: stage.n,
    id: stage.id,
    title: stage.title,
    kind: stage.kind,
    cost: stage.cost,
    inputsHash,
    standing,
    gateOpen,
    checks,
    commands: stage
      .commands(ctx)
      .map((c) => ({ label: c.label, argv: c.argv, network: !!c.network, api: !!c.api })),
    agent: stage.agent ?? null,
    inProcess: Boolean(stage.run),
    manual: stage.manual ?? null,
    estimate: stage.estimate ? await stage.estimate(ctx).catch(() => null) : null,
    wouldRun: !gateOpen || (prior && !unchanged),
  };
}

function runCommands(commands, ctx) {
  const results = [];
  for (const command of commands) {
    if (command.api && !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
      results.push({ label: command.label, exitCode: null, skipped: 'ANTHROPIC_API_KEY ausente' });
      break;
    }
    const started = Date.now();
    const [bin, ...args] = command.argv;
    // `node` runs through the current executable; only `npm` needs a shell (a .cmd on Windows).
    // Arguments are fixed strings built from a validated slug, never user free text.
    const done =
      bin === 'npm'
        ? spawnSync(`npm ${args.join(' ')}`, { cwd: ctx.root, stdio: 'inherit', shell: true })
        : spawnSync(bin === 'node' ? process.execPath : bin, args, {
            cwd: ctx.root,
            stdio: 'inherit',
          });
    results.push({ label: command.label, exitCode: done.status, durationMs: Date.now() - started });
    if (done.status !== 0) break;
  }
  return results;
}

/**
 * Runs one stage for real. Never runs when the previous gate is closed (unless `force`), adopts a
 * gate that is already open without re-executing, and records the outcome in state.json.
 */
export async function runStage(
  stage,
  ctx,
  state,
  { force = false, previous = stage.n > 0 ? stageByNumber(stage.n - 1) : null } = {},
) {
  const started = Date.now();
  if (previous && !force) {
    const upstream = await evaluateGate(previous, ctx);
    if (!passed(upstream))
      return {
        n: stage.n,
        status: 'blocked',
        reason: `porta do estágio ${previous.n} (${previous.id}) aberta`,
        checks: upstream.filter((c) => !c.ok),
      };
  }
  const plan = await planStage(stage, ctx, state);
  let commands = [];
  let note = null;
  if (force || plan.wouldRun) {
    if (stage.kind !== 'auto' || !stage.commands(ctx).length) {
      if (stage.run) await stage.run(ctx);
      else
        note = stage.agent
          ? `estágio de agente (${stage.agent.model}, effort ${stage.agent.effort}): ${stage.agent.does}`
          : 'estágio humano: nada a executar';
    } else {
      commands = runCommands(stage.commands(ctx), ctx);
    }
    if (stage.run && stage.kind === 'auto') await stage.run(ctx);
  } else {
    note =
      plan.standing === 'fresco'
        ? 'pulado: entradas inalteradas'
        : 'adotado: porta já fechava sem execução';
  }
  const checks = await evaluateGate(stage, ctx);
  const ok = passed(checks);
  const entry = {
    status: ok ? 'passed' : 'failed',
    inputsHash: await hashPaths(ctx.root, stage.inputs(ctx)),
    outputsHash: await hashPaths(ctx.root, stage.outputs(ctx)),
    ranAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    commands,
    note,
    checks,
    ...(plan.estimate ? { estimatedCostUsd: plan.estimate.usd } : {}),
  };
  state.stages[stage.n] = entry;
  await writeJsonAtomic(statePath(ctx.root, ctx.slug), state);
  return { n: stage.n, status: entry.status, note, commands, checks, durationMs: entry.durationMs };
}

const mark = (ok) => (ok ? '✔' : '✘');

export function formatPlan(plan) {
  const lines = [`[${plan.n}] ${plan.title} · ${plan.kind} · ${plan.cost}`];
  lines.push(`    estado: ${plan.standing} · entradas ${plan.inputsHash}`);
  for (const check of plan.checks)
    lines.push(`    ${mark(check.ok)} ${check.name}${check.detail ? ` — ${check.detail}` : ''}`);
  if (plan.estimate)
    lines.push(
      `    custo estimado: US$ ${plan.estimate.usd.toFixed(3)} (${plan.estimate.articles} artigos, ${plan.estimate.inputTokens} tokens de entrada, ${plan.estimate.outputTokens} de saída; ${plan.estimate.basis})`,
    );
  if (plan.wouldRun) {
    if (plan.agent)
      lines.push(
        `    executaria: agente ${plan.agent.model} (effort ${plan.agent.effort}) com o skill ${plan.agent.skill}: ${plan.agent.does}`,
      );
    for (const c of plan.commands)
      lines.push(
        `    executaria: ${c.argv.join(' ')}${c.api ? '  [API]' : c.network ? '  [rede]' : ''}`,
      );
    if (!plan.agent && !plan.commands.length)
      lines.push('    executaria: nada (em processo ou ação humana)');
  }
  return lines.join('\n');
}

export async function main(argv = process.argv.slice(2)) {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      stage: { type: 'string' },
      all: { type: 'boolean', default: false },
      from: { type: 'string' },
      to: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
      full: { type: 'boolean', default: false },
      status: { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
    },
  });
  const [slug] = positionals;
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug ?? ''))
    throw new Error(
      'Uso: npm run tradicao -- <slug> (--stage N | --all [--from N] [--to M] | --status) [--dry-run] [--force] [--full]',
    );
  const ctx = { slug, root: projectRoot, full: values.full };
  const state = await loadState(ctx.root, slug);

  let selected;
  if (values.stage !== undefined) {
    const stage = stageByNumber(Number(values.stage));
    if (!stage)
      throw new Error(`Estágio inexistente: ${values.stage}. Use 0 a ${stages.length - 1}.`);
    selected = [stage];
  } else if (values.all || values.status) {
    const from = Number(values.from ?? 0);
    const to = Number(values.to ?? stages.length - 1);
    selected = stages.filter((stage) => stage.n >= from && stage.n <= to);
  } else throw new Error('Informe --stage N, --all ou --status.');

  const dry = values['dry-run'] || values.status;
  const output = [];
  let exitCode = 0;
  for (const stage of selected) {
    if (dry) {
      const plan = await planStage(stage, ctx, state);
      output.push(plan);
      if (!values.json) console.log(formatPlan(plan));
      if (!plan.gateOpen && values.all) {
        if (!values.json)
          console.log(
            `\nParou no estágio ${stage.n}: a porta está aberta; os seguintes dependem dela.`,
          );
        break;
      }
    } else {
      const result = await runStage(stage, ctx, state, { force: values.force });
      output.push(result);
      if (!values.json) {
        console.log(
          `[${stage.n}] ${stage.title}: ${result.status}${result.note ? ` (${result.note})` : ''}`,
        );
        for (const check of result.checks)
          console.log(
            `    ${mark(check.ok)} ${check.name}${check.detail ? ` — ${check.detail}` : ''}`,
          );
        for (const command of result.commands ?? [])
          if (command.skipped) console.log(`    ! ${command.label}: ${command.skipped}`);
      }
      if (result.status !== 'passed') {
        exitCode = result.status === 'blocked' ? 2 : 1;
        break;
      }
    }
  }
  if (values.json) console.log(JSON.stringify(output, null, 2));
  process.exitCode = exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
