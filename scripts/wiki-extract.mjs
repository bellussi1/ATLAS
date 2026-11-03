#!/usr/bin/env node
// Wikipedia → Claude Haiku → R2. Usage:
//   node scripts/wiki-extract.mjs run <tradição> [--accept-top N] [--sync]  # discover + fetch + extract
//   node scripts/wiki-extract.mjs discover <tradição> [--top N] [--accept-top N]
//   node scripts/wiki-extract.mjs text <tradição> [--chars N]     # exporta o texto lido, por seção
//   node scripts/wiki-extract.mjs store <tradição> [--chars N]    # grava manual/<id>.json verificado
//   node scripts/wiki-extract.mjs fetch <tradição> [--candidates] [--limit N]
//   node scripts/wiki-extract.mjs extract <tradição> [--sync] [--limit N] [--resume <batchId>]
// Candidates with `"decision": "accept"` are fetched by `fetch --candidates`. Decisions made by the
// editor (`decidedBy: "editor"`) survive re-running discover; rule-based ones are recomputed.
// Extractions are drafts reviewed by `assistant` (AI); they do not enter the site build.
import { mkdir, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import Anthropic from '@anthropic-ai/sdk';

import {
  atomicFile,
  loadR2DraftsConfig,
  projectRoot,
  putImmutable,
  r2,
  sha256Hex,
} from './content/r2-content.mjs';
import {
  articleText,
  fetchArticle,
  parseWikiUrl,
  resolveTitle,
  sitelinkTitles,
} from './ingestion/wiki-extract/article.mjs';
import { linkedArticles, rankCandidates } from './ingestion/wiki-extract/discovery.mjs';
import {
  extractionModel,
  extractionParams,
  extractionSchema,
  maxInputChars,
  parseExtraction,
  verifyQuotes,
} from './ingestion/wiki-extract/extraction.mjs';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    limit: { type: 'string' },
    top: { type: 'string' },
    'accept-top': { type: 'string' },
    chars: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    candidates: { type: 'boolean', default: false },
    sync: { type: 'boolean', default: false },
    resume: { type: 'string' },
  },
});
const [command, tradition] = positionals;
const commandNames = ['discover', 'fetch', 'text', 'store', 'extract', 'run', 'publish-drafts'];
if (!commandNames.includes(command) || !/^[a-z-]+$/.test(tradition ?? ''))
  throw new Error(`Uso: wiki-extract.mjs <${commandNames.join('|')}> <tradição>`);
const limit = values.limit ? Number(values.limit) : Number.POSITIVE_INFINITY;

const workDirectory = join(projectRoot, 'generated/wiki-extract', tradition);
const articlesDirectory = join(workDirectory, 'articles');
const extractsDirectory = join(workDirectory, 'extracts');
const textDirectory = join(workDirectory, 'text');
const manualDirectory = join(workDirectory, 'manual');
const textChars = values.chars ? Number(values.chars) : maxInputChars;
const candidatesPath = join(
  projectRoot,
  'scripts/ingestion/wiki-extract/candidates',
  `${tradition}.json`,
);
const seedsPath = join(projectRoot, 'scripts/ingestion/wiki-extract/seeds', `${tradition}.json`);

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

const slug = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Lang and title are known for accepted candidates; selected entities resolve them via Wikidata. */
async function resolveArticle(target) {
  if (target.lang) return { lang: target.lang, title: target.title };
  const titles = await sitelinkTitles(target.entity.qid);
  const lang = titles.pt ? 'pt' : titles.en ? 'en' : null;
  return lang ? { lang, title: titles[lang] } : null;
}

async function selectedTargets() {
  return (await selectedEntities()).map((entity) => ({ entity, lang: null, title: null }));
}

async function acceptedTargets() {
  const { candidates } = await readJson(candidatesPath);
  return candidates
    .filter((candidate) => candidate.decision === 'accept')
    .map((candidate) => ({
      entity: {
        id: `topic-${slug(candidate.title)}`,
        label: candidate.title,
        type: 'topic',
        qid: candidate.qid,
      },
      lang: candidate.lang,
      title: candidate.title,
    }));
}

async function fetchCommand() {
  await mkdir(articlesDirectory, { recursive: true });
  const done = new Set(await listIds(articlesDirectory));
  const targets = values.candidates ? await acceptedTargets() : await selectedTargets();
  const pending = targets.filter((target) => !done.has(target.entity.id));
  for (const target of pending.slice(0, limit)) {
    const { entity } = target;
    const resolved = await resolveArticle(target);
    if (!resolved) {
      console.log(`sem artigo: ${entity.id} (${entity.qid})`);
      continue;
    }
    const article = await fetchArticle(resolved.lang, resolved.title);
    await writeJson(join(articlesDirectory, `${entity.id}.json`), {
      entity,
      retrievedAt: new Date().toISOString(),
      article,
    });
    console.log(`baixado: ${entity.id} ← ${article.url}`);
  }
}

/** Seeds are the selected entities' articles plus the editor's topics, given as URLs or titles. */
async function seedArticles() {
  const seeds = [];
  for (const entity of await selectedEntities()) {
    const resolved = await resolveArticle({ entity });
    if (resolved)
      seeds.push({ label: entity.label, qid: entity.qid, origin: 'entity', ...resolved });
    else console.log(`sem artigo: ${entity.id}`);
  }
  const topics = await readJson(seedsPath).then(
    (file) => file.topics,
    () => [],
  );
  for (const topic of topics) {
    const { lang, title } = topic.url ? parseWikiUrl(topic.url) : topic;
    const resolved = await resolveTitle(lang, title);
    if (!resolved) throw new Error(`Tópico inexistente: ${lang}:${title}`);
    seeds.push({ label: resolved.title, origin: 'topic', ...resolved });
  }
  return seeds;
}

const sameArticle = (a, b) =>
  (a.qid && a.qid === b.qid) || `${a.lang}:${a.title}` === `${b.lang}:${b.title}`;

/** Re-running discover keeps the editor's decisions and recomputes the rule-based ones. */
async function previousEditorDecisions() {
  const previous = await readJson(candidatesPath).then(
    (file) => file.candidates,
    () => [],
  );
  return previous.filter((candidate) => candidate.decidedBy === 'editor');
}

async function discoverCommand() {
  const seeds = await seedArticles();
  const linked = [];
  for (const seed of seeds) {
    const links = await linkedArticles(seed.lang, seed.title);
    linked.push({ seed, links });
    console.log(`links: ${seed.label} → ${links.length}`);
  }
  const ranked = rankCandidates(linked, { top: values.top ? Number(values.top) : 60 });
  const topicCandidates = seeds
    .filter((seed) => seed.origin === 'topic')
    .map(({ lang, title, qid }) => ({
      lang,
      title,
      qid,
      sharedByCount: 0,
      linkedFrom: [],
      decision: 'accept',
      decidedBy: 'seed',
    }));
  const editorDecisions = await previousEditorDecisions();
  const candidates = [...topicCandidates, ...ranked].map((candidate) => {
    const editor = editorDecisions.find((previous) => sameArticle(previous, candidate));
    return editor ? { ...candidate, decision: editor.decision, decidedBy: 'editor' } : candidate;
  });
  const acceptTop = values['accept-top'] ? Number(values['accept-top']) : 0;
  let accepted = 0;
  for (const candidate of candidates) {
    if (candidate.decision !== null || accepted >= acceptTop) continue;
    Object.assign(candidate, { decision: 'accept', decidedBy: `rule:top-${acceptTop}` });
    accepted += 1;
  }
  await writeJson(candidatesPath, {
    tradition,
    generatedAt: new Date().toISOString(),
    seeds: seeds.map(({ label, lang, title }) => ({ label, lang, title })),
    candidates,
  });
  const total = candidates.filter((candidate) => candidate.decision === 'accept').length;
  console.log(
    `${candidates.length} candidatos, ${total} aceitos, em ${candidatesPath.slice(projectRoot.length)}`,
  );
  for (const candidate of candidates.slice(0, 20))
    console.log(
      `  [${candidate.decision ?? '-'}] ${candidate.sharedByCount}× ${candidate.lang}:${candidate.title}`,
    );
}

/** Fails before any network call when the extraction cannot authenticate. */
function requireApiKey() {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN)
    throw new Error('Defina ANTHROPIC_API_KEY no ambiente antes de extrair.');
}

/** Discover, fetch accepted candidates, then extract: the whole sweep for one tradition. */
async function runCommand() {
  requireApiKey();
  await discoverCommand();
  values.candidates = true;
  await fetchCommand();
  await extractCommand();
}

/** Writes one draft; quotes that are not literal in the source text are dropped and reported. */
async function writeDraft(record, extraction, { text, coverage }, review) {
  const verified = verifyQuotes(extraction, text);
  await writeJson(join(extractsDirectory, `${record.entity.id}.json`), {
    entity: record.entity,
    source: {
      url: record.article.url,
      revision: record.article.revision,
      language: record.article.lang,
      retrievedAt: record.retrievedAt,
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      coverage,
    },
    review,
    ...verified.extraction,
  });
  const { dates, relations, claims } = verified.extraction;
  const kept = dates.length + relations.length + claims.length;
  console.log(
    `extraído: ${record.entity.id} (${kept} itens, ${verified.rejected.length} sem trecho literal)`,
  );
}

/** API path: parses the model message and stores it as a draft. */
async function storeExtraction(record, message) {
  await writeDraft(record, parseExtraction(message), articleText(record.article, maxInputChars), {
    by: 'assistant',
    model: extractionModel,
    status: 'draft',
  });
}

const unitLabel = ({ section, heading, part, parts }) =>
  `[${section}] ${heading || 'Introdução'}${parts > 1 ? ` (parte ${part}/${parts})` : ''}`;

/** Chat path: exports the text the assistant reads, with the sections it covers and those it leaves out. */
async function textCommand() {
  await mkdir(textDirectory, { recursive: true });
  for (const id of (await listIds(articlesDirectory)).slice(0, limit)) {
    const record = await readJson(join(articlesDirectory, `${id}.json`));
    const { article } = record;
    const { text, coverage } = articleText(article, textChars);
    const header = [
      `# ${article.title} (${article.lang}), revisão ${article.revision}`,
      `Limite: ${coverage.maxChars} caracteres. Lidas: ${coverage.read.map(unitLabel).join('; ') || 'nenhuma'}.`,
    ];
    if (coverage.skipped.length)
      header.push(`NÃO LIDAS neste texto: ${coverage.skipped.map(unitLabel).join('; ')}.`);
    await atomicFile(join(textDirectory, `${id}.txt`), `${header.join('\n')}\n\n${text}\n`);
    console.log(
      `texto: ${id} (${text.length} caracteres; ${coverage.read.length} de ${coverage.read.length + coverage.skipped.length} unidades lidas)`,
    );
  }
}

/** Chat path: validates `manual/<id>.json` written by the assistant, then stores it as a draft. */
async function storeCommand() {
  await mkdir(extractsDirectory, { recursive: true });
  for (const id of (await listIds(manualDirectory)).slice(0, limit)) {
    const record = await readJson(join(articlesDirectory, `${id}.json`));
    const extraction = extractionSchema.parse(await readJson(join(manualDirectory, `${id}.json`)));
    await writeDraft(record, extraction, articleText(record.article, textChars), {
      by: 'assistant',
      model: 'assistente-chat',
      method: 'chat',
      status: 'draft',
    });
  }
}

/** Uploads the drafts to the private atlas-drafts bucket: content-addressed objects plus a mutable index. */
async function publishDraftsCommand() {
  const dryRun = values['dry-run'];
  const config = await loadR2DraftsConfig().catch((error) => {
    if (!dryRun) throw error;
    console.log(`[dry-run] sem credenciais: ${error.message}`);
    return null;
  });
  const prefix = `wiki/${tradition}`;
  const entries = {};
  for (const id of (await listIds(extractsDirectory)).sort()) {
    const body = await readFile(join(extractsDirectory, `${id}.json`));
    const sha256 = sha256Hex(body);
    const key = `${prefix}/${sha256}.json`;
    await putImmutable(config, { key, body, contentType: 'application/json' }, { dryRun });
    entries[id] = { key, sha256, bytes: body.byteLength };
  }
  if (dryRun) return console.log(`[dry-run] ${Object.keys(entries).length} rascunhos`);
  const index = Buffer.from(
    `${JSON.stringify({ tradition, publishedAt: new Date().toISOString(), entries }, null, 2)}\n`,
  );
  const put = await r2(config, 'PUT', `${prefix}/index.json`, {
    body: index,
    contentType: 'application/json',
    cacheControl: 'no-cache',
  });
  if (!put.ok) throw new Error(`Falha ao publicar índice: HTTP ${put.status}`);
  console.log(`índice publicado: ${config.bucket}/${prefix}/index.json`);
}

async function pendingRecords() {
  const done = new Set(await listIds(extractsDirectory));
  const ids = (await listIds(articlesDirectory)).filter((id) => !done.has(id)).slice(0, limit);
  return Promise.all(ids.map((id) => readJson(join(articlesDirectory, `${id}.json`))));
}

async function extractCommand() {
  requireApiKey();
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

const commands = {
  discover: discoverCommand,
  fetch: fetchCommand,
  text: textCommand,
  store: storeCommand,
  extract: extractCommand,
  run: runCommand,
  'publish-drafts': publishDraftsCommand,
};
commands[command]().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
