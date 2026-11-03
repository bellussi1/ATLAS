// Proposes Wikipedia articles related to a tradition by counting the seed articles that link to them.
// The ranking is a list for editorial review, never a selection: nothing is fetched from it until accepted.
import { getJson } from '../wikimedia/client.mjs';

/** Titles that are never topic articles: years, list and index pages, and other namespaces' prefixes. */
const excludedTitle = /^(\d{1,4}|lista de|lista dos|anexo:|categoria:|portal:|predefinição:)/i;

export const seedKeys = (seed) => [seed.qid, `${seed.lang}:${seed.title}`].filter(Boolean);

/** Article links of one seed page, following API continuation for at most `maxPages` requests. */
export async function linkedArticles(lang, title, { maxPages = 5 } = {}) {
  const pages = [];
  let continuation = {};
  for (let page = 0; page < maxPages; page += 1) {
    const url = new URL(`https://${lang}.wikipedia.org/w/api.php`);
    for (const [name, value] of Object.entries({
      action: 'query',
      generator: 'links',
      titles: title,
      gpllimit: 'max',
      gplnamespace: '0',
      prop: 'pageprops',
      ppprop: 'wikibase_item|disambiguation',
      format: 'json',
      formatversion: '2',
      ...continuation,
    }))
      url.searchParams.set(name, value);
    const data = await getJson(url.href);
    pages.push(...(data.query?.pages ?? []));
    if (!data.continue) break;
    continuation = data.continue;
  }
  return pages
    .filter((page) => !page.missing)
    .map((page) => ({
      lang,
      title: page.title,
      qid: page.pageprops?.wikibase_item ?? null,
      disambiguation: page.pageprops?.disambiguation !== undefined,
    }));
}

/**
 * Pure ranking. `seeds` is `[{ seed, links }]`, one entry per seed article; a candidate must be
 * linked from at least `minShared` distinct seeds, which filters out incidental links.
 */
export function rankCandidates(seeds, { minShared = 2, top = 60 } = {}) {
  const excluded = new Set(seeds.flatMap(({ seed }) => seedKeys(seed)));
  const byKey = new Map();
  for (const { seed, links } of seeds) {
    const seen = new Set();
    for (const link of links) {
      const keys = seedKeys(link);
      const key = keys[0];
      if (link.disambiguation || excludedTitle.test(link.title)) continue;
      if (keys.some((candidateKey) => excluded.has(candidateKey))) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      const entry = byKey.get(key) ?? { ...link, sharedBy: [] };
      entry.sharedBy.push(seed.label);
      if (link.lang === 'pt') Object.assign(entry, { lang: 'pt', title: link.title });
      byKey.set(key, entry);
    }
  }
  return [...byKey.values()]
    .filter((candidate) => candidate.sharedBy.length >= minShared)
    .sort((a, b) => b.sharedBy.length - a.sharedBy.length || a.title.localeCompare(b.title, 'pt'))
    .slice(0, top)
    .map(({ sharedBy, disambiguation, ...candidate }) => ({
      ...candidate,
      sharedByCount: sharedBy.length,
      linkedFrom: sharedBy,
      decision: null,
    }));
}
