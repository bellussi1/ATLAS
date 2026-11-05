#!/usr/bin/env node
/**
 * Avaliação do modelo na amostra de ~20 artigos: Haiku 5.5 `low` x `medium`, nas mesmas travas.
 *   npm run tradicao:eval -- run --from marxismo,liberalismo --sample 20 --dry-run
 *   npm run tradicao:eval -- run --from marxismo,liberalismo --sample 20 --max-usd 0.60
 *   npm run tradicao:eval -- reguard     # reaplica as travas às respostas pagas, sem API
 *   npm run tradicao:eval -- report      # métricas e lista para conferência humana
 *   npm run tradicao:eval -- score       # lê a conferência, aplica a regra e grava model-choice.json
 * Mede o que as travas rejeitam (citações e relações) e separa para a pessoa uma lista do que passou.
 * Regra: Haiku fica se o erro restante, depois das travas, ficar abaixo de 5%. Se o texto passar e as
 * relações não, só a etapa de relações sobe de modelo.
 */
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

import { BudgetExceeded, createBudget, formatUsd } from './cost.mjs';
import { loadRecords, planRun, reapplyGuards, renderPlan, runExtraction } from './extract.mjs';
import { passageFor } from './guards.mjs';
import { richSourceText } from './prompts.mjs';
import { projectRoot } from './registry.mjs';
import { modelChoiceSchema } from './rich.mjs';
import { loadStateFile, totalSpent, writeJsonAtomic } from './state.mjs';

export const haiku = 'claude-haiku-5-5';
export const relationUpgrade = 'claude-sonnet-5-5';
export const arms = [
  { name: 'haiku-low', model: haiku, effort: 'low' },
  { name: 'haiku-medium', model: haiku, effort: 'medium' },
];
export const maxResidualError = 0.05;
/** Menos conferências que isto não sustentam 5%: a regra responde "insuficiente". */
export const minChecked = 40;

const digest = (value) => createHash('sha256').update(value).digest('hex');

/**
 * Deterministic, stratified sample: round-robin over (type, language), each stratum in hash order, so
 * the same input gives the same list and no type or language dominates. The same QID enters once.
 */
export function sampleRecords(records, size, seed = 'atlas-avaliacao-1') {
  const seen = new Set();
  const strata = new Map();
  for (const record of [...records].sort((a, b) =>
    digest(`${seed}:${a.id}`).localeCompare(digest(`${seed}:${b.id}`)),
  )) {
    const qid = record.entity.qid ?? record.id;
    if (seen.has(qid)) continue;
    seen.add(qid);
    const key = `${record.entity.type}|${record.article.lang}`;
    strata.set(key, [...(strata.get(key) ?? []), record]);
  }
  const queues = [...strata.keys()].sort().map((key) => strata.get(key));
  const picked = [];
  while (picked.length < size && queues.some((queue) => queue.length))
    for (const queue of queues)
      if (queue.length && picked.length < size) picked.push(queue.shift());
  return picked.sort((a, b) => a.id.localeCompare(b.id, 'en'));
}

const rate = (part, whole) => (whole ? part / whole : 0);

/** What the guards did to one arm's drafts; every number comes from the drafts themselves. */
export function armMetrics(drafts, state) {
  const metrics = {
    drafts: drafts.length,
    quotes: 0,
    quotesRejected: 0,
    relationsProposed: 0,
    relationsRejectedByCode: 0,
    relationsRejectedBySecondPass: 0,
    relationsAccepted: 0,
    relationsPending: 0,
    relationsWithQid: 0,
    reasons: {},
    gaps: 0,
    costUsd: state?.spend?.usd ?? 0,
    outputTokens: state?.spend?.outputTokens ?? 0,
    failed: Object.values(state?.entities ?? {}).filter(
      (entity) => entity.extract?.status === 'failed' || entity.verify?.status === 'failed',
    ).length,
  };
  for (const draft of drafts) {
    metrics.quotes += draft.counts?.quotes ?? 0;
    metrics.relationsProposed += draft.counts?.relations ?? 0;
    const accepted = draft.relations.filter((relation) => relation.verified !== false);
    metrics.relationsAccepted += accepted.length;
    metrics.relationsPending += draft.relations.length - accepted.length;
    metrics.relationsWithQid += accepted.filter((relation) => relation.targetQid).length;
    if (!draft.oneLine || !draft.summary) metrics.gaps += 1;
    for (const item of draft.rejected ?? []) {
      metrics.reasons[item.reason] = (metrics.reasons[item.reason] ?? 0) + 1;
      if (item.reason.startsWith('segunda-passada:')) metrics.relationsRejectedBySecondPass += 1;
      else if (item.list === 'relations') metrics.relationsRejectedByCode += 1;
      if (item.reason.startsWith('citacao-')) metrics.quotesRejected += 1;
    }
  }
  return {
    ...metrics,
    quotesRejectedRate: rate(metrics.quotesRejected, metrics.quotes),
    relationsRejectedRate: rate(
      metrics.relationsRejectedByCode + metrics.relationsRejectedBySecondPass,
      metrics.relationsProposed,
    ),
    costPerArticle: rate(metrics.costUsd, metrics.drafts),
  };
}

/**
 * Items a person must check: every accepted relation and a fixed share of the text items of each
 * draft. `ok` starts empty on purpose: nothing here says a human looked at it until a human does.
 */
export function reviewItems(arm, drafts, textById, { textPerDraft = 2 } = {}) {
  const items = [];
  for (const draft of drafts) {
    const text = textById.get(draft.entity.id) ?? '';
    const base = {
      arm,
      entity: draft.entity.label,
      url: draft.source.url,
      ok: null,
      note: '',
    };
    // A relation waiting for the second pass is not ready for a person to check.
    for (const relation of draft.relations.filter((item) => item.verified !== false))
      items.push({
        ...base,
        kind: 'relation',
        statement:
          relation.direction === 'alvo-para-entidade'
            ? `${relation.target} ${relation.nature} ${draft.entity.label}`
            : `${draft.entity.label} ${relation.nature} ${relation.target}`,
        sentence: relation.sentence,
        quote: relation.quote,
        passage: passageFor(relation.quote, text),
      });
    const textual = [
      ...(draft.sections ?? []).map((item) => ({ statement: item.text, quote: item.quote })),
      ...(draft.claims ?? []).map((item) => ({ statement: item.statement, quote: item.quote })),
      ...(draft.dates ?? []).map((item) => ({
        statement: `${item.date}: ${item.event}`,
        quote: item.quote,
      })),
    ].sort((a, b) => digest(a.quote).localeCompare(digest(b.quote)));
    for (const item of textual.slice(0, textPerDraft))
      items.push({ ...base, kind: 'text', ...item, passage: passageFor(item.quote, text) });
  }
  return items;
}

export function renderReview(items) {
  const lines = [
    '# Conferência humana da avaliação',
    '',
    'Marque `ok` em `revisao.json` (true: o trecho sustenta exatamente o item, com o sentido certo; false: não). Item sem marca não conta.',
    '',
  ];
  for (const [index, item] of items.entries()) {
    lines.push(
      `## ${index + 1}. ${item.arm} · ${item.kind} · ${item.entity}`,
      '',
      `- Item: ${item.statement}`,
      ...(item.sentence ? [`- Frase: ${item.sentence}`] : []),
      `- Citação: "${item.quote}"`,
      `- Parágrafo: ${item.passage}`,
      `- Fonte: ${item.url}`,
      '',
    );
  }
  return `${lines.join('\n')}\n`;
}

/** Share of checked items a person marked wrong, by kind, for one arm. */
export function residualErrors(items, arm) {
  const summary = {};
  for (const kind of ['relation', 'text']) {
    const checked = items.filter(
      (item) => item.arm === arm && item.kind === kind && typeof item.ok === 'boolean',
    );
    const wrong = checked.filter((item) => item.ok === false).length;
    summary[kind] = { checked: checked.length, wrong, error: rate(wrong, checked.length) };
  }
  summary.overall = {
    checked: summary.relation.checked + summary.text.checked,
    wrong: summary.relation.wrong + summary.text.wrong,
    error: rate(
      summary.relation.wrong + summary.text.wrong,
      summary.relation.checked + summary.text.checked,
    ),
  };
  return summary;
}

/**
 * The decision rule. Cheapest arm first. Both kinds under 5%: Haiku stays at that effort. Text under
 * 5% with relations above: extraction stays on Haiku and only the relations step moves up. Neither,
 * or too few checks: no model choice is written, because the data does not support one.
 */
export function decideModel(byArm, { limit = maxResidualError, minimum = minChecked } = {}) {
  const usable = arms.filter((arm) => byArm[arm.name]?.overall.checked >= minimum);
  if (usable.length < arms.length)
    return {
      outcome: 'insuficiente',
      rationale: `Cada braço precisa de ao menos ${minimum} itens conferidos.`,
    };
  const good = (kind) => (arm) => byArm[arm.name][kind].error < limit;
  const both = usable.find((arm) => good('relation')(arm) && good('text')(arm));
  if (both)
    return {
      outcome: 'haiku-fica',
      chosen: { extracao: { model: both.model, effort: both.effort } },
      rationale: `Erro restante abaixo de ${limit * 100}% em ${both.name}, o braço mais barato que passou.`,
    };
  const textOnly = usable.find(good('text'));
  if (textOnly)
    return {
      outcome: 'so-relacoes-sobe',
      chosen: {
        extracao: { model: textOnly.model, effort: textOnly.effort },
        relacoes: { model: relationUpgrade, effort: 'low' },
      },
      rationale: `Texto abaixo de ${limit * 100}% em ${textOnly.name}, relações acima nos dois braços: só a etapa de relações sobe de modelo.`,
    };
  return {
    outcome: 'revisar-prompt',
    rationale: `Texto acima de ${limit * 100}% nos dois braços: trocar o modelo das relações não resolve. Revise prompt e travas.`,
  };
}

export const evalDirectory = (root, id) => join(root, 'generated/eval', id);
const armPaths = (directory, arm) => ({
  stateFile: join(directory, arm.name, 'STATE.json'),
  outDirectory: join(directory, arm.name, 'extracts'),
  responsesDirectory: join(directory, arm.name, 'responses'),
});

async function readSample(directory) {
  const sample = JSON.parse(await readFile(join(directory, 'amostra.json'), 'utf8'));
  return sample;
}

async function recordsFrom(root, traditions) {
  const groups = await Promise.all(
    traditions.map((slug) => loadRecords(join(root, 'generated/wiki-extract', slug, 'articles'))),
  );
  return groups.flat();
}

/** Plans both arms; aborts before the first request when the joint worst case does not fit. */
export async function runEval({
  root = projectRoot,
  id = 'amostra-20',
  from,
  size = 20,
  client,
  dryRun = false,
  maxUsd = 1,
  maxTotalUsd = 10,
  pollMs,
  log = console.log,
}) {
  const directory = evalDirectory(root, id);
  const records = sampleRecords(await recordsFrom(root, from), size);
  if (!records.length) throw new Error(`Sem artigos locais em: ${from.join(', ')}`);
  const plans = [];
  for (const arm of arms) {
    const state = await loadStateFile(armPaths(directory, arm).stateFile);
    plans.push({ arm, plan: planRun({ records, state, model: arm.model, effort: arm.effort }) });
  }
  const worst = plans.reduce((sum, { plan }) => sum + plan.worstCaseUsd, 0);
  const expected = plans.reduce(
    (sum, { plan }) => sum + plan.extract.expectedUsd + plan.verify.expectedUsd,
    0,
  );
  log(`Amostra de ${records.length} artigos (${from.join(', ')}):`);
  for (const record of records)
    log(`  ${record.id} [${record.entity.type}, ${record.article.lang}]`);
  for (const { arm, plan } of plans) {
    log(`${arm.name}:`);
    log(renderPlan(plan, { model: arm.model, effort: arm.effort }));
  }
  log(`Duas configurações: esperado ${formatUsd(expected)}, pior caso ${formatUsd(worst)}.`);
  const spent = await totalSpent(root);
  createBudget({ maxUsd, maxTotalUsd, spentBefore: spent }).reserve(worst, 'avaliação');
  if (dryRun) {
    log('[dry-run] nenhuma chamada à API.');
    return { dryRun: true, expected, worst, records };
  }
  await mkdir(directory, { recursive: true });
  await writeJsonAtomic(join(directory, 'amostra.json'), {
    from,
    size,
    ids: records.map((record) => record.id),
    articles: records.map((record) => ({ id: record.id, entity: record.entity })),
  });
  for (const arm of arms) {
    const paths = armPaths(directory, arm);
    await runExtraction({
      records,
      client,
      ...paths,
      model: arm.model,
      effort: arm.effort,
      maxUsd,
      maxTotalUsd,
      spentBefore: await totalSpent(root),
      loadStateFile: () => loadStateFile(paths.stateFile),
      log,
      ...(pollMs === undefined ? {} : { pollMs }),
    });
  }
  return { dryRun: false, expected, worst, records };
}

/** Current guards over the responses of every arm, with no client: this cannot spend. */
export async function reguardEval({ root = projectRoot, id = 'amostra-20', log = console.log }) {
  const directory = evalDirectory(root, id);
  const sample = await readSample(directory);
  const wanted = new Set(sample.ids);
  const records = (await recordsFrom(root, sample.from)).filter((record) => wanted.has(record.id));
  const totals = {};
  for (const arm of arms) {
    const paths = armPaths(directory, arm);
    log(`${arm.name}:`);
    totals[arm.name] = await reapplyGuards({
      records,
      ...paths,
      loadStateFile: () => loadStateFile(paths.stateFile),
      log,
    });
  }
  return totals;
}

const markKey = (item) => [item.arm, item.kind, item.statement, item.quote].join('|');

/** Writes metrics and the review list. Marks a person already made are kept across runs. */
export async function buildReport({ root = projectRoot, id = 'amostra-20', from }) {
  const directory = evalDirectory(root, id);
  const sample = await readSample(directory);
  const all = await recordsFrom(root, from ?? sample.from);
  const textById = new Map(
    all
      .filter((record) => sample.ids.includes(record.id))
      .map((record) => [record.entity.id, richSourceText(record.article).text]),
  );
  const metrics = {};
  const items = [];
  for (const arm of arms) {
    const paths = armPaths(directory, arm);
    const drafts = [];
    for (const name of (await readdir(paths.outDirectory).catch(() => [])).sort())
      drafts.push(JSON.parse(await readFile(join(paths.outDirectory, name), 'utf8')));
    metrics[arm.name] = armMetrics(drafts, await loadStateFile(paths.stateFile));
    items.push(...reviewItems(arm.name, drafts, textById));
  }
  const reviewPath = join(directory, 'revisao.json');
  const previous = await readFile(reviewPath, 'utf8')
    .then((text) => new Map(JSON.parse(text).map((item) => [markKey(item), item])))
    .catch((error) => {
      // A broken file holds a person's marks: stop, never overwrite it with an empty list.
      if (error.code === 'ENOENT') return new Map();
      throw new Error(`revisao.json inválido, nada foi gravado: ${error.message}`);
    });
  const merged = items.map((item) => {
    const old = previous.get(markKey(item));
    return old ? { ...item, ok: old.ok, note: old.note } : item;
  });
  await writeJsonAtomic(reviewPath, merged);
  await writeFile(join(directory, 'revisao.md'), renderReview(merged));
  await writeJsonAtomic(join(directory, 'metricas.json'), metrics);
  return { metrics, items: merged, directory };
}

export async function scoreEval({
  root = projectRoot,
  id = 'amostra-20',
  minimum = minChecked,
  today = new Date().toISOString().slice(0, 10),
}) {
  const directory = evalDirectory(root, id);
  const items = JSON.parse(await readFile(join(directory, 'revisao.json'), 'utf8'));
  const metrics = JSON.parse(await readFile(join(directory, 'metricas.json'), 'utf8'));
  const byArm = Object.fromEntries(arms.map((arm) => [arm.name, residualErrors(items, arm.name)]));
  const decision = decideModel(byArm, { minimum });
  await writeJsonAtomic(join(directory, 'decisao.json'), { byArm, ...decision });
  if (!decision.chosen) return { byArm, decision, wrote: false };
  const sample = await readSample(directory);
  const choice = modelChoiceSchema.parse({
    measuredAt: today,
    sample: { size: sample.ids.length, entityIds: sample.ids },
    candidates: arms.map((arm) => ({
      model: arm.model,
      effort: arm.effort,
      residualError: byArm[arm.name].overall.error,
      quotesRejected: metrics[arm.name].quotesRejectedRate,
      relationsRejected: metrics[arm.name].relationsRejectedRate,
      costUsd: metrics[arm.name].costUsd,
    })),
    chosen: decision.chosen,
    rationale: decision.rationale,
  });
  await writeJsonAtomic(join(root, 'scripts/tradicao/model-choice.json'), choice);
  return { byArm, decision, wrote: true };
}

const percent = (value) => `${(value * 100).toFixed(1)}%`;

export function renderMetrics(metrics) {
  return Object.entries(metrics)
    .map(
      ([arm, m]) =>
        `${arm}: ${m.drafts} rascunhos; citações rejeitadas ${m.quotesRejected}/${m.quotes} (${percent(m.quotesRejectedRate)}); relações propostas ${m.relationsProposed}, rejeitadas por código ${m.relationsRejectedByCode}, pela segunda passada ${m.relationsRejectedBySecondPass} (${percent(m.relationsRejectedRate)}), aceitas ${m.relationsAccepted} (${m.relationsWithQid} com QID), à espera da segunda passada ${m.relationsPending}; custo ${formatUsd(m.costUsd)}; falhas ${m.failed}; motivos ${JSON.stringify(m.reasons)}`,
    )
    .join('\n');
}

export async function main(argv = process.argv.slice(2)) {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      from: { type: 'string' },
      sample: { type: 'string', default: '20' },
      id: { type: 'string', default: 'amostra-20' },
      'dry-run': { type: 'boolean', default: false },
      'max-usd': { type: 'string', default: '1' },
      'max-total-usd': { type: 'string', default: '10' },
    },
  });
  const [command] = positionals;
  const { id } = values;
  if (command === 'run') {
    if (!values.from) throw new Error('Informe --from <tradição,tradição>.');
    const dryRun = values['dry-run'];
    if (!dryRun && !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN)
      throw new Error('Defina ANTHROPIC_API_KEY no ambiente antes de avaliar.');
    const client = dryRun ? null : new (await import('@anthropic-ai/sdk')).default();
    await runEval({
      id,
      from: values.from.split(','),
      size: Number(values.sample),
      client,
      dryRun,
      maxUsd: Number(values['max-usd']),
      maxTotalUsd: Number(values['max-total-usd']),
    });
    return 0;
  }
  if (command === 'reguard') {
    await reguardEval({ id });
    return 0;
  }
  if (command === 'report') {
    const { metrics, items, directory } = await buildReport({ id });
    console.log(renderMetrics(metrics));
    console.log(`${items.length} itens para conferência em ${join(directory, 'revisao.md')}`);
    return 0;
  }
  if (command === 'score') {
    const { byArm, decision, wrote } = await scoreEval({ id });
    console.log(JSON.stringify(byArm, null, 1));
    console.log(`Decisão: ${decision.outcome}. ${decision.rationale}`);
    console.log(wrote ? 'Gravado em scripts/tradicao/model-choice.json.' : 'Nenhum modelo fixado.');
    return 0;
  }
  throw new Error(
    'Uso: tradicao:eval <run|reguard|report|score> [--from a,b] [--sample N] [--dry-run] [--max-usd N]',
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = error instanceof BudgetExceeded ? 3 : 1;
  }
}
