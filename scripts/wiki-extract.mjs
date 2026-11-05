#!/usr/bin/env node
// Wikipedia → Claude Haiku → R2. Usage:
//   node scripts/wiki-extract.mjs discover <tradição> [--top N] [--accept-top N] [--min-shared N] [--replay <captura>]
//   node scripts/wiki-extract.mjs text <tradição> [--chars N]     # exporta o texto lido, por seção
//   node scripts/wiki-extract.mjs store <tradição> [--chars N]    # grava manual/<id>.json verificado
//   node scripts/wiki-extract.mjs fetch <tradição> [--candidates] [--limit N] [--refresh] [--replay <captura>]
//   node scripts/wiki-extract.mjs fetch <tradição> --url <artigo pt/en da Wikipedia>  # um artigo avulso
// Extraction with the API lives in scripts/tradicao/extract.mjs (npm run tradicao:extract), which has a
// spending cap, dry run and resume. `extract` and `run` here stop and point to it.
// Candidates with `"decision": "accept"` are fetched by `fetch --candidates`. Decisions made by the
// editor (`decidedBy: "editor"`) survive re-running discover; rule-based ones are recomputed.
// Discover also proposes the typed targets that the articles already read link to (`origin:
// "mention"`), so a second discover after a fetch widens the list. Mentions are not relations.
// Every command that reads Wikipedia or Wikidata saves its responses as a capture under
// scripts/ingestion/wiki-extract/raw/<tradição>/<instante>/ (manifest versioned, bodies local).
// `--replay <captura>` reproduces discover or fetch from that capture without network access.
// Extractions are drafts reviewed by `assistant` (AI); they do not enter the site build.
import { mkdir, readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';

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
import {
  articleKeys,
  linkedArticles,
  mentionTypes,
  rankCandidates,
  rankMentions,
} from './ingestion/wiki-extract/discovery.mjs';
import { liveHttp, recordingHttp, replayHttp } from './ingestion/wiki-extract/http.mjs';
import { loadCapture, saveCapture, wikiRawRoot } from './ingestion/wiki-extract/raw.mjs';
import { classifyQids, classifyReport, targetKind } from './ingestion/wiki-extract/targets.mjs';
import {
  extractionSchema,
  maxInputChars,
  verifyQuotes,
} from './ingestion/wiki-extract/extraction.mjs';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    limit: { type: 'string' },
    top: { type: 'string' },
    'accept-top': { type: 'string' },
    'min-shared': { type: 'string' },
    chars: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    candidates: { type: 'boolean', default: false },
    refresh: { type: 'boolean', default: false },
    url: { type: 'string' },
    replay: { type: 'string' },
  },
});
const [command, tradition] = positionals;
const commandNames = ['discover', 'fetch', 'text', 'store', 'extract', 'run', 'publish-drafts'];
if (!commandNames.includes(command) || !/^[a-z-]+$/.test(tradition ?? ''))
  throw new Error(`Uso: wiki-extract.mjs <${commandNames.join('|')}> <tradição>`);
const limit = values.limit ? Number(values.limit) : Number.POSITIVE_INFINITY;
const minShared = values['min-shared'] ? Number(values['min-shared']) : 2;

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

/** Network access of this run: live and recorded, or replayed from one capture of this tradition. */
const networkCommands = ['discover', 'fetch'];
if (values.replay && !['discover', 'fetch'].includes(command))
  throw new Error('--replay só vale para discover e fetch.');
if (values.replay && !/^[\w.-]+$/.test(values.replay))
  throw new Error(`Captura inválida: ${values.replay}`);
const recorder = values.replay ? null : recordingHttp(liveHttp);
const http = values.replay
  ? replayHttp((await loadCapture(join(wikiRawRoot, tradition, values.replay))).responses)
  : recorder.http;

/** Entities chosen by the Wikidata selection; a tradition without one is seeded by its topics only. */
async function selectedEntities() {
  const selection = await readJson(
    join(projectRoot, 'scripts/ingestion/wikimedia/discovery', `${tradition}.selection.json`),
  ).catch((error) => {
    if (error.code === 'ENOENT') return { entities: [] };
    throw error;
  });
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
  const titles = await sitelinkTitles(target.entity.qid, http);
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
        // Mentions carry the type their Wikidata item had when the article was read.
        type: candidate.type ?? 'topic',
        qid: candidate.qid,
      },
      lang: candidate.lang,
      title: candidate.title,
    }));
}

/** One article chosen by URL, outside the seeds and candidates; typed by its own Wikidata item. */
async function fetchUrlCommand() {
  const { lang, title } = parseWikiUrl(values.url);
  const article = await fetchArticle(lang, title, http);
  const stored = await Promise.all(
    (await listIds(articlesDirectory)).map((id) => readJson(join(articlesDirectory, `${id}.json`))),
  );
  const existing = stored.find((record) => sameArticle(record.article, article));
  if (existing) return console.log(`já baixado: ${existing.entity.id}`);
  const { kinds, classification } = await classifyReport(article.qid ? [article.qid] : [], (qids) =>
    classifyQids(qids, http),
  );
  const kind = targetKind({ title: article.title, qid: article.qid, missing: false }, kinds);
  const prefix = kind.type === 'sem-item' ? 'topic' : kind.type;
  const entity = {
    id: `${slug(prefix)}-${slug(article.title)}`,
    label: article.title,
    type: kind.type,
    qid: article.qid,
    classes: kind.classes,
    classification,
  };
  await writeJson(join(articlesDirectory, `${entity.id}.json`), {
    entity,
    retrievedAt: new Date().toISOString(),
    article,
  });
  const redirected = article.redirectedFrom ? ` (redirecionado de ${article.redirectedFrom})` : '';
  console.log(`baixado: ${entity.id} ← ${article.url}${redirected}`);
}

async function fetchCommand() {
  await mkdir(articlesDirectory, { recursive: true });
  if (values.url) return fetchUrlCommand();
  // Older articles lack body links and targets, so their relations cannot resolve to a QID.
  const stored = await Promise.all(
    (await listIds(articlesDirectory)).map(async (id) => ({
      id,
      current: Array.isArray(
        (await readJson(join(articlesDirectory, `${id}.json`))).article.targets,
      ),
    })),
  );
  const done = new Set(
    stored.filter((item) => !values.refresh || item.current).map((item) => item.id),
  );
  const targets = values.candidates ? await acceptedTargets() : await selectedTargets();
  const pending = targets.filter((target) => !done.has(target.entity.id));
  for (const target of pending.slice(0, limit)) {
    const { entity } = target;
    const resolved = await resolveArticle(target);
    if (!resolved) {
      console.log(`sem artigo: ${entity.id} (${entity.qid})`);
      continue;
    }
    const article = await fetchArticle(resolved.lang, resolved.title, http);
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
    const resolved = await resolveTitle(lang, title, http);
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

/** Articles already read by fetch, as stored: the source of the mention candidates. */
async function storedArticles() {
  const records = await Promise.all(
    (await listIds(articlesDirectory)).map((id) => readJson(join(articlesDirectory, `${id}.json`))),
  );
  return records.map((record) => record.article);
}

async function discoverCommand() {
  const seeds = await seedArticles();
  const linked = [];
  for (const seed of seeds) {
    const links = await linkedArticles(seed.lang, seed.title, { http });
    linked.push({ seed, links });
    console.log(`links: ${seed.label} → ${links.length}`);
  }
  const top = values.top ? Number(values.top) : 60;
  // Authority records and catalogues are linked from most articles (templates), so every ranked
  // candidate is typed by Wikidata first; only typed topics are accepted by rule.
  const ranked = rankCandidates(linked, { top, minShared });
  const { kinds } = await classifyReport(
    ranked.flatMap((candidate) => (candidate.qid ? [candidate.qid] : [])),
    (qids) => classifyQids(qids, http),
  );
  for (const candidate of ranked)
    candidate.type = targetKind(
      { title: candidate.title, qid: candidate.qid, missing: false },
      kinds,
    ).type;
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
  const known = [...seeds, ...ranked].flatMap((candidate) => articleKeys(candidate));
  const mentions = rankMentions(await storedArticles(), {
    minShared,
    top,
    excluded: new Set(known),
  });
  const editorDecisions = await previousEditorDecisions();
  const candidates = [...topicCandidates, ...ranked, ...mentions].map((candidate) => {
    const editor = editorDecisions.find((previous) => sameArticle(previous, candidate));
    return editor ? { ...candidate, decision: editor.decision, decidedBy: 'editor' } : candidate;
  });
  const acceptTop = values['accept-top'] ? Number(values['accept-top']) : 0;
  let accepted = 0;
  for (const candidate of candidates) {
    if (candidate.decision !== null || accepted >= acceptTop) continue;
    if (!mentionTypes.has(candidate.type)) continue;
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
    `${candidates.length} candidatos (${mentions.length} menções), ${total} aceitos, em ${relative(projectRoot, candidatesPath)}`,
  );
  for (const candidate of candidates.slice(0, 20))
    console.log(
      `  [${candidate.decision ?? '-'}] ${candidate.sharedByCount}× ${candidate.lang}:${candidate.title}${candidate.origin === 'mention' ? ` (${candidate.type})` : ''}`,
    );
}

/** The old paid path had no cap. Fail before anything is sent and say where the capped one is. */
function paidPathMoved() {
  throw new Error(
    `Extração pela API agora é: npm run tradicao:extract -- ${tradition} --dry-run (tem teto de gasto e retomada).`,
  );
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

const commands = {
  discover: discoverCommand,
  fetch: fetchCommand,
  text: textCommand,
  store: storeCommand,
  extract: paidPathMoved,
  run: paidPathMoved,
  'publish-drafts': publishDraftsCommand,
};
try {
  await commands[command]();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  // Responses are kept even when the command failed part-way, so the partial run can be replayed.
  if (recorder?.responses.size && networkCommands.includes(command)) {
    const directory = await saveCapture(tradition, recorder.responses);
    console.log(
      `captura: ${relative(projectRoot, directory)} (${recorder.responses.size} respostas)`,
    );
  }
}
