#!/usr/bin/env node
/**
 * Extrator rico em duas passadas, com custo sob controle:
 *   npm run tradicao:extract -- <slug> --dry-run
 *   npm run tradicao:extract -- <slug> --max-usd 0.50 [--limit N] [--only a,b] [--effort low]
 * Primeira passada: linha, resumo, seções, glossário, datas, afirmações e relações. Segunda: confere
 * cada relação que passou pelas travas de código contra o parágrafo de origem.
 *
 * Lote por padrão (50%). Antes de enviar, soma o pior caso (todo `max_tokens`, toda escrita de cache)
 * e aborta se não couber no teto: lote enviado não para no meio, então o teto vem antes. Retoma de
 * onde parou: lote aberto é reaproveitado, resposta paga é gravada crua antes de qualquer análise e
 * nunca é pedida de novo. Progresso e razão de gasto ficam só no STATE.json.
 */
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

import {
  assumedOutputTokens,
  BudgetExceeded,
  costOfUsage,
  createBudget,
  estimateRun,
  formatUsd,
} from './cost.mjs';
import {
  applyTextVerdicts,
  applyVerdicts,
  contractGaps,
  guardExtraction,
  relationKey,
} from './guards.mjs';
import {
  defaultModel,
  maxOutputTokens,
  maxTextItems,
  messageJson,
  promptHash,
  richParams,
  richSourceText,
  richSystem,
  textItems,
  verifyParams,
  verifySystem,
  verifyTextParams,
  verifyTextSystem,
} from './prompts.mjs';
import { projectRoot } from './registry.mjs';
import { richContract } from './rich.mjs';
import { loadState, statePath, totalSpent, writeJsonAtomic } from './state.mjs';

/**
 * Id of a request in a batch. The API accepts only letters, digits, `_` and `-`, up to 64
 * characters; an entity id that does not fit is replaced by its hash.
 */
export function customIdFor(phase, id) {
  const plain = `${phase}__${id}`;
  if (/^[a-zA-Z0-9_-]{1,64}$/.test(plain)) return plain;
  return `${phase}__${createHash('sha256').update(id).digest('hex').slice(0, 32)}`;
}

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const stepOf = (state, id, phase) => state.entities[id]?.[phase] ?? null;

function setStep(state, id, phase, value) {
  state.entities[id] ??= {};
  state.entities[id][phase] = { ...value, at: new Date().toISOString() };
}

/** Local articles of a work directory, as `{ id, entity, article, retrievedAt }`. */
export async function loadRecords(articlesDirectory) {
  const names = (await readdir(articlesDirectory).catch(() => [])).filter((n) =>
    n.endsWith('.json'),
  );
  const records = [];
  for (const name of names.sort()) {
    const record = await readJson(join(articlesDirectory, name));
    records.push({ id: name.slice(0, -5), ...record });
  }
  return records;
}

/** A step counts as done only for the same article revision and prompt; failures wait for a retry. */
function isDone(step, record) {
  return (
    step?.status === 'done' &&
    step.revision === record.article.revision &&
    step.prompt === promptHash
  );
}

/** The text pass has its own prompt, so it can change without redoing the extraction. */
const textPrompt = createHash('sha256').update(verifyTextSystem).digest('hex').slice(0, 12);
const isTextDone = (step, record) =>
  step?.status === 'done' &&
  step.revision === record.article.revision &&
  step.prompt === textPrompt;

/** Everything one run needs to know, computed without sending anything. */
export function planRun({
  records,
  state,
  model,
  relationModel,
  effort,
  relationEffort = effort,
  retryFailed,
}) {
  const prepared = records.map((record) => ({
    ...record,
    source: richSourceText(record.article),
  }));
  const open = new Set(state.batches.filter((b) => b.status === 'open').flatMap((b) => b.ids));
  const toExtract = prepared.filter((record) => {
    const step = stepOf(state, record.id, 'extract');
    if (isDone(step, record) || open.has(customIdFor('extract', record.id))) return false;
    return step?.status !== 'failed' || retryFailed;
  });
  const costShape = (fixed, variable, phase, level = effort) => ({
    fixedChars: fixed,
    variableChars: variable,
    maxOutputTokens: maxOutputTokens[phase],
    expectedOutputTokens: assumedOutputTokens[phase][level] ?? assumedOutputTokens[phase].medium,
  });
  const extract = estimateRun(
    toExtract.map((r) => costShape(richSystem.length, r.source.text.length + 300, 'extract')),
    { model },
  );
  // Second pass: 12 relations at most, each with its paragraph (1.200 characters) and metadata.
  const verify = estimateRun(
    prepared
      .filter((record) => {
        const step = stepOf(state, record.id, 'verify');
        return !isDone(step, record) && !open.has(customIdFor('verify', record.id));
      })
      .map(() => costShape(verifySystem.length, 12 * 1500, 'verify', relationEffort)),
    // The second-pass prompt is under the cacheable minimum (512 tokens): no cache mark, no discount.
    { model: relationModel ?? model, cached: false },
  );
  const verifytext = estimateRun(
    prepared
      .filter((record) => !isTextDone(stepOf(state, record.id, 'verifytext'), record))
      .map(() => costShape(verifyTextSystem.length, maxTextItems * 1000, 'verifytext')),
    { model, cached: false },
  );
  return {
    prepared,
    toExtract,
    extract,
    verify,
    verifytext,
    worstCaseUsd: extract.worstCaseUsd + verify.worstCaseUsd + verifytext.worstCaseUsd,
  };
}

export function renderPlan(plan, { model, effort, relationModel, relationEffort = effort }) {
  const line = (name, e, used) =>
    `  ${name}: ${e.requests} pedidos em lote, ${e.inputTokens} tokens de entrada (estimados), ${e.expectedOutputTokens} de saída esperados, teto ${e.maxOutputTokens}; ${used}. Esperado ${formatUsd(e.expectedUsd)}, pior caso ${formatUsd(e.worstCaseUsd)}`;
  return [
    line('extração', plan.extract, `${model} ${effort}`),
    line('segunda passada', plan.verify, `${relationModel ?? model} ${relationEffort}`),
    line('conferência do texto', plan.verifytext, `${model} ${effort}`),
    `  total: esperado ${formatUsd(plan.extract.expectedUsd + plan.verify.expectedUsd + plan.verifytext.expectedUsd)}, pior caso ${formatUsd(plan.worstCaseUsd)}`,
  ].join('\n');
}

const ledger = (state, usd, usage, phase, model) => {
  state.spend.usd += usd;
  state.spend.inputTokens += usage.input_tokens ?? 0;
  state.spend.cacheReadTokens += usage.cache_read_input_tokens ?? 0;
  state.spend.cacheWriteTokens += usage.cache_creation_input_tokens ?? 0;
  state.spend.outputTokens += usage.output_tokens ?? 0;
  state.spend.byPhase[phase] = (state.spend.byPhase[phase] ?? 0) + usd;
  state.spend.byModel[model] = (state.spend.byModel[model] ?? 0) + usd;
};

/**
 * One phase over a set of `{ customId, params }`. The batch id reaches STATE.json before polling; a
 * `submitting` mark before the create call catches a crash between sending and recording, so a
 * restart stops and asks instead of paying twice.
 */
async function runPhase({
  phase,
  requests,
  client,
  save,
  state,
  model,
  sync,
  onMessage,
  onFailure,
  pollMs,
  log,
  budget,
  worstCaseEach,
}) {
  if (state.submitting?.phase === phase)
    throw new Error(
      `Um envio de ${phase} foi interrompido em ${state.submitting.at} antes de registrar o lote. Confira o lote no console da Anthropic e apague "submitting" do STATE.json para seguir.`,
    );
  const handle = async (customId, result) => {
    if (result.type !== 'succeeded') {
      await onFailure(customId, result.error?.message ?? result.type);
      return;
    }
    const usd = costOfUsage(result.message.usage, { model, batch: !sync });
    budget.charge(usd);
    ledger(state, usd, result.message.usage, phase, model);
    await onMessage(customId, result.message, usd);
    await save();
  };

  if (sync) {
    for (const { customId, params } of requests) {
      budget.reserve(worstCaseEach, `pedido ${customId}`);
      let message = null;
      try {
        message = await client.messages.create(params);
      } catch (error) {
        await onFailure(customId, error.message);
      }
      budget.release(worstCaseEach);
      if (message) await handle(customId, { type: 'succeeded', message });
      await save();
    }
    return;
  }

  const pending = state.batches.filter((b) => b.status === 'open' && b.phase === phase);
  if (requests.length) {
    state.submitting = {
      phase,
      at: new Date().toISOString(),
      ids: requests.map((r) => r.customId),
    };
    await save();
    let batch;
    try {
      batch = await client.messages.batches.create({
        requests: requests.map(({ customId, params }) => ({ custom_id: customId, params })),
      });
    } catch (error) {
      // A status means the API answered and refused: nothing was queued. A timeout stays ambiguous.
      if (error.status) {
        delete state.submitting;
        await save();
      }
      throw error;
    }
    const entry = {
      id: batch.id,
      phase,
      model,
      status: 'open',
      ids: requests.map((r) => r.customId),
      createdAt: new Date().toISOString(),
    };
    state.batches.push(entry);
    pending.push(entry);
    delete state.submitting;
    await save();
    log(`lote ${batch.id}: ${requests.length} pedidos de ${phase}`);
  }
  for (const entry of pending) {
    for (;;) {
      const current = await client.messages.batches.retrieve(entry.id);
      if (current.processing_status === 'ended') break;
      log(`aguardando ${entry.id}: ${current.request_counts?.processing ?? '?'} em processamento`);
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
    const seen = new Set();
    for await (const item of await client.messages.batches.results(entry.id)) {
      seen.add(item.custom_id);
      await handle(item.custom_id, item.result);
    }
    for (const id of entry.ids.filter((id) => !seen.has(id)))
      await onFailure(id, 'sem resultado no lote');
    entry.status = 'ended';
    await save();
  }
}

const emptyDraftFields = { dates: [], relations: [], claims: [], sections: [], glossary: [] };

/**
 * Runs both passes. Paths are injected so the evaluation harness can keep each arm apart. `client`
 * is the Anthropic client or a test double; it is never touched by a dry run.
 */
export async function runExtraction({
  records,
  allRecords = records,
  stateFile,
  outDirectory,
  responsesDirectory,
  client,
  model = defaultModel,
  relationModel,
  effort = 'low',
  relationEffort = effort,
  maxUsd = 1,
  maxTotalUsd = 10,
  /** Spent anywhere in this checkout; the account has one balance. Default: this state only. */
  spentBefore,
  sync = false,
  retryFailed = false,
  pollMs = 30_000,
  log = console.log,
  loadStateFile,
}) {
  const state = await loadStateFile();
  const plan = planRun({
    records,
    state,
    model,
    relationModel,
    effort,
    relationEffort,
    retryFailed,
  });
  const budget = createBudget({ maxUsd, maxTotalUsd, spentBefore: spentBefore ?? state.spend.usd });
  budget.reserve(plan.worstCaseUsd, 'execução');
  // A batch cannot stop midway, so its reservation stands; sync reserves again before each request.
  if (sync) budget.release(plan.worstCaseUsd);

  const save = () => writeJsonAtomic(stateFile, state);
  // A batch left open by an earlier run may hold entities outside this run's selection.
  const byId = new Map(
    allRecords.map((record) => [record.id, { ...record, source: richSourceText(record.article) }]),
  );
  const verifyModel = relationModel ?? model;
  const rawPath = (phase, id) => join(responsesDirectory, phase, `${id}.json`);

  await mkdir(outDirectory, { recursive: true });
  const keepRaw = async (phase, id, message) => {
    await mkdir(dirname(rawPath(phase, id)), { recursive: true });
    await writeFile(rawPath(phase, id), `${JSON.stringify(message, null, 1)}\n`);
  };
  const recordIdOf = new Map(
    allRecords.flatMap((record) => [
      [customIdFor('extract', record.id), record.id],
      [customIdFor('verify', record.id), record.id],
      [customIdFor('verifytext', record.id), record.id],
    ]),
  );
  const failure = (phase) => async (customId, reason) => {
    const id = recordIdOf.get(customId) ?? customId;
    setStep(state, id, phase, {
      status: 'failed',
      reason,
      prompt: promptHash,
      revision: byId.get(id)?.article.revision,
    });
    log(`falhou (${phase}): ${id}: ${reason}`);
    await save();
  };

  const writeDraft = async (record, extraction, rejected, counts) => {
    const draft = {
      contract: richContract,
      entity: record.entity,
      source: {
        url: record.article.url,
        revision: record.article.revision,
        language: record.article.lang,
        retrievedAt: record.retrievedAt,
        license: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
        truncated: record.source.truncated,
        coverage: record.source.coverage,
      },
      review: {
        by: 'assistant',
        model,
        effort,
        verifiedBy: verifyModel,
        status: 'draft',
        prompt: promptHash,
      },
      ...emptyDraftFields,
      ...extraction,
      rejected,
      counts,
    };
    await writeFile(join(outDirectory, `${record.id}.json`), `${JSON.stringify(draft, null, 2)}\n`);
    return draft;
  };

  await runPhase({
    phase: 'extract',
    requests: plan.toExtract.map((record) => ({
      customId: customIdFor('extract', record.id),
      params: richParams({
        entity: record.entity,
        text: record.source.text,
        model,
        effort,
        requestCount: plan.toExtract.length,
      }),
    })),
    client,
    save,
    state,
    model,
    sync,
    pollMs,
    log,
    budget,
    worstCaseEach: plan.toExtract.length ? plan.extract.worstCaseUsd / plan.toExtract.length : 0,
    onFailure: failure('extract'),
    onMessage: async (customId, message, usd) => {
      const id = recordIdOf.get(customId);
      const record = byId.get(id);
      await keepRaw('extract', id, message);
      let output;
      try {
        output = messageJson(message);
      } catch (error) {
        await failure('extract')(customId, error.message);
        return;
      }
      const { extraction, rejected, counts } = guardExtraction(output, {
        text: record.source.text,
        entity: record.entity,
        article: record.article,
      });
      await writeDraft(record, extraction, rejected, counts);
      setStep(state, id, 'extract', {
        status: 'done',
        revision: record.article.revision,
        prompt: promptHash,
        model,
        effort,
        usd,
        kept: extraction.relations.length,
        rejected: rejected.length,
        gaps: contractGaps(extraction),
      });
      log(
        `extraído: ${id} (${extraction.relations.length} relações, ${rejected.length} descartes, ${formatUsd(usd)})`,
      );
    },
  });

  // Second pass: only for entities whose first pass is done; no relations means nothing to pay for.
  const drafts = new Map();
  const toVerify = [];
  for (const record of plan.prepared) {
    const open = state.batches.some(
      (b) => b.status === 'open' && b.ids.includes(customIdFor('verify', record.id)),
    );
    if (!isDone(stepOf(state, record.id, 'extract'), record) || open) continue;
    if (isDone(stepOf(state, record.id, 'verify'), record)) continue;
    const draft = await readJson(join(outDirectory, `${record.id}.json`));
    drafts.set(record.id, draft);
    // Relations confirmed earlier keep their verdict; only the new ones are paid for.
    if (!draft.relations.some((relation) => !relation.verified)) {
      setStep(state, record.id, 'verify', {
        status: 'done',
        revision: record.article.revision,
        prompt: promptHash,
        usd: 0,
        confirmed: 0,
      });
      continue;
    }
    if (stepOf(state, record.id, 'verify')?.status === 'failed' && !retryFailed) continue;
    toVerify.push(record);
  }
  await save();
  await runPhase({
    phase: 'verify',
    requests: toVerify.map((record) => ({
      customId: customIdFor('verify', record.id),
      params: verifyParams({
        entity: record.entity,
        relations: drafts.get(record.id).relations.filter((relation) => !relation.verified),
        text: record.source.text,
        model: verifyModel,
        effort: relationEffort,
      }),
    })),
    client,
    save,
    state,
    model: verifyModel,
    sync,
    pollMs,
    log,
    budget,
    worstCaseEach: plan.verify.requests ? plan.verify.worstCaseUsd / plan.verify.requests : 0,
    onFailure: failure('verify'),
    onMessage: async (customId, message, usd) => {
      const id = recordIdOf.get(customId);
      const record = byId.get(id);
      await keepRaw('verify', id, message);
      const draft = drafts.get(id) ?? (await readJson(join(outDirectory, `${id}.json`)));
      let output;
      try {
        output = messageJson(message);
      } catch (error) {
        await failure('verify')(customId, error.message);
        return;
      }
      const applied = applyVerdicts(
        draft.relations.filter((relation) => !relation.verified),
        output,
        { model: verifyModel },
      );
      draft.relations = [
        ...draft.relations.filter((relation) => relation.verified),
        ...applied.relations,
      ];
      draft.rejected = [...draft.rejected, ...applied.rejected];
      await writeFile(join(outDirectory, `${id}.json`), `${JSON.stringify(draft, null, 2)}\n`);
      setStep(state, id, 'verify', {
        status: 'done',
        revision: record.article.revision,
        prompt: promptHash,
        model: verifyModel,
        usd,
        confirmed: applied.relations.length,
        rejected: applied.rejected.length,
      });
      log(
        `conferido: ${id} (${applied.relations.length} confirmadas, ${applied.rejected.length} descartadas)`,
      );
    },
  });
  await save();

  // Second pass on text: the quote must hold everything the item says.
  const textDrafts = new Map();
  const textToVerify = [];
  for (const record of plan.prepared) {
    const open = state.batches.some(
      (b) => b.status === 'open' && b.ids.includes(customIdFor('verifytext', record.id)),
    );
    if (!isDone(stepOf(state, record.id, 'extract'), record) || open) continue;
    const step = stepOf(state, record.id, 'verifytext');
    if (isTextDone(step, record) || (step?.status === 'failed' && !retryFailed)) continue;
    const draft = await readJson(join(outDirectory, `${record.id}.json`));
    textDrafts.set(record.id, draft);
    if (textItems(draft).length) textToVerify.push(record);
    else
      setStep(state, record.id, 'verifytext', {
        status: 'done',
        revision: record.article.revision,
        prompt: textPrompt,
        usd: 0,
        confirmed: 0,
      });
  }
  await save();
  await runPhase({
    phase: 'verifytext',
    requests: textToVerify.map((record) => ({
      customId: customIdFor('verifytext', record.id),
      params: verifyTextParams({
        entity: record.entity,
        items: textItems(textDrafts.get(record.id)),
        text: record.source.text,
        model,
        effort,
      }),
    })),
    client,
    save,
    state,
    model,
    sync,
    pollMs,
    log,
    budget,
    worstCaseEach: plan.verifytext.requests
      ? plan.verifytext.worstCaseUsd / plan.verifytext.requests
      : 0,
    onFailure: failure('verifytext'),
    onMessage: async (customId, message, usd) => {
      const id = recordIdOf.get(customId);
      const record = byId.get(id);
      await keepRaw('verifytext', id, message);
      const draft = textDrafts.get(id) ?? (await readJson(join(outDirectory, `${id}.json`)));
      let output;
      try {
        output = messageJson(message);
      } catch (error) {
        await failure('verifytext')(customId, error.message);
        return;
      }
      const applied = applyTextVerdicts(textItems(draft), output);
      draft.sections = applied.sections;
      draft.dates = applied.dates;
      draft.claims = applied.claims;
      draft.rejected = [...draft.rejected, ...applied.rejected];
      await writeFile(join(outDirectory, `${id}.json`), `${JSON.stringify(draft, null, 2)}\n`);
      setStep(state, id, 'verifytext', {
        status: 'done',
        revision: record.article.revision,
        prompt: textPrompt,
        model,
        usd,
        rejected: applied.rejected.length,
      });
      log(`texto conferido: ${id} (${applied.rejected.length} itens descartados)`);
    },
  });
  await save();
  return { state, plan, spent: budget.spent };
}

/**
 * Runs the current guards over responses already paid for, with no client and no cost. Verdicts of
 * the second pass carry over by relation; a relation that only now passes waits for its verdict,
 * with `verified: false`, and never reaches the graph before that.
 */
export async function reapplyGuards({
  records,
  stateFile,
  outDirectory,
  responsesDirectory,
  loadStateFile,
  log = () => {},
}) {
  const state = await loadStateFile();
  const totals = { drafts: 0, pending: 0, reused: 0 };
  for (const record of records) {
    const raw = join(responsesDirectory, 'extract', `${record.id}.json`);
    const message = await readJson(raw).catch(() => null);
    if (!message) continue;
    const previous = await readJson(join(outDirectory, `${record.id}.json`));
    const confirmed = new Map(
      previous.relations.filter((r) => r.verified).map((r) => [relationKey(r), r]),
    );
    const refused = new Map(
      previous.rejected
        .filter((item) => item.reason.startsWith('segunda-passada:'))
        .map((item) => [relationKey(item.item), item]),
    );
    // Text verdicts do not depend on the article links, so a reguard keeps them instead of
    // reporting zero text rejections just because the API was not called again.
    const refusedText = previous.rejected.filter((item) =>
      item.reason.startsWith('segunda-passada-texto:'),
    );
    const { text } = richSourceText(record.article);
    const { extraction, rejected, counts } = guardExtraction(messageJson(message), {
      text,
      entity: record.entity,
      article: record.article,
    });
    const relations = [];
    for (const relation of extraction.relations) {
      const key = relationKey(relation);
      if (refused.has(key)) {
        rejected.push(refused.get(key));
        totals.reused += 1;
      } else if (confirmed.has(key)) {
        relations.push({
          ...relation,
          verified: true,
          verifiedBy: confirmed.get(key).verifiedBy,
        });
        totals.reused += 1;
      } else {
        relations.push(relation);
        totals.pending += 1;
      }
    }
    const draft = {
      ...previous,
      ...extraction,
      relations,
      rejected: [...rejected, ...refusedText],
      counts,
    };
    await writeFile(join(outDirectory, `${record.id}.json`), `${JSON.stringify(draft, null, 2)}\n`);
    // Pending relations reopen the second pass for this entity, and only for what is pending.
    if (relations.some((relation) => !relation.verified) && state.entities[record.id])
      delete state.entities[record.id].verify;
    totals.drafts += 1;
  }
  await writeJsonAtomic(stateFile, state);
  log(
    `${totals.drafts} rascunhos refeitos sem API; ${totals.reused} vereditos reaproveitados, ${totals.pending} relações à espera da segunda passada`,
  );
  return totals;
}

/** Paths of one tradition, shared by this CLI and the stage gates. */
export const workPaths = (root, slug) => ({
  articles: join(root, 'generated/wiki-extract', slug, 'articles'),
  out: join(root, 'generated/wiki-extract', slug, 'extracts'),
  responses: join(root, 'generated/pipeline', slug, 'responses'),
  state: statePath(root, slug),
});

/** What the evaluation fixed in model-choice.json; a flag on the command line wins. */
export function chosenOptions(choice, flags = {}) {
  return {
    model: flags.model ?? choice?.chosen?.extracao?.model ?? defaultModel,
    effort: flags.effort ?? choice?.chosen?.extracao?.effort ?? 'low',
    relationModel: flags['relation-model'] ?? choice?.chosen?.relacoes?.model,
    relationEffort:
      flags['relation-effort'] ?? choice?.chosen?.relacoes?.effort ?? flags.effort ?? 'low',
  };
}

export async function main(argv = process.argv.slice(2)) {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      'dry-run': { type: 'boolean', default: false },
      sync: { type: 'boolean', default: false },
      'retry-failed': { type: 'boolean', default: false },
      'max-usd': { type: 'string', default: '1' },
      'max-total-usd': { type: 'string', default: '10' },
      effort: { type: 'string' },
      model: { type: 'string' },
      'relation-model': { type: 'string' },
      'relation-effort': { type: 'string' },
      limit: { type: 'string' },
      only: { type: 'string' },
    },
  });
  const [slug] = positionals;
  if (!/^[a-z][a-z0-9-]*$/.test(slug ?? ''))
    throw new Error('Uso: tradicao:extract <slug> [--dry-run] [--max-usd N]');
  const paths = workPaths(projectRoot, slug);
  const allRecords = await loadRecords(paths.articles);
  let records = allRecords;
  if (values.only) {
    const only = new Set(values.only.split(','));
    records = records.filter((record) => only.has(record.id));
  }
  if (values.limit) records = records.slice(0, Number(values.limit));
  const options = chosenOptions(
    await readJson(join(projectRoot, 'scripts/tradicao/model-choice.json')).catch(() => null),
    values,
  );
  const loadStateFile = () => loadState(projectRoot, slug);
  if (values['dry-run']) {
    const plan = planRun({
      records,
      state: await loadStateFile(),
      retryFailed: values['retry-failed'],
      ...options,
    });
    console.log(`[dry-run] ${records.length} artigos locais de ${slug}. Nenhuma chamada à API.`);
    console.log(renderPlan(plan, options));
    return 0;
  }
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN)
    throw new Error('Defina ANTHROPIC_API_KEY no ambiente antes de extrair.');
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const { state, spent } = await runExtraction({
    records,
    allRecords,
    stateFile: paths.state,
    outDirectory: paths.out,
    responsesDirectory: paths.responses,
    client: new Anthropic(),
    maxUsd: Number(values['max-usd']),
    maxTotalUsd: Number(values['max-total-usd']),
    spentBefore: await totalSpent(projectRoot),
    sync: values.sync,
    retryFailed: values['retry-failed'],
    loadStateFile,
    ...options,
  });
  console.log(
    `gasto nesta execução: ${formatUsd(spent)}; razão total: ${formatUsd(state.spend.usd)}`,
  );
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = error instanceof BudgetExceeded ? 3 : 1;
  }
}
