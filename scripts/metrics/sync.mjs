import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const POPULARITY = resolve(root, 'metrics/popularity.json');
const HISTORY_DIR = resolve(root, 'metrics/history');
const ROUTE = /^\/(leitura|itinerario|verbete|acervo)(\/|$)/;

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

export function buildPopularity(goat, cloudflare, date = new Date()) {
  const routes = mergeCloudflare(mergeGoatCounter({}, goat), cloudflare);
  return {
    generatedAt: date.toISOString().slice(0, 10),
    windowDays: 30,
    source: 'goatcounter+cloudflare',
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

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const date = new Date();
  let goat;
  let cloudflare;
  if (dryRun) {
    goat = await readJson(resolve(here, 'fixtures/goatcounter-hits.json'));
    cloudflare = await readJson(resolve(here, 'fixtures/cloudflare-rum.json'));
  } else {
    const site = process.env.GOATCOUNTER_SITE;
    const goatKey = process.env.GOATCOUNTER_API_KEY;
    const cfToken = process.env.CLOUDFLARE_API_TOKEN;
    const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!site || !goatKey)
      throw new Error('GOATCOUNTER_SITE e GOATCOUNTER_API_KEY são obrigatórios.');
    if (!cfToken || !cfAccount)
      throw new Error('CLOUDFLARE_API_TOKEN e CLOUDFLARE_ACCOUNT_ID são obrigatórios.');
    const start = new Date(date);
    start.setUTCDate(start.getUTCDate() - 30);
    const from = start.toISOString().slice(0, 10);
    const to = date.toISOString().slice(0, 10);
    const base = /^https?:\/\//.test(site)
      ? site.replace(/\/$/, '')
      : `https://${site}.goatcounter.com`;
    goat = await fetchJson(`${base}/api/v0/stats/hits?start=${from}&end=${to}&limit=1000`, {
      headers: { Authorization: `Bearer ${goatKey}`, 'Content-Type': 'application/json' },
    });
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
  }
  const data = buildPopularity(goat, cloudflare, date);
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
