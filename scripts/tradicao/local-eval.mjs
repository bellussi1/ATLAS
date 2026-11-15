#!/usr/bin/env node
/**
 * Benchmark local (US$ 0,00 via Ollama) sobre a amostra de 20 artigos de
 * `scripts/tradicao/model-choice.json`, aplicando as travas exatas de
 * `scripts/tradicao/guards.mjs` e comparando com o baseline pago (`onda1-2026-11`).
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

import { armMetrics } from './eval.mjs';
import { applyVerdicts, contractGaps, guardExtraction, passageFor } from './guards.mjs';
import { richSourceText, richSystem, verifySystem } from './prompts.mjs';
import { projectRoot } from './registry.mjs';
import { relationDirections, relationNatures, sectionKinds, verdicts } from './rich.mjs';

export const DEFAULT_LOCAL_ARMS = [
  { name: 'qwen3-8b-local', model: 'qwen3:8b-q4_K_M' },
  { name: 'gemma2-9b-local', model: 'gemma2:9b-instruct-q4_K_M' },
];

export const DEFAULT_OUTPUT_DIR = 'generated/eval/local-20-2026-11';
const OLLAMA_BASE_URL = process.env.ATLAS_OLLAMA_URL || 'http://localhost:11434';

export const LOCAL_EXTRACT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    oneLine: { type: 'string' },
    summary: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: sectionKinds },
          text: { type: 'string' },
          quote: { type: 'string' },
        },
        required: ['kind', 'text', 'quote'],
      },
    },
    glossary: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          term: { type: 'string' },
          pt: { type: 'array', items: { type: 'string' } },
          en: { type: 'array', items: { type: 'string' } },
          aliases: { type: 'array', items: { type: 'string' } },
        },
        required: ['term', 'pt', 'en', 'aliases'],
      },
    },
    relations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          target: { type: 'string' },
          nature: { type: 'string', enum: relationNatures },
          direction: { type: 'string', enum: relationDirections },
          sentence: { type: 'string' },
          quote: { type: 'string' },
        },
        required: ['target', 'nature', 'direction', 'sentence', 'quote'],
      },
    },
    dates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string' },
          event: { type: 'string' },
          quote: { type: 'string' },
        },
        required: ['date', 'event', 'quote'],
      },
    },
    claims: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          statement: { type: 'string' },
          kind: { type: 'string', enum: ['fact', 'interpretation', 'controversy'] },
          quote: { type: 'string' },
        },
        required: ['statement', 'kind', 'quote'],
      },
    },
  },
  required: ['oneLine', 'summary', 'sections', 'glossary', 'relations', 'dates', 'claims'],
};

export const LOCAL_VERIFY_JSON_SCHEMA = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          verdict: { type: 'string', enum: verdicts },
          reason: { type: 'string' },
        },
        required: ['index', 'verdict', 'reason'],
      },
    },
  },
  required: ['verdicts'],
};

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));

/** Carrega os 20 artigos da amostra oficial listada em `model-choice.json` e `amostra.json`. */
export async function loadSampleRecords20(root = projectRoot) {
  const modelChoice = await readJson(join(root, 'scripts/tradicao/model-choice.json'));
  const sampleMeta = await readJson(join(root, 'generated/eval/onda1-2026-11/amostra.json'));
  const ids = modelChoice.sampleIds ?? sampleMeta.ids ?? [];
  const metaById = new Map((sampleMeta.articles ?? []).map((entry) => [entry.id, entry.entity]));
  const extractRoot = join(root, 'generated/wiki-extract');
  const traditions = (await readdir(extractRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const records = [];
  for (const id of ids) {
    let foundPath = null;
    let foundTradition = null;
    for (const tradition of traditions) {
      const candidate = join(extractRoot, tradition, 'articles', `${id}.json`);
      if (existsSync(candidate)) {
        foundPath = candidate;
        foundTradition = tradition;
        break;
      }
    }
    if (!foundPath) {
      throw new Error(`Artigo da amostra nao encontrado em generated/wiki-extract: ${id}`);
    }
    const raw = await readJson(foundPath);
    records.push({
      id,
      tradition: foundTradition,
      sourcePath: foundPath,
      entity: metaById.get(id) ?? raw.entity,
      article: raw.article,
    });
  }
  return { ids, records, baselineChoice: modelChoice };
}

/** Lista alvos linkados no artigo com QID para ajudar o extrator local a nao inventar nomes. */
export function collectKnownTargets(article, maxTargets = 40) {
  const seen = new Set();
  const targets = [];
  for (const target of article?.targets ?? []) {
    if (!target || target.missing || !target.qid || !target.title) continue;
    const key = target.title.toLocaleLowerCase('pt-BR');
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push({ title: target.title, qid: target.qid, type: target.type });
    if (targets.length >= maxTargets) break;
  }
  return targets;
}

/**
 * Seleciona um recorte literal (lead + paragrafos com alvos linkados) dentro de `maxChars`,
 * preservando apenas linhas inteiras do texto-fonte para que qualquer citacao literal exista
 * integralmente em `fullText`.
 */
export function selectLocalPromptText(article, fullText, maxChars = 4200) {
  if (!fullText || fullText.length <= maxChars) return fullText;
  const paragraphs = fullText.split('\n');
  const chosen = new Set();
  let usedChars = 0;
  const leadCap = Math.min(2200, maxChars);

  for (let i = 0; i < paragraphs.length; i += 1) {
    const p = paragraphs[i];
    const nextLen = usedChars + (chosen.size > 0 ? 1 : 0) + p.length;
    if (nextLen > leadCap) {
      if (chosen.size === 0) {
        return fullText.slice(0, maxChars);
      }
      break;
    }
    chosen.add(i);
    usedChars = nextLen;
  }

  const targets = collectKnownTargets(article, 40)
    .map((t) => t.title.toLocaleLowerCase('pt-BR'))
    .filter((name) => name.length >= 4);

  const candidates = [];
  for (let i = 0; i < paragraphs.length; i += 1) {
    if (chosen.has(i)) continue;
    const p = paragraphs[i];
    if (p.trim().length < 40) continue;
    const lower = p.toLocaleLowerCase('pt-BR');
    let hits = 0;
    for (const target of targets) {
      if (lower.includes(target)) hits += 1;
    }
    if (hits > 0) candidates.push({ index: i, hits, len: p.length });
  }

  candidates.sort((a, b) => b.hits - a.hits || a.index - b.index);
  for (const cand of candidates) {
    if (usedChars + 1 + cand.len > maxChars) continue;
    chosen.add(cand.index);
    usedChars += 1 + cand.len;
  }

  return [...chosen]
    .sort((a, b) => a - b)
    .map((i) => paragraphs[i])
    .join('\n');
}

/** Monta mensagens compactas respeitando `richContract` e o texto literal do artigo. */
export function buildLocalExtractMessages({ entity, article, text }) {
  const excerpt = selectLocalPromptText(article, text, 2800);
  const knownTargets = collectKnownTargets(article, 25)
    .map((t) => `${t.title} (${t.type}, ${t.qid})`)
    .join('; ');
  const userContent = [
    `Entidade: ${entity.label} (${entity.type}, Wikidata ${entity.qid ?? 'sem item'}).`,
    `Tipos de secao validos: ${sectionKinds.join(', ')}.`,
    `Naturezas validas de relacao: ${relationNatures.join(', ')}.`,
    'Direcoes validas: "entidade-para-alvo" | "alvo-para-entidade".',
    knownTargets
      ? `Alvos linkados no artigo (prefira estes nomes exatos em relations[].target): ${knownTargets}`
      : '',
    'Retorne APENAS um objeto JSON com as chaves: oneLine (<=140 chars), summary (<=480 chars), sections ([{kind,text,quote}]), glossary ([{term,pt,en,aliases}]), relations ([{target,nature,direction,sentence,quote}]), dates ([{date,event,quote}]), claims ([{statement,kind,quote}]).',
    'ORCAMENTO ESTRITO DE SAIDA: seja conciso para caber em ~700 tokens de resposta: use exatamente 2 secoes (text <=150 chars), 1 item em glossary com pt, en e aliases como listas curtas (max 2 strings cada), 2 a 3 relacoes, 1 a 2 datas (AAAA, AAAA-MM ou AAAA-MM-DD com ano presente em quote) e 2 claims (statement <=150 chars).',
    'REGRA CRITICA DE CITACAO (quote): copie literalmente uma frase curta com 25 a 200 caracteres existente dentro de <artigo> (NUNCA copie paragrafos inteiros nem altere acentos ou palavras). Em cada relacao, quote deve conter o nome do alvo e o verbo correspondente a natureza.',
    '',
    `<artigo>\n${excerpt}\n</artigo>`,
  ]
    .filter(Boolean)
    .join('\n');

  return [
    { role: 'system', content: richSystem },
    { role: 'user', content: userContent },
  ];
}

export function buildLocalVerifyMessages({ entity, relations, text }) {
  const items = relations.map((relation, index) => ({
    index,
    tipo: relation.nature,
    sentido:
      relation.direction === 'entidade-para-alvo'
        ? `${entity.label} -> ${relation.target}`
        : `${relation.target} -> ${entity.label}`,
    citacao: relation.quote,
    paragrafo: passageFor(relation.quote, text),
  }));
  return [
    { role: 'system', content: verifySystem },
    {
      role: 'user',
      content: `Entidade do artigo: ${entity.label}.\nRetorne APENAS JSON: {"verdicts": [{"index": number, "verdict": "confirma"|"inverte"|"nao-sustenta", "reason": string}]}.\n\n<relacoes>\n${JSON.stringify(items, null, 1)}\n</relacoes>`,
    },
  ];
}

export async function unloadOllamaModel(model, baseUrl = OLLAMA_BASE_URL) {
  try {
    await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [], keep_alive: 0 }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Melhor esforco para liberar VRAM entre modelos.
  }
}

export async function callOllamaCached({
  model,
  messages,
  cacheDir,
  format = 'json',
  numPredict = 1024,
  numCtx = 3072,
  baseUrl = OLLAMA_BASE_URL,
  transport = null,
}) {
  const key = createHash('sha256')
    .update(JSON.stringify({ model, messages, format, numPredict, numCtx }))
    .digest('hex');
  const modelDir = join(cacheDir, model.replace(/[^a-zA-Z0-9._-]+/g, '_'));
  const cachePath = join(modelDir, `${key}.json`);
  if (existsSync(cachePath)) {
    const cached = await readJson(cachePath);
    return { ...cached, cached: true };
  }

  let parsed = {};
  let parsedOk = true;
  let rawText = '';
  let evalCount = 0;
  let promptEvalCount = 0;
  const started = Date.now();

  if (transport) {
    const res = await transport({ model, messages, format, numPredict, numCtx });
    rawText = typeof res === 'string' ? res : JSON.stringify(res);
    parsed = typeof res === 'string' ? JSON.parse(res) : res;
  } else {
    const payload = {
      model,
      messages,
      stream: false,
      keep_alive: '10m',
      format,
      options: { temperature: 0.0, num_predict: numPredict, num_ctx: numCtx },
    };
    if (model.toLowerCase().includes('qwen3')) payload.think = false;
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(180_000),
    });
    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status} para ${model}`);
    }
    const data = await response.json();
    rawText = data?.message?.content ?? '{}';
    evalCount = Number(data?.eval_count ?? 0);
    promptEvalCount = Number(data?.prompt_eval_count ?? 0);
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = {};
      parsedOk = false;
    }
  }

  const record = {
    model,
    key,
    parsed: parsed && typeof parsed === 'object' ? parsed : {},
    outputTokens: evalCount,
    inputTokens: promptEvalCount,
    latencyMs: Date.now() - started,
  };
  if (parsedOk) {
    await mkdir(modelDir, { recursive: true });
    await writeFile(cachePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  } else {
    throw new Error(`JSON invalido ou truncado de ${model} (${evalCount} tokens)`);
  }
  return { ...record, cached: false };
}

/** Aplica `guardExtraction` + segunda passada `applyVerdicts` e produz o rascunho avaliavel. */
export function evaluateLocalDraft({ entity, article, text, rawExtraction, rawVerdicts, model }) {
  const { extraction, rejected, counts } = guardExtraction(rawExtraction ?? {}, {
    text,
    entity,
    article,
  });
  const secondPass = applyVerdicts(extraction.relations, rawVerdicts ?? { verdicts: [] }, {
    model: `ollama/${model}`,
  });
  const finalExtraction = {
    ...extraction,
    relations: secondPass.relations,
  };
  const gaps = contractGaps(finalExtraction);
  return {
    entity,
    source: { url: article.url ?? '', revision: article.revision ?? '' },
    ...finalExtraction,
    rejected: [...rejected, ...secondPass.rejected],
    counts,
    contractGaps: gaps,
  };
}

export async function runLocalEval({
  root = projectRoot,
  arms = DEFAULT_LOCAL_ARMS,
  limit = null,
  outputDir = DEFAULT_OUTPUT_DIR,
  transport = null,
} = {}) {
  const { records, baselineChoice } = await loadSampleRecords20(root);
  const selected = limit ? records.slice(0, limit) : records;
  const outRoot = join(root, outputDir);
  const cacheDir = join(outRoot, 'cache');
  await mkdir(outRoot, { recursive: true });

  const paidBaseline = await readJson(join(root, 'generated/eval/onda1-2026-11/metricas.json'));
  const results = {};

  for (const arm of arms) {
    const drafts = [];
    const state = {
      model: arm.model,
      spend: { usd: 0, outputTokens: 0, inputTokens: 0 },
      entities: {},
    };
    let cacheHits = 0;

    for (const record of selected) {
      const { text } = richSourceText(record.article);
      state.entities[record.id] = { extract: { status: 'pending' }, verify: { status: 'skipped' } };

      let extractRes;
      try {
        extractRes = await callOllamaCached({
          model: arm.model,
          messages: buildLocalExtractMessages({
            entity: record.entity,
            article: record.article,
            text,
          }),
          cacheDir,
          format: LOCAL_EXTRACT_JSON_SCHEMA,
          numPredict: 2048,
          numCtx: 4096,
          transport,
        });
        if (extractRes.cached) cacheHits += 1;
        state.spend.outputTokens += extractRes.outputTokens ?? 0;
        state.spend.inputTokens += extractRes.inputTokens ?? 0;
        state.entities[record.id].extract = { status: 'done' };
      } catch (err) {
        state.entities[record.id].extract = { status: 'failed', error: String(err.message ?? err) };
        extractRes = { parsed: {} };
      }

      const preGuard = guardExtraction(extractRes.parsed ?? {}, {
        text,
        entity: record.entity,
        article: record.article,
      });

      let verifyRes = { parsed: { verdicts: [] } };
      if (preGuard.extraction.relations.length > 0) {
        try {
          verifyRes = await callOllamaCached({
            model: arm.model,
            messages: buildLocalVerifyMessages({
              entity: record.entity,
              relations: preGuard.extraction.relations,
              text,
            }),
            cacheDir,
            format: LOCAL_VERIFY_JSON_SCHEMA,
            numPredict: 512,
            numCtx: 3072,
            transport,
          });
          if (verifyRes.cached) cacheHits += 1;
          state.spend.outputTokens += verifyRes.outputTokens ?? 0;
          state.spend.inputTokens += verifyRes.inputTokens ?? 0;
          state.entities[record.id].verify = { status: 'done' };
        } catch (err) {
          state.entities[record.id].verify = {
            status: 'failed',
            error: String(err.message ?? err),
          };
        }
      }

      const draft = evaluateLocalDraft({
        entity: record.entity,
        article: record.article,
        text,
        rawExtraction: extractRes.parsed,
        rawVerdicts: verifyRes.parsed,
        model: arm.model,
      });
      drafts.push(draft);
    }

    if (!transport) {
      await unloadOllamaModel(arm.model);
    }

    const metrics = armMetrics(drafts, state);
    const armDir = join(outRoot, arm.name);
    await mkdir(armDir, { recursive: true });
    await writeFile(join(armDir, 'drafts.json'), `${JSON.stringify(drafts, null, 2)}\n`, 'utf8');

    results[arm.name] = {
      model: arm.model,
      costUsd: 0,
      cacheHits,
      ...metrics,
    };
  }

  const report = {
    generatedAt: new Date().toISOString(),
    sampleSource: 'scripts/tradicao/model-choice.json',
    sampleCount: selected.length,
    sampleIds: selected.map((r) => r.id),
    paidBaselines: {
      'haiku-low': paidBaseline['haiku-low'],
      'haiku-medium': paidBaseline['haiku-medium'],
      modelChoiceRecorded: baselineChoice.measured?.arms ?? null,
    },
    localArms: results,
  };

  await writeFile(join(outRoot, 'metricas.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return report;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { values } = parseArgs({
    options: {
      limit: { type: 'string' },
      models: { type: 'string' },
    },
  });
  const limit = values.limit ? Number.parseInt(values.limit, 10) : null;
  const arms = values.models
    ? values.models.split(',').map((m) => ({
        name: m.trim().replace(/[^a-zA-Z0-9-]+/g, '-'),
        model: m.trim(),
      }))
    : DEFAULT_LOCAL_ARMS;
  const summary = await runLocalEval({ limit, arms });
  console.log(
    JSON.stringify({ sampleCount: summary.sampleCount, localArms: summary.localArms }, null, 2),
  );
}
