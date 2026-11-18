import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const POPULARITY = resolve(root, 'metrics/popularity.json');
const HISTORY_DIR = resolve(root, 'metrics/history');
const ROUTE = /^\/(leitura|itinerario|verbete|acervo)\/[^/]+$/;

export function normalizeRoute(path) {
  if (!path) return '/';
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, '');
  return clean || '/';
}

export function emptyRoute() {
  return { visitors: 0, views: 0, clicks: 0 };
}

/** GoatCounter returns hits with `path` and `count`; events use `click:` paths. */
export function mergeGoatCounter(routes, payload) {
  const hits = Array.isArray(payload) ? payload : (payload?.hits ?? []);
  for (const hit of hits) {
    const raw = String(hit.path ?? hit.path_id ?? '');
    const count = Number(hit.count ?? hit.visitors ?? hit.views ?? 0);
    if (!raw || !Number.isFinite(count)) continue;
    if (raw.startsWith('click:')) {
      const target = normalizeRoute(raw.slice('click:'.length));
      if (!ROUTE.test(target)) continue;
      routes[target] ??= emptyRoute();
      routes[target].clicks += count;
      continue;
    }
    const path = normalizeRoute(raw);
    if (!ROUTE.test(path)) continue;
    routes[path] ??= emptyRoute();
    routes[path].visitors += count;
  }
  return routes;
}

export function mergeCloudflare(routes, payload) {
  const groups = payload?.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups ?? [];
  for (const group of groups) {
    const path = normalizeRoute(group.dimensions?.requestPath ?? '');
    if (!ROUTE.test(path)) continue;
    routes[path] ??= emptyRoute();
    routes[path].views += Number(group.count ?? 0);
    if (Number.isFinite(Number(group.sum?.visits)) && !routes[path].visitors)
      routes[path].visitors = Number(group.sum.visits);
  }
  return routes;
}

export function buildPopularity(
  goat,
  cloudflare,
  date = new Date(),
  source = 'goatcounter+cloudflare',
) {
  const routes = mergeCloudflare(mergeGoatCounter({}, goat), cloudflare);
  return {
    generatedAt: date.toISOString().slice(0, 10),
    windowDays: 30,
    source,
    routes,
  };
}

function lastMonth(date) {
  return date.toISOString().slice(0, 7);
}

export async function recordHistory(data, date = new Date()) {
  await mkdir(HISTORY_DIR, { recursive: true });
  const file = resolve(HISTORY_DIR, `${lastMonth(date)}.json`);
  let days = [];
  try {
    days = JSON.parse(await readFile(file, 'utf8')).days ?? [];
  } catch {}
  const index = days.findIndex((day) => day.date === data.generatedAt);
  const entry = { date: data.generatedAt, routes: data.routes };
  if (index === -1) days.push(entry);
  else days[index] = entry;
  await writeFile(file, `${JSON.stringify({ days }, null, 2)}\n`);
}

async function loadEnvFallback() {
  const file = process.env.ATLAS_R2_ENV_FILE ?? join(homedir(), '.atlas', 'r2.env');
  let raw = '';
  try {
    raw = await readFile(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
  const values = {};
  for (const lineRaw of raw.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = lineRaw.trim().replace(/^export\s+/, '');
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    values[line.slice(0, eq).trim()] = line
      .slice(eq + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, '$2');
  }
  return values;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

/**
 * GoatCounter API v0 caps `limit` at 100 in `/api/v0/stats/hits` and paginates via `exclude_paths`.
 */
export async function fetchGoatCounterHits(
  base,
  goatKey,
  from,
  to,
  { fetchImpl = fetchJson, maxPages = 5, delayMs = 300 } = {},
) {
  const cleanBase = /^https?:\/\//.test(base)
    ? base.replace(/\/$/, '')
    : `https://${base}.goatcounter.com`;
  const headers = { Authorization: `Bearer ${goatKey}`, 'Content-Type': 'application/json' };
  const allHits = [];
  const seenIds = [];

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    if (pageIndex > 0 && delayMs > 0) await sleep(delayMs);
    const params = new URLSearchParams({ start: from, end: to, limit: '100' });
    for (const id of seenIds) params.append('exclude_paths', String(id));
    const page = await fetchImpl(`${cleanBase}/api/v0/stats/hits?${params.toString()}`, {
      headers,
    });
    const hits = Array.isArray(page?.hits) ? page.hits : [];
    if (hits.length === 0) break;
    allHits.push(...hits);
    for (const hit of hits) {
      if (Number.isInteger(hit?.path_id) && !seenIds.includes(hit.path_id)) {
        seenIds.push(hit.path_id);
      }
    }
    if (!page?.more) break;
  }

  return { hits: allHits };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const date = new Date();
  let goat = {};
  let cloudflare = {};
  let source = 'goatcounter+cloudflare';
  if (dryRun) {
    goat = await readJson(resolve(here, 'fixtures/goatcounter-hits.json'));
    cloudflare = await readJson(resolve(here, 'fixtures/cloudflare-rum.json'));
  } else {
    const fileEnv = await loadEnvFallback();
    const pick = (...names) =>
      names.map((name) => process.env[name]?.trim()).find(Boolean) ||
      names.map((name) => fileEnv[name]?.trim()).find(Boolean) ||
      '';
    const site = pick('GOATCOUNTER_SITE');
    const goatKey = pick('GOATCOUNTER_API_KEY');
    const cfToken = pick('CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ANALYTICS_API_TOKEN');
    const cfAccount = pick('CLOUDFLARE_ACCOUNT_ID', 'R2_ACCOUNT_ID');
    const hasGoat = Boolean(site && goatKey);
    const hasCf = Boolean(cfToken && cfAccount);
    if (!hasGoat && !hasCf) {
      throw new Error(
        'Informe GoatCounter (GOATCOUNTER_SITE + GOATCOUNTER_API_KEY) ou Cloudflare (CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID).',
      );
    }
    const start = new Date(date);
    start.setUTCDate(start.getUTCDate() - 30);
    const from = start.toISOString().slice(0, 10);
    const to = date.toISOString().slice(0, 10);
    if (hasGoat) {
      goat = await fetchGoatCounterHits(site, goatKey, from, to);
    }
    if (hasCf) {
      cloudflare = await fetchJson('https://api.cloudflare.com/client/v4/graphql', {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query($account: String!, $start: Date!, $end: Date!) {
          viewer { accounts(filter: { accountTag: $account }) {
            rumPageloadEventsAdaptiveGroups(limit: 1000, filter: { date_geq: $start, date_leq: $end }, orderBy: [count_DESC]) {
              count
              sum { visits }
              dimensions { requestPath }
            }
          } }
        }`,
          variables: { account: cfAccount, start: from, end: to },
        }),
      });
      if (cloudflare?.errors?.length) {
        throw new Error(cloudflare.errors.map((err) => err.message).join('; '));
      }
    }
    source = [hasGoat && 'goatcounter', hasCf && 'cloudflare'].filter(Boolean).join('+');
  }
  const data = buildPopularity(goat, cloudflare, date, source);
  const target = dryRun ? resolve(root, 'generated/metrics/popularity.json') : POPULARITY;
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(data, null, 2)}\n`);
  if (!dryRun) await recordHistory(data, date);
  console.log(
    `${dryRun ? 'simulação' : 'métricas'} ${data.generatedAt}: ${Object.keys(data.routes).length} rotas em ${target}`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
