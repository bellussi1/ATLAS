#!/usr/bin/env node
/**
 * Descoberta de novas fontes públicas para o corpus Firecrawl Local.
 *
 *   node scripts/ingestion/firecrawl/discover.mjs [--topic <id>] [--limit N]
 *     [--apply] [--apply-limit N] [--min-score N] [--dry-run]
 *     [--no-wikidata] [--no-wikipedia] [--no-marxists]
 *
 * Lê `topics.json`, consulta Wikidata, Wikipédia (pt/en) e índices do Marxists Internet
 * Archive, e grava candidatos em `generated/firecrawl-discovery/candidates.json`.
 * Nada entra no corpus sem `--apply` (que só acrescenta seeds marcados como
 * `origin: "discovery"` e `review: "pending"`) e sem extração local posterior.
 *
 * O acesso à Wikimedia passa pelo cliente compartilhado de `scripts/ingestion/wikimedia`,
 * que limita a taxa e só aceita hosts permitidos.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { z } from 'zod';

import { getJson } from '../wikimedia/client.mjs';
import { classify, fetchEntities, searchIds } from '../wikimedia/discovery.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const projectRoot = resolve(here, '../../..');
export const defaultTopicsPath = join(here, 'topics.json');
export const defaultSeedsPath = join(here, 'seeds.json');
export const defaultOutputPath = join(
  projectRoot,
  'generated',
  'firecrawl-discovery',
  'candidates.json',
);

const WIKIPEDIA_LANGUAGES = {
  pt: { host: 'pt.wikipedia.org', language: 'pt-BR', sourceName: 'Wikipédia (pt)' },
  en: { host: 'en.wikipedia.org', language: 'en', sourceName: 'Wikipédia (en)' },
};

const WIKIDATA_PROPERTIES = ['P1142', 'P921', 'P279'];
const ALLOWED_KINDS = new Set(['person', 'work', 'organization', 'event', 'ideology', 'concept']);

export const topicSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  domain: z.enum([
    'filosofia-politica',
    'sociologia',
    'historia-brasil',
    'historia-mundial',
    'documento-primario',
  ]),
  atlasGap: z.string().min(1),
  wikidata: z
    .array(z.string().regex(/^Q\d+$/))
    .optional()
    .default([]),
  wikipedia: z
    .object({
      pt: z.array(z.string().min(1)).optional(),
      en: z.array(z.string().min(1)).optional(),
    })
    .optional()
    .default({}),
  categories: z
    .object({
      pt: z.array(z.string().min(1)).optional(),
      en: z.array(z.string().min(1)).optional(),
    })
    .optional()
    .default({}),
  marxists: z
    .array(z.url({ protocol: /^https$/ }))
    .optional()
    .default([]),
});

export const topicsFileSchema = z.object({
  schemaVersion: z.literal(1),
  description: z.string().min(1),
  topics: z.array(topicSchema).min(1),
});

export const candidateSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  domain: topicSchema.shape.domain,
  language: z.enum(['pt-BR', 'en']),
  sourceName: z.string().min(1),
  url: z.url({ protocol: /^https$/ }),
  license: z.string().min(1),
  usagePolicy: z.enum(['open-reuse', 'reference-only']),
  atlasGap: z.string().min(1),
  topicId: z.string().min(1),
  origin: z.literal('discovery'),
  discoveredFrom: z.string().min(1),
  discoveredAt: z.string().min(1),
  score: z.number().int().min(0).max(100),
  kind: z.string().min(1).optional(),
  pageLength: z.number().int().nonnegative().optional(),
});

/** Converte um título de artigo em sufixo de slug estável. */
export function slugifyTitle(title) {
  return String(title)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** URL canônica de artigo na Wikipédia, com espaços convertidos em sublinhado. */
export function wikipediaUrl(lang, title) {
  const host = WIKIPEDIA_LANGUAGES[lang]?.host;
  if (!host) throw new Error(`Idioma de Wikipédia não suportado: ${lang}`);
  return `https://${host}/wiki/${encodeURIComponent(String(title).trim().replace(/\s+/g, '_'))}`;
}

/** Títulos que não são artigos enciclopédicos úteis como fonte textual. */
export function isDisqualifiedTitle(title) {
  const value = String(title).trim();
  if (!value) return true;
  if (value.includes(':')) return true;
  if (/^(lista de|list of|anexo:)/i.test(value)) return true;
  if (/\((desambiguação|disambiguation)\)$/i.test(value)) return true;
  return false;
}

/**
 * Pontuação de triagem: categoria (35) e ligação direta (25) valem mais que uma
 * declaração isolada no Wikidata (20). Artigos muito curtos perdem pontos.
 */
export function scoreCandidate({
  pageLength = 0,
  viaCategory = false,
  viaLink = false,
  viaWikidata = false,
}) {
  let score = 20;
  if (viaCategory) score += 35;
  if (viaLink) score += 25;
  if (viaWikidata) score += 20;
  if (pageLength >= 2000) score += 15;
  else if (pageLength >= 1000) score += 8;
  else if (pageLength < 800) score -= 15;
  return Math.max(0, Math.min(100, score));
}

/** Converte um candidato validado no formato de seed de `seeds.json`. */
export function candidateToSeed(candidate) {
  return {
    slug: candidate.slug,
    title: candidate.title,
    domain: candidate.domain,
    language: candidate.language,
    sourceName: candidate.sourceName,
    url: candidate.url,
    license: candidate.license,
    usagePolicy: candidate.usagePolicy,
    atlasGap: candidate.atlasGap,
    origin: 'discovery',
    review: 'pending',
    discoveredFrom: candidate.discoveredFrom,
    discoveredAt: candidate.discoveredAt,
    score: candidate.score,
  };
}

/** Remove duplicatas por URL e por slug, preservando o maior score. */
export function dedupeCandidates(candidates) {
  const byUrl = new Map();
  for (const candidate of candidates) {
    const current = byUrl.get(candidate.url);
    if (!current || candidate.score > current.score) byUrl.set(candidate.url, candidate);
  }
  const seenSlugs = new Map();
  const result = [];
  for (const candidate of [...byUrl.values()].sort(
    (a, b) => b.score - a.score || a.title.localeCompare(b.title, 'pt-BR'),
  )) {
    const used = seenSlugs.get(candidate.slug) ?? 0;
    seenSlugs.set(candidate.slug, used + 1);
    result.push(used === 0 ? candidate : { ...candidate, slug: `${candidate.slug}-${used + 1}` });
  }
  return result;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function loadTopics(topicsPath = defaultTopicsPath) {
  return topicsFileSchema.parse(await readJson(topicsPath));
}

async function queryWikipedia(host, params) {
  const url = new URL(`https://${host}/w/api.php`);
  url.search = new URLSearchParams({
    format: 'json',
    formatversion: '2',
    ...params,
  }).toString();
  return getJson(url.toString());
}

/** Metadados de páginas em lotes de 50 títulos (limite da API para clientes comuns). */
export async function fetchPageInfo(lang, titles) {
  const host = WIKIPEDIA_LANGUAGES[lang]?.host;
  if (!host) throw new Error(`Idioma de Wikipédia não suportado: ${lang}`);
  const unique = [...new Set(titles.filter((title) => !isDisqualifiedTitle(title)))];
  const pages = [];
  for (let index = 0; index < unique.length; index += 50) {
    const batch = unique.slice(index, index + 50);
    const data = await queryWikipedia(host, {
      action: 'query',
      titles: batch.join('|'),
      prop: 'info|pageprops',
      ppprop: 'wikibase_item',
      inprop: 'url',
      redirects: '1',
    });
    for (const page of data.query?.pages ?? []) {
      if (page.missing) continue;
      pages.push({
        title: page.title,
        url: page.fullurl ?? wikipediaUrl(lang, page.title),
        length: Number(page.length ?? 0),
        qid: page.pageprops?.wikibase_item ?? null,
      });
    }
  }
  return pages;
}

export async function discoverCategoryMembers(lang, category, limit = 200) {
  const host = WIKIPEDIA_LANGUAGES[lang]?.host;
  if (!host) throw new Error(`Idioma de Wikipédia não suportado: ${lang}`);
  const data = await queryWikipedia(host, {
    action: 'query',
    list: 'categorymembers',
    cmtitle: category,
    cmnamespace: '0',
    cmlimit: String(Math.min(Math.max(limit, 1), 500)),
  });
  return (data.query?.categorymembers ?? [])
    .map((member) => member.title)
    .filter((title) => !isDisqualifiedTitle(title));
}

export async function discoverLinkedArticles(lang, title, limit = 200) {
  const host = WIKIPEDIA_LANGUAGES[lang]?.host;
  if (!host) throw new Error(`Idioma de Wikipédia não suportado: ${lang}`);
  const data = await queryWikipedia(host, {
    action: 'query',
    prop: 'links',
    titles: title,
    plnamespace: '0',
    pllimit: String(Math.min(Math.max(limit, 1), 500)),
    redirects: '1',
  });
  const page = (data.query?.pages ?? [])[0];
  return (page?.links ?? [])
    .map((link) => link.title)
    .filter((linkTitle) => !isDisqualifiedTitle(linkTitle));
}

/** Consulta o Wikidata por rótulos (P1142/P921/P279) e converte em artigos da Wikipédia. */
export async function discoverFromWikidata(topic, limit = 200) {
  const roots = topic.wikidata ?? [];
  if (roots.length === 0) return [];
  const ids = new Set();
  for (const root of roots) {
    for (const property of WIKIDATA_PROPERTIES) {
      const found = await searchIds(`haswbstatement:${property}=${root}`);
      for (const id of found) ids.add(id);
      if (ids.size >= limit * 2) break;
    }
  }
  if (ids.size === 0) return [];
  const entities = await fetchEntities([...ids].slice(0, Math.max(limit * 2, 50)));
  const results = [];
  for (const entity of entities.values()) {
    const kind = classify(entity, roots[0]);
    if (!ALLOWED_KINDS.has(kind)) continue;
    for (const lang of ['pt', 'en']) {
      const title = entity.sitelinks?.[`${lang}wiki`]?.title;
      if (!title || isDisqualifiedTitle(title)) continue;
      results.push({
        lang,
        title,
        qid: entity.id,
        kind,
        discoveredFrom: `wikidata:${roots.join('+')}`,
        viaWikidata: true,
      });
      break;
    }
  }
  return results.slice(0, limit);
}

/** Coleta links de índice do Marxists Internet Archive (somente leitura pública). */
export async function discoverFromMarxists(indexUrl, { limit = 120, timeoutMs = 20000 } = {}) {
  const target = new URL(indexUrl);
  if (target.protocol !== 'https:' || target.hostname !== 'www.marxists.org') {
    throw new Error(`Índice Marxists não autorizado: ${target.origin}`);
  }
  const response = await fetch(target, {
    headers: {
      'user-agent':
        'ATLAS educational project/1.0 (local discovery; https://github.com/bellussi1/ATLAS)',
      accept: 'text/html',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`Marxists index falhou (${response.status}): ${indexUrl}`);
  const html = await response.text();
  const anchors = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const results = [];
  const seen = new Set();
  for (const [, href, rawLabel] of anchors) {
    let url;
    try {
      url = new URL(href, target);
    } catch {
      continue;
    }
    if (url.protocol !== 'https:' || url.hostname !== 'www.marxists.org') continue;
    if (!url.pathname.endsWith('/index.htm')) continue;
    if (url.href === target.href) continue;
    if (seen.has(url.href)) continue;
    seen.add(url.href);
    const label = rawLabel
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
    if (label.length < 2 || label.length > 140) continue;
    results.push({
      url: url.href,
      title: label,
      discoveredFrom: `marxists-index:${indexUrl}`,
    });
    if (results.length >= limit) break;
  }
  return results;
}

/**
 * Executa a descoberta completa. Funções de rede são injetáveis para teste sem
 * tráfego externo.
 */
export async function runDiscovery({
  topicsPath = defaultTopicsPath,
  outputPath = defaultOutputPath,
  topicIds = null,
  limit = 120,
  wikipedia = true,
  wikidata = true,
  marxists = true,
  now = () => new Date().toISOString(),
  fetchPageInfoImpl = fetchPageInfo,
  discoverCategoryMembersImpl = discoverCategoryMembers,
  discoverLinkedArticlesImpl = discoverLinkedArticles,
  discoverFromWikidataImpl = discoverFromWikidata,
  discoverFromMarxistsImpl = discoverFromMarxists,
} = {}) {
  const catalog = await loadTopics(topicsPath);
  const selected = topicIds?.length
    ? catalog.topics.filter((topic) => topicIds.includes(topic.id))
    : catalog.topics;
  if (selected.length === 0) {
    throw new Error(`Nenhum tema corresponde a: ${topicIds?.join(', ')}`);
  }

  const discoveredAt = now();
  const candidates = [];
  const requests = [];

  for (const topic of selected) {
    for (const lang of ['pt', 'en']) {
      const members = new Map();
      const addMember = (title, origin) => {
        if (isDisqualifiedTitle(title)) return;
        const current = members.get(title) ?? {
          title,
          viaCategory: false,
          viaLink: false,
          viaWikidata: false,
          discoveredFrom: origin,
        };
        current.viaCategory ||= origin.startsWith('wikipedia-category:');
        current.viaLink ||= origin.startsWith('wikipedia-links:');
        current.viaWikidata ||= origin.startsWith('wikidata:');
        members.set(title, current);
      };

      if (wikipedia) {
        for (const category of topic.categories?.[lang] ?? []) {
          const titles = await discoverCategoryMembersImpl(lang, category, limit);
          requests.push({
            source: 'wikipedia-category',
            topicId: topic.id,
            lang,
            query: category,
            found: titles.length,
          });
          for (const title of titles) addMember(title, `wikipedia-category:${category}`);
        }
        for (const article of topic.wikipedia?.[lang] ?? []) {
          const titles = await discoverLinkedArticlesImpl(lang, article, limit);
          requests.push({
            source: 'wikipedia-links',
            topicId: topic.id,
            lang,
            query: article,
            found: titles.length,
          });
          for (const title of titles) addMember(title, `wikipedia-links:${article}`);
        }
      }

      if (members.size > 0) {
        const infos = await fetchPageInfoImpl(lang, [...members.keys()]);
        for (const info of infos) {
          const member = members.get(info.title) ?? members.get(info.title.replace(/_/g, ' '));
          if (!member) continue;
          candidates.push({
            slug: `wiki-${lang}-${slugifyTitle(info.title)}`,
            title: info.title,
            domain: topic.domain,
            language: WIKIPEDIA_LANGUAGES[lang].language,
            sourceName: WIKIPEDIA_LANGUAGES[lang].sourceName,
            url: info.url,
            license: 'CC BY-SA 4.0',
            usagePolicy: 'open-reuse',
            atlasGap: topic.atlasGap,
            topicId: topic.id,
            origin: 'discovery',
            discoveredFrom: member.discoveredFrom,
            discoveredAt,
            score: scoreCandidate({
              pageLength: info.length,
              viaCategory: member.viaCategory,
              viaLink: member.viaLink,
            }),
            pageLength: info.length,
          });
        }
      }
    }

    if (wikidata) {
      for (const hit of await discoverFromWikidataImpl(topic, limit)) {
        candidates.push({
          slug: `wiki-${hit.lang}-${slugifyTitle(hit.title)}`,
          title: hit.title,
          domain: topic.domain,
          language: WIKIPEDIA_LANGUAGES[hit.lang].language,
          sourceName: WIKIPEDIA_LANGUAGES[hit.lang].sourceName,
          url: wikipediaUrl(hit.lang, hit.title),
          license: 'CC BY-SA 4.0',
          usagePolicy: 'open-reuse',
          atlasGap: topic.atlasGap,
          topicId: topic.id,
          origin: 'discovery',
          discoveredFrom: hit.discoveredFrom,
          discoveredAt,
          score: scoreCandidate({ viaWikidata: true }),
          kind: hit.kind,
        });
        requests.push({
          source: 'wikidata',
          topicId: topic.id,
          query: hit.discoveredFrom,
          found: 1,
        });
      }
    }

    if (marxists) {
      for (const indexUrl of topic.marxists ?? []) {
        const hits = await discoverFromMarxistsImpl(indexUrl, { limit });
        requests.push({
          source: 'marxists-index',
          topicId: topic.id,
          query: indexUrl,
          found: hits.length,
        });
        for (const hit of hits) {
          const portugueseArchive = hit.url.includes('/portugues/');
          candidates.push({
            slug: `mia-${slugifyTitle(hit.url.replace(/^https:\/\/www\.marxists\.org\//, ''))}`,
            title: hit.title,
            domain: topic.domain,
            language: portugueseArchive ? 'pt-BR' : 'en',
            sourceName: 'Marxists Internet Archive',
            url: hit.url,
            license: 'Marxists-org-copyright',
            usagePolicy: 'reference-only',
            atlasGap: topic.atlasGap,
            topicId: topic.id,
            origin: 'discovery',
            discoveredFrom: hit.discoveredFrom,
            discoveredAt,
            score: 55,
          });
        }
      }
    }
  }

  const items = dedupeCandidates(candidates.map((candidate) => candidateSchema.parse(candidate)));
  const payload = {
    schemaVersion: 1,
    kind: 'firecrawl-discovery-candidates',
    generatedAt: discoveredAt,
    description:
      'Candidatos de fontes públicas para o corpus Firecrawl Local. Rótulos de Wikidata e categorias da Wikipédia são pistas de descoberta; não provam pertencimento, influência ou relevância editorial.',
    topics: selected.map((topic) => topic.id),
    summary: {
      topics: selected.length,
      candidates: items.length,
      byDomain: items.reduce((acc, item) => {
        acc[item.domain] = (acc[item.domain] ?? 0) + 1;
        return acc;
      }, {}),
      byUsagePolicy: items.reduce((acc, item) => {
        acc[item.usagePolicy] = (acc[item.usagePolicy] ?? 0) + 1;
        return acc;
      }, {}),
      bySource: items.reduce((acc, item) => {
        const source = item.discoveredFrom.split(':')[0];
        acc[source] = (acc[source] ?? 0) + 1;
        return acc;
      }, {}),
    },
    requests,
    items,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return { outputPath, payload };
}

/** Acrescenta candidatos aprovados como seeds `pending`, sem tocar nos curados. */
export async function applyCandidates({
  candidates,
  seedsPath = defaultSeedsPath,
  limit = 25,
  minScore = 55,
} = {}) {
  const catalog = await readJson(seedsPath);
  const existingUrls = new Set(catalog.seeds.map((seed) => seed.url));
  const existingSlugs = new Set(catalog.seeds.map((seed) => seed.slug));

  const accepted = candidates
    .filter((candidate) => candidate.score >= minScore)
    .filter((candidate) => !existingUrls.has(candidate.url))
    .slice(0, limit);

  const applied = [];
  for (const candidate of accepted) {
    let slug = candidate.slug;
    let suffix = 1;
    while (existingSlugs.has(slug)) {
      suffix += 1;
      slug = `${candidate.slug}-${suffix}`;
    }
    const seed = candidateToSeed({ ...candidate, slug });
    catalog.seeds.push(seed);
    existingSlugs.add(slug);
    existingUrls.add(candidate.url);
    applied.push(seed);
  }

  if (applied.length > 0) {
    await writeFile(seedsPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  }
  return { applied, skipped: candidates.length - applied.length, totalSeeds: catalog.seeds.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({
    options: {
      topic: { type: 'string', multiple: true, default: [] },
      limit: { type: 'string', default: '120' },
      apply: { type: 'boolean', default: false },
      'apply-limit': { type: 'string', default: '25' },
      'min-score': { type: 'string', default: '55' },
      'dry-run': { type: 'boolean', default: false },
      'no-wikidata': { type: 'boolean', default: false },
      'no-wikipedia': { type: 'boolean', default: false },
      'no-marxists': { type: 'boolean', default: false },
      output: { type: 'string' },
    },
  });

  try {
    const limit = Number.parseInt(values.limit, 10) || 120;
    const { outputPath, payload } = await runDiscovery({
      topicIds: values.topic.length > 0 ? values.topic : null,
      limit,
      wikipedia: !values['no-wikipedia'],
      wikidata: !values['no-wikidata'],
      marxists: !values['no-marxists'],
      outputPath: values.output ? resolve(values.output) : defaultOutputPath,
    });

    console.log(
      `[discover] ${payload.summary.candidates} candidatos de ${payload.summary.topics} tema(s) em ${outputPath}`,
    );
    for (const [source, count] of Object.entries(payload.summary.bySource)) {
      console.log(`  ${source}: ${count}`);
    }

    if (values.apply) {
      if (values['dry-run']) {
        const preview = payload.items
          .filter(
            (candidate) => candidate.score >= (Number.parseInt(values['min-score'], 10) || 55),
          )
          .slice(0, Number.parseInt(values['apply-limit'], 10) || 25);
        console.log(`[discover] --dry-run: ${preview.length} seeds seriam acrescentados.`);
      } else {
        const result = await applyCandidates({
          candidates: payload.items,
          limit: Number.parseInt(values['apply-limit'], 10) || 25,
          minScore: Number.parseInt(values['min-score'], 10) || 55,
        });
        console.log(
          `[discover] ${result.applied.length} seeds acrescentados (${result.totalSeeds} no catálogo).`,
        );
        for (const seed of result.applied) {
          console.log(`  + ${seed.slug} — ${seed.title}`);
        }
      }
    }
  } catch (error) {
    console.error(`[discover] Falhou: ${error.message}`);
    process.exitCode = 1;
  }
}
