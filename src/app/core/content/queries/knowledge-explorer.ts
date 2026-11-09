import { type DiscoveryIndexEntry, nameMatchScore } from './discovery-index';
import { explorerCatalogues } from './explorer-catalogues';
export { explorerCatalogues, explorerGroups } from './explorer-catalogues';

// Fixed page: 6 columns × 4 rows of cards on desktop. The size is not a user choice.
export const EXPLORER_PAGE_SIZE = 24;

// Separates what the archive holds: records, sources and editorial pages are read differently.
export const explorerContentGroups = [
  { id: 'registros', title: 'Registros' },
  { id: 'fontes', title: 'Fontes' },
  { id: 'editorial', title: 'Páginas editoriais' },
] as const;
export type ExplorerContentGroup = (typeof explorerContentGroups)[number]['id'];
const editorialKinds: readonly string[] = ['leitura'];

/** Top-level layers of the universal archive; a specific catalogue fixes its own layer. */
export const explorerLayers = [
  { id: '', title: 'Tudo' },
  { id: 'registros', title: 'Registros' },
  { id: 'fontes', title: 'Fontes' },
  { id: 'editorial', title: 'Leituras' },
] as const;

/** Reader-facing groups of record kinds, used by the type index. */
export const explorerRecordGroups = [
  { id: 'pessoas-ideias', title: 'Pessoas e ideias', kinds: ['pessoa', 'ideology', 'concept'] },
  { id: 'obras', title: 'Obras', kinds: ['work', 'artigo'] },
  {
    id: 'contexto',
    title: 'Contexto',
    kinds: ['evento', 'institution', 'party', 'place', 'country', 'regime'],
  },
] as const;

export function explorerContentGroup(kind: string): ExplorerContentGroup {
  if (kind === 'fonte') return 'fontes';
  return editorialKinds.includes(kind) ? 'editorial' : 'registros';
}

export const normalizeExplorerQuery = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');

/** Catalogue path to the record kind it lists. */
const catalogueKinds: Record<string, string> = {
  pessoas: 'pessoa',
  obras: 'work',
  ideologias: 'ideology',
  fontes: 'fonte',
  paises: 'country',
  regimes: 'regime',
  partidos: 'party',
  instituicoes: 'institution',
  acontecimentos: 'evento',
  conceitos: 'concept',
  lugares: 'place',
};

/** The catalogue that lists a record of this kind; records without one stay in the general index. */
export function catalogueForKind(kind: string): string {
  return Object.keys(catalogueKinds).find((path) => catalogueKinds[path] === kind) ?? 'entidades';
}

export interface ExplorerFilter {
  catalogue?: string;
  query?: string;
  kind?: string;
  state?: string;
  layer?: string;
}

export function explorerEntries(
  index: readonly DiscoveryIndexEntry[],
  filter: ExplorerFilter,
): DiscoveryIndexEntry[] {
  const query = filter.query?.trim() ?? '';
  const terms = normalizeExplorerQuery(query).split(/\s+/).filter(Boolean);
  const base = explorerBase(index, filter);
  const alphabetical = (a: DiscoveryIndexEntry, b: DiscoveryIndexEntry) =>
    a.title.localeCompare(b.title, 'pt-BR') || a.id.localeCompare(b.id);
  if (!terms.length) return base.sort(alphabetical);
  // Names first: a record that mentions the term in its text is not a search result while some
  // record carries the term as a title, alias or translated title.
  const named = base
    .map((entry) => ({ entry, score: nameMatchScore(entry, query) }))
    .filter((match): match is { entry: DiscoveryIndexEntry; score: number } => match.score !== null)
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.entry.title.localeCompare(b.entry.title, 'pt-BR') ||
        a.entry.id.localeCompare(b.entry.id),
    );
  if (named.length) return named.map((match) => match.entry);
  // A query that names no record still finds the passages that mention it, as a last resort.
  return base
    .filter((entry) => terms.every((term) => entry.searchText.includes(term)))
    .sort(alphabetical);
}

function explorerBase(
  index: readonly DiscoveryIndexEntry[],
  filter: ExplorerFilter,
): DiscoveryIndexEntry[] {
  const catalogue = filter.catalogue ?? 'acervo';
  const kind = catalogueKinds[catalogue];
  return index.filter(
    (entry) =>
      (catalogue === 'acervo' || catalogue === 'fontes' || entry.path.startsWith('/verbete/')) &&
      (!kind || entry.kind === kind) &&
      (!filter.kind || entry.kind === filter.kind) &&
      (!filter.state || entry.state === filter.state) &&
      (!filter.layer || explorerContentGroup(entry.kind) === filter.layer),
  );
}

/** Whether a query matched names (`name`), only passages (`text`) or nothing (`none`). */
export function explorerMatchKind(
  index: readonly DiscoveryIndexEntry[],
  filter: ExplorerFilter,
): 'name' | 'text' | 'none' {
  const query = filter.query?.trim() ?? '';
  const terms = normalizeExplorerQuery(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return 'name';
  const base = explorerBase(index, filter);
  if (base.some((entry) => nameMatchScore(entry, query) !== null)) return 'name';
  return base.some((entry) => terms.every((term) => entry.searchText.includes(term)))
    ? 'text'
    : 'none';
}

export function explorerLayerCounts(index: readonly DiscoveryIndexEntry[], catalogue: string) {
  const entries = explorerEntries(index, { catalogue });
  return explorerLayers.map((layer) => ({
    ...layer,
    count: layer.id
      ? entries.filter((entry) => explorerContentGroup(entry.kind) === layer.id).length
      : entries.length,
  }));
}

export function explorerFacets(
  index: readonly DiscoveryIndexEntry[],
  catalogue: string,
  layer = '',
) {
  const entries = explorerEntries(index, { catalogue, layer });
  const facet = (field: 'kind' | 'state', label: 'kindLabel' | 'stateLabel') => {
    const counts = new Map<string, { value: string; label: string; count: number }>();
    for (const entry of entries) {
      const current = counts.get(entry[field]);
      if (current) current.count += 1;
      else counts.set(entry[field], { value: entry[field], label: entry[label], count: 1 });
    }
    return [...counts.values()].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  };
  return {
    total: entries.length,
    layers: explorerLayerCounts(index, catalogue),
    kinds: facet('kind', 'kindLabel').map((kind) => ({
      ...kind,
      group: explorerContentGroup(kind.value),
    })),
    states: facet('state', 'stateLabel'),
  };
}

export function parseExplorerPage(value: string | null): number {
  return /^\d+$/.test(value ?? '') ? Math.max(1, Number(value)) : 1;
}

// Clamps the requested page to the available range so a stale link never shows an empty page.
export function explorerPage<T>(items: readonly T[], requested: number, size = EXPLORER_PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(Math.max(1, requested), pageCount);
  const first = (page - 1) * size;
  const last = Math.min(first + size, items.length);
  return {
    items: items.slice(first, last),
    page,
    pageCount,
    total: items.length,
    start: items.length ? first + 1 : 0,
    end: last,
  };
}

export function safeExplorerReturn(value: string | null): string | null {
  if (!value?.startsWith('/') || value.startsWith('//')) return null;
  try {
    const url = new URL(value, 'https://atlas.invalid');
    if (
      url.origin !== 'https://atlas.invalid' ||
      url.hash ||
      !explorerCatalogues.some((c) => '/' + c.path === url.pathname) ||
      [...url.searchParams.keys()].some(
        (k) => !['q', 'tipo', 'estado', 'pagina', 'idioma', 'camada'].includes(k),
      )
    )
      return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}
