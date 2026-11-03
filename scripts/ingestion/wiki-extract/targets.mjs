// Resolves the titles linked from an article to their canonical page and Wikidata item, in batches.
import { getJson } from '../wikimedia/client.mjs';

const batchSize = 50;

/** Maps each requested title, through normalization and redirects, to `{ title, qid, missing }`. */
export async function resolveTargets(lang, titles) {
  const unique = [...new Set(titles)];
  const resolved = new Map();
  for (let start = 0; start < unique.length; start += batchSize) {
    const batch = unique.slice(start, start + batchSize);
    const url = new URL(`https://${lang}.wikipedia.org/w/api.php`);
    for (const [name, value] of Object.entries({
      action: 'query',
      titles: batch.join('|'),
      redirects: '1',
      prop: 'pageprops',
      ppprop: 'wikibase_item',
      format: 'json',
      formatversion: '2',
    }))
      url.searchParams.set(name, value);
    for (const [title, target] of mapResolution(batch, await getJson(url.href)))
      resolved.set(title, target);
  }
  return resolved;
}

/** Pure step of `resolveTargets`, kept apart from the network so it can be tested. */
export function mapResolution(titles, data) {
  const normalized = new Map((data.query?.normalized ?? []).map((entry) => [entry.from, entry.to]));
  const redirects = new Map((data.query?.redirects ?? []).map((entry) => [entry.from, entry.to]));
  const pages = new Map((data.query?.pages ?? []).map((page) => [page.title, page]));
  return titles.map((title) => {
    const step = normalized.get(title) ?? title;
    const canonical = redirects.get(step) ?? step;
    const page = pages.get(canonical);
    return [
      title,
      {
        title: canonical,
        qid: page?.pageprops?.wikibase_item ?? null,
        missing: !page || page.missing === true || page.invalid === true,
      },
    ];
  });
}
