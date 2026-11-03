#!/usr/bin/env node
// Wikipedia → Claude Haiku → R2. Usage:
//   node scripts/wiki-extract.mjs fetch <tradição> [--limit N]
//   node scripts/wiki-extract.mjs extract <tradição> [--sync] [--limit N] [--resume <batchId>]
//   node scripts/wiki-extract.mjs publish <tradição> [--dry-run]
// Extractions are drafts reviewed by `assistant` (AI); they do not enter the site build.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import Anthropic from '@anthropic-ai/sdk';

import {
  atomicFile,
  loadR2Config,
  projectRoot,
  putImmutable,
  sha256Hex,
} from './content/r2-content.mjs';
import { articleText, fetchArticle, sitelinkTitles } from './ingestion/wiki-extract/article.mjs';
import {
  extractionModel,
  extractionParams,
  maxInputChars,
  parseExtraction,
  verifyQuotes,
} from './ingestion/wiki-extract/extraction.mjs';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    limit: { type: 'string' },
    sync: { type: 'boolean', default: false },
    resume: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
  },
});
const [command, tradition] = positionals;
if (!['fetch', 'extract', 'publish'].includes(command) || !/^[a-z-]+$/.test(tradition ?? ''))
  throw new Error('Uso: wiki-extract.mjs <fetch|extract|publish> <tradição>');
const limit = values.limit ? Number(values.limit) : Number.POSITIVE_INFINITY;

const workDirectory = join(projectRoot, 'generated/wiki-extract', tradition);
const articlesDirectory = join(workDirectory, 'articles');
const extractsDirectory = join(workDirectory, 'extracts');
const indexPath = join(projectRoot, 'scripts/ingestion/wiki-extract/index', `${tradition}.json`);
const extractKey = (sha256) => `w/${sha256}.json`;

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const writeJson = (path, value) => atomicFile(path, `${JSON.stringify(value, null, 2)}\n`);
const listIds = async (directory) =>
  (await readdir(directory).catch(() => []))
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.slice(0, -5));

async function selectedEntities() {
  const selection = await readJson(
    join(projectRoot, 'scripts/ingestion/wikimedia/discovery', `${tradition}.selection.json`),
  );
  return selection.entities.map(([id, label, , type, qid]) => ({ id, label, type, qid }));
}

async function fetchCommand() {
  await mkdir(articlesDirectory, { recursive: true });
  const done = new Set(await listIds(articlesDirectory));
  const pending = (await selectedEntities()).filter((entity) => !done.has(entity.id));
  for (const entity of pending.slice(0, limit)) {
    const titles = await sitelinkTitles(entity.qid);
    const lang = titles.pt ? 'pt' : titles.en ? 'en' : null;
    if (!lang) {
      console.log(`sem artigo: ${entity.id} (${entity.qid})`);
      continue;
    }
    const article = await fetchArticle(lang, titles[lang]);
    await writeJson(join(articlesDirectory, `${entity.id}.json`), {
      entity,
      retrievedAt: new Date().toISOString(),
      article,
    });
    console.log(`baixado: ${entity.id} ← ${article.url}`);
  }
}

/** Turns one model message into a stored draft, or reports why it was discarded. */
async function storeExtraction(record, message) {
  const { text, truncated } = articleText(record.article, maxInputChars);
  const { extraction, rejected } = verifyQuotes(parseExtraction(message), text);
  await writeJson(join(extractsDirectory, `${record.entity.id}.json`), {
    entity: record.entity,
    source: {
      url: record.article.url,
      revision: record.article.revision,
      language: record.article.lang,
      retrievedAt: record.retrievedAt,
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      truncated,
    },
    review: { by: 'assistant', model: extractionModel, status: 'draft' },
    ...extraction,
  });
  const kept = extraction.dates.length + extraction.relations.length + extraction.claims.length;
  console.log(
    `extraído: ${record.entity.id} (${kept} itens, ${rejected.length} sem trecho literal)`,
  );
}

async function pendingRecords() {
  const done = new Set(await listIds(extractsDirectory));
  const ids = (await listIds(articlesDirectory)).filter((id) => !done.has(id)).slice(0, limit);
  return Promise.all(ids.map((id) => readJson(join(articlesDirectory, `${id}.json`))));
}

async function extractCommand() {
  await mkdir(extractsDirectory, { recursive: true });
  const client = new Anthropic();
  const records = new Map((await pendingRecords()).map((record) => [record.entity.id, record]));
  const paramsFor = (record) =>
    extractionParams(record.entity, articleText(record.article, maxInputChars).text);

  if (values.sync) {
    for (const record of records.values()) {
      try {
        await storeExtraction(record, await client.messages.create(paramsFor(record)));
      } catch (error) {
        console.log(`falhou: ${record.entity.id}: ${error.message}`);
      }
    }
    return;
  }

  let batchId = values.resume;
  if (!batchId) {
    if (!records.size) return console.log('nada a extrair');
    const batch = await client.messages.batches.create({
      requests: [...records.values()].map((record) => ({
        custom_id: record.entity.id,
        params: paramsFor(record),
      })),
    });
    batchId = batch.id;
    await writeJson(join(workDirectory, 'batch.json'), {
      id: batchId,
      createdAt: batch.created_at,
    });
    console.log(
      `lote criado: ${batchId} (${records.size} pedidos; retome com --resume ${batchId})`,
    );
  }
  for (;;) {
    const batch = await client.messages.batches.retrieve(batchId);
    if (batch.processing_status === 'ended') break;
    console.log(`aguardando lote: ${batch.request_counts.processing} em processamento`);
    await new Promise((resolve) => setTimeout(resolve, 30_000));
  }
  for await (const result of await client.messages.batches.results(batchId)) {
    const record =
      records.get(result.custom_id) ??
      (await readJson(join(articlesDirectory, `${result.custom_id}.json`)));
    if (result.result.type !== 'succeeded') {
      console.log(`falhou: ${result.custom_id}: ${result.result.type}`);
      continue;
    }
    try {
      await storeExtraction(record, result.result.message);
    } catch (error) {
      console.log(`descartado: ${result.custom_id}: ${error.message}`);
    }
  }
}

async function publishCommand() {
  const dryRun = values['dry-run'];
  const config = await loadR2Config().catch((error) => {
    if (!dryRun) throw error;
    console.log(`[dry-run] sem credenciais: ${error.message}`);
    return null;
  });
  const entries = {};
  for (const id of (await listIds(extractsDirectory)).sort()) {
    const body = await readFile(join(extractsDirectory, `${id}.json`));
    const sha256 = sha256Hex(body);
    await putImmutable(
      config,
      { key: extractKey(sha256), body, contentType: 'application/json' },
      { dryRun },
    );
    entries[id] = { key: extractKey(sha256), sha256, bytes: body.byteLength };
  }
  if (dryRun) return console.log(`[dry-run] ${Object.keys(entries).length} extrações`);
  await mkdir(join(indexPath, '..'), { recursive: true });
  await writeFile(indexPath, `${JSON.stringify({ tradition, entries }, null, 2)}\n`);
  console.log(`índice atualizado: ${indexPath.slice(projectRoot.length)}`);
}

const commands = { fetch: fetchCommand, extract: extractCommand, publish: publishCommand };
commands[command]().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
