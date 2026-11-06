/**
 * Which articles to download again. `--refresh` reopens every stored record without
 * `article.targets`: those were fetched before body links existed, so their relations could never
 * resolve to a QID. Records that already carry targets stay untouched, and a declared target is
 * queued only when no stored record covers it.
 */
export function refreshPlan(stored, declared, { refresh } = {}) {
  const done = new Set(
    stored
      .filter((item) => !refresh || Array.isArray(item.record.article.targets))
      .map((i) => i.id),
  );
  const stale = refresh
    ? stored
        .filter((item) => !Array.isArray(item.record.article.targets))
        .map(({ record }) => ({
          entity: record.entity,
          lang: record.article.lang,
          title: record.article.title,
        }))
    : [];
  const staleIds = new Set(stale.map((target) => target.entity.id));
  const fresh = [];
  for (const target of declared) {
    const id = target.entity.id;
    if (done.has(id) || staleIds.has(id)) continue;
    staleIds.add(id);
    fresh.push(target);
  }
  return [...stale, ...fresh];
}
