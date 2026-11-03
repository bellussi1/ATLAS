// Fetches a Wikipedia article as Parsoid HTML and reduces it to plain sections for extraction.
import { JSDOM } from 'jsdom';

import { getJson, getResource } from '../wikimedia/client.mjs';

/** Elements that carry navigation, footnote markers or layout rather than article prose. */
const noise = [
  'style',
  'script',
  'sup.reference',
  '.mw-editsection',
  '.reflist',
  '.references',
  '.navbox',
  '.hatnote',
  '.metadata',
  '.ambox',
  '.infobox',
  '.thumb',
  'figure',
  'table',
  '.mw-empty-elt',
];

/** Sections whose content is bibliography or links, not claims about the subject. */
const skippedHeadings =
  /^(referências|notas|bibliografia|ligações externas|ver também|leitura adicional|references|notes|bibliography|external links|see also|further reading|sources|fontes)$/i;

export async function sitelinkTitles(qid) {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=sitelinks&sitefilter=ptwiki|enwiki&format=json`;
  const entity = (await getJson(url)).entities?.[qid];
  return {
    pt: entity?.sitelinks?.ptwiki?.title ?? null,
    en: entity?.sitelinks?.enwiki?.title ?? null,
  };
}

/** Parsoid HTML sections as `{ heading, text }`; the lead section has an empty heading. */
export function articleSections(html) {
  const { document } = new JSDOM(html).window;
  for (const node of document.querySelectorAll(noise.join(','))) node.remove();
  const sections = [];
  for (const section of document.querySelectorAll('body > section')) {
    const heading = section.querySelector(':scope > h2')?.textContent.trim() ?? '';
    if (skippedHeadings.test(heading)) continue;
    const paragraphs = [...section.querySelectorAll('p, li')]
      .map((node) => node.textContent.replace(/\s+/g, ' ').trim())
      .filter((text) => text.length > 0);
    if (paragraphs.length) sections.push({ heading, text: paragraphs.join('\n') });
  }
  return sections;
}

/** `{ lang, title }` of a Wikipedia article URL; any other URL is rejected. */
export function parseWikiUrl(value) {
  const url = new URL(value);
  const host = url.hostname.match(/^([a-z-]+)\.wikipedia\.org$/);
  if (url.protocol !== 'https:' || !host || !url.pathname.startsWith('/wiki/'))
    throw new Error(`URL de artigo Wikipedia inválida: ${value}`);
  const title = decodeURIComponent(url.pathname.slice('/wiki/'.length)).replaceAll('_', ' ');
  return { lang: host[1], title };
}

/** Canonical title behind redirects, plus the title it was reached by; `null` if the page is missing. */
export async function resolveTitle(lang, title) {
  const url = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  for (const [name, value] of Object.entries({
    action: 'query',
    titles: title,
    redirects: '1',
    prop: 'pageprops',
    ppprop: 'wikibase_item',
    format: 'json',
    formatversion: '2',
  }))
    url.searchParams.set(name, value);
  const data = await getJson(url.href);
  const page = data.query?.pages?.[0];
  if (!page || page.missing) return null;
  const redirect = data.query.redirects?.find((entry) => entry.to === page.title);
  return {
    lang,
    title: page.title,
    qid: page.pageprops?.wikibase_item ?? null,
    redirectedFrom: redirect?.from ?? null,
  };
}

/** Downloads one article under its canonical title; `revision` comes from the Parsoid ETag (`"<revid>/<uuid>"`). */
export async function fetchArticle(lang, title) {
  const resolved = await resolveTitle(lang, title);
  if (!resolved) throw new Error(`Artigo inexistente: ${lang}:${title}`);
  const path = encodeURIComponent(resolved.title.replaceAll(' ', '_'));
  const { bytes, etag } = await getResource(
    `https://${lang}.wikipedia.org/api/rest_v1/page/html/${path}`,
    'html',
  );
  return {
    lang,
    title: resolved.title,
    redirectedFrom: resolved.redirectedFrom,
    url: `https://${lang}.wikipedia.org/wiki/${path}`,
    revision: etag?.match(/^(?:W\/)?"?(\d+)/)?.[1] ?? null,
    sections: articleSections(bytes.toString('utf8')),
  };
}

/** Plain text handed to the model, capped explicitly so a truncation is never silent. */
export function articleText(article, maxChars) {
  const text = article.sections
    .map(({ heading, text }) => (heading ? `## ${heading}\n${text}` : text))
    .join('\n\n');
  return text.length > maxChars
    ? { text: text.slice(0, maxChars), truncated: true }
    : { text, truncated: false };
}
