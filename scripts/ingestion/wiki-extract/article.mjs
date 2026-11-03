// Fetches a Wikipedia article as Parsoid HTML and reduces it to prose sections, body links and references.
import { JSDOM } from 'jsdom';

import { getJson, getResource } from '../wikimedia/client.mjs';
import { classifyQids, resolveTargets, targetKind } from './targets.mjs';

/** Elements that carry navigation, footnote lists or layout rather than article prose. */
const noise = [
  'style',
  'script',
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

const normalize = (text) => text.replace(/\s+/g, ' ').trim();

export async function sitelinkTitles(qid) {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=sitelinks&sitefilter=ptwiki|enwiki&format=json`;
  const entity = (await getJson(url)).entities?.[qid];
  return {
    pt: entity?.sitelinks?.ptwiki?.title ?? null,
    en: entity?.sitelinks?.enwiki?.title ?? null,
  };
}

/** Title written in a Parsoid wikilink `href`: `./Karl_Marx#Vida` → `Karl Marx`. */
export function linkedTitle(href) {
  return decodeURIComponent(href.replace(/^\.\//, '').split(/[?#]/)[0]).replaceAll('_', ' ');
}

const headingOf = (section) =>
  [...section.children].find((child) => /^H[1-6]$/.test(child.tagName))?.textContent.trim() ?? '';

/** A section is bibliography when it or any section it sits in has a skipped heading. */
function isSkipped(section) {
  for (let node = section; node; node = node.parentElement?.closest('section'))
    if (skippedHeadings.test(headingOf(node))) return true;
  return false;
}

/** Paragraph and list items that belong to this section itself, not to a subsection. */
const ownBlocks = (section) =>
  [...section.querySelectorAll('p, li')].filter((block) => block.closest('section') === section);

/** Text of a block without its nested blocks, so nested lists are not read twice. */
function blockText(block) {
  const copy = block.cloneNode(true);
  for (const nested of copy.querySelectorAll('p, li')) nested.remove();
  return normalize(copy.textContent);
}

/**
 * Parsoid HTML as `{ sections, links, references }`, with one entry per section in document order.
 * `sections` holds prose only (the lead has an empty heading; each paragraph is one line). `links`
 * covers internal links of the body and of bibliography sections, with their section index,
 * heading and paragraph. Footnote citations are kept in `references` with where they are cited.
 */
export function parseArticle(html) {
  const { document } = new JSDOM(html).window;
  const notes = new Map(
    [...document.querySelectorAll('li[id^="cite_note"]')].map((item) => [
      item.id,
      normalize((item.querySelector('.reference-text') ?? item).textContent),
    ]),
  );
  for (const node of document.querySelectorAll(noise.join(','))) node.remove();
  const sections = [];
  const bibliography = [];
  const links = [];
  const cites = new Map();
  const seenAnchors = new WeakSet();
  for (const [index, section] of [...document.querySelectorAll('body section')].entries()) {
    const heading = headingOf(section);
    const paragraphs = [];
    for (const block of ownBlocks(section)) {
      for (const sup of block.querySelectorAll('sup.reference')) {
        if (sup.closest('p, li') !== block) continue;
        for (const anchor of sup.querySelectorAll('a[href*="#cite_note"]')) {
          const href = anchor.getAttribute('href');
          const id = href.slice(href.indexOf('#') + 1);
          cites.set(id, [
            ...(cites.get(id) ?? []),
            { section: index, paragraph: paragraphs.length },
          ]);
        }
        sup.remove();
      }
      const text = blockText(block);
      if (!text) continue;
      for (const anchor of block.querySelectorAll('a[rel~="mw:WikiLink"]')) {
        if (anchor.closest('p, li') !== block || seenAnchors.has(anchor)) continue;
        seenAnchors.add(anchor);
        links.push({
          text: normalize(anchor.textContent),
          written: linkedTitle(anchor.getAttribute('href')),
          section: index,
          heading,
          paragraph: paragraphs.length,
        });
      }
      paragraphs.push(text);
    }
    if (!paragraphs.length) continue;
    const entry = { index, heading, text: paragraphs.join('\n') };
    if (isSkipped(section)) bibliography.push(entry);
    else sections.push(entry);
  }
  const references = {
    notes: [...notes]
      .filter(([, text]) => text.length > 0)
      .map(([id, text]) => ({ id, text, cites: cites.get(id) ?? [] })),
    bibliography,
  };
  return { sections, links, references };
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

/**
 * Downloads one article under its canonical title; `revision` comes from the Parsoid ETag
 * (`"<revid>/<uuid>"`). Each body link points to its canonical target; `targets` describes them.
 */
export async function fetchArticle(lang, title) {
  const resolved = await resolveTitle(lang, title);
  if (!resolved) throw new Error(`Artigo inexistente: ${lang}:${title}`);
  const path = encodeURIComponent(resolved.title.replaceAll(' ', '_'));
  const { bytes, etag } = await getResource(
    `https://${lang}.wikipedia.org/api/rest_v1/page/html/${path}`,
    'html',
  );
  const { sections, links, references } = parseArticle(bytes.toString('utf8'));
  const resolvedTargets = await resolveTargets(
    lang,
    links.map((link) => link.written),
  );
  const kinds = await classifyQids(
    [...resolvedTargets.values()].flatMap((target) => target.qid ?? []),
  );
  return {
    lang,
    title: resolved.title,
    qid: resolved.qid,
    redirectedFrom: resolved.redirectedFrom,
    url: `https://${lang}.wikipedia.org/wiki/${path}`,
    revision: etag?.match(/^(?:W\/)?"?(\d+)/)?.[1] ?? null,
    sections,
    links: links.map(({ written, ...link }) => ({
      ...link,
      target: resolvedTargets.get(written).title,
    })),
    targets: targetRecords(resolvedTargets, kinds),
    references,
  };
}

/** One record per canonical target: its Wikidata item, its type, and the titles that reached it. */
export function targetRecords(resolvedTargets, kinds = new Map()) {
  const records = new Map();
  for (const [written, target] of resolvedTargets) {
    const { title, qid, missing } = target;
    const record = records.get(title) ?? {
      title,
      qid,
      missing,
      ...targetKind(target, kinds),
      redirectedFrom: [],
    };
    if (written !== title && !record.redirectedFrom.includes(written))
      record.redirectedFrom.push(written);
    records.set(title, record);
  }
  return [...records.values()];
}

/** Reading units of one section: the whole section, or paragraph groups when it exceeds `maxChars`. */
function sectionUnits(section, index, maxChars) {
  // Room for the heading line, sized for a two-digit part count.
  const room = section.heading ? `## ${section.heading} (parte 00/00)\n`.length : 0;
  const groups = [];
  let group = [];
  for (const paragraph of section.text.split('\n')) {
    if (group.length && room + [...group, paragraph].join('\n').length > maxChars) {
      groups.push(group);
      group = [];
    }
    group.push(paragraph);
  }
  if (group.length) groups.push(group);
  return groups.map((lines, offset) => {
    const part = offset + 1;
    const parts = groups.length;
    const heading = section.heading
      ? `## ${section.heading}${parts > 1 ? ` (parte ${part}/${parts})` : ''}\n`
      : '';
    return {
      section: index,
      heading: section.heading,
      part,
      parts,
      text: heading + lines.join('\n'),
    };
  });
}

const describeUnit = ({ section, heading, part, parts, text }) => ({
  section,
  heading,
  part,
  parts,
  chars: text.length,
});

/**
 * Text handed to the model, divided by section. Units are read in order until the next one would
 * exceed `maxChars`; that unit and every later one are listed as skipped, never cut silently.
 */
export function articleText(article, maxChars) {
  const units = article.sections.flatMap((section, position) =>
    sectionUnits(section, section.index ?? position, maxChars),
  );
  const read = [];
  const skipped = [];
  let length = 0;
  for (const unit of units) {
    const next = length + (read.length ? 2 : 0) + unit.text.length;
    if (!skipped.length && next <= maxChars) {
      read.push(unit);
      length = next;
    } else skipped.push(unit);
  }
  return {
    text: read.map((unit) => unit.text).join('\n\n'),
    truncated: skipped.length > 0,
    coverage: {
      maxChars,
      read: read.map(describeUnit),
      skipped: skipped.map(describeUnit),
    },
  };
}
