// Selection turns discovery candidates into the entities a tradition ingests.
// Rules are conservative and explicit; every inclusion or exclusion is reported
// with its reason so the editorial review can overrule it in `decisions`.

const slugify = (value) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const selectionRules = {
  // Wikidata labels a person as belonging to the tradition (P1142) and the entry is
  // notable enough to appear in several language editions.
  person: (c) =>
    c.roles.includes('political-ideology') &&
    c.sitelinks.count >= 30 &&
    c.born !== null &&
    c.born <= 1930,
  // Ideologies and currents with a documented Wikidata subclass link and a Wikipedia article.
  ideology: (c) => c.sitelinks.count >= 20 && (c.sitelinks.ptwiki || c.sitelinks.enwiki),
  // Works whose main subject is the tradition and that have several editions.
  work: (c) => c.roles.includes('main-subject') && c.sitelinks.count >= 20,
};

export function selectCandidates(candidates, decisions = { include: [], exclude: {} }) {
  const forced = new Map(decisions.include.map((item) => [item.qid, item.reason]));
  const included = [];
  const excluded = [];
  for (const candidate of candidates) {
    const label = candidate.labels.pt ?? candidate.labels.en;
    const rule = selectionRules[candidate.kind];
    if (decisions.exclude[candidate.qid]) {
      excluded.push({ qid: candidate.qid, label, reason: decisions.exclude[candidate.qid] });
    } else if (forced.has(candidate.qid)) {
      included.push({ ...candidate, label, reason: forced.get(candidate.qid) });
    } else if (rule?.(candidate)) {
      included.push({ ...candidate, label });
    }
  }
  return { included, excluded };
}

// Configuration tuples match `configurations.mjs`: [id, pt-or-en name, en name, kind, QID].
export function toConfigEntities(included, existingQids = new Set()) {
  const seen = new Set(existingQids);
  const prefix = { person: 'person', ideology: 'ideology', work: 'work' };
  const rows = [];
  for (const candidate of included) {
    if (seen.has(candidate.qid) || !prefix[candidate.kind]) continue;
    seen.add(candidate.qid);
    const en = candidate.labels.en ?? candidate.labels.pt;
    const pt = candidate.labels.pt ?? en;
    rows.push([`${prefix[candidate.kind]}-${slugify(en)}`, pt, en, candidate.kind, candidate.qid]);
  }
  return rows;
}
