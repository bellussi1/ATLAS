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

/** Downloads one article; `revision` comes from the Parsoid ETag (`"<revid>/<uuid>"`). */
export async function fetchArticle(lang, title) {
  const path = encodeURIComponent(title.replaceAll(' ', '_'));
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/html/${path}`;
  const { bytes, etag } = await getResource(url, 'html');
  const html = bytes.toString('utf8');
  return {
    lang,
    title,
    url: `https://${lang}.wikipedia.org/wiki/${path}`,
    revision: etag?.match(/^(?:W\/)?"?(\d+)/)?.[1] ?? null,
    sections: articleSections(html),
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
