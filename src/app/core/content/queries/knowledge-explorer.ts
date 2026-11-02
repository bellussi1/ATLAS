import type { DiscoveryIndexEntry } from './discovery-index';

export const explorerGroups = [
  { id: 'acervo', title: 'Acervo' },
  { id: 'ideias', title: 'Ideias e pessoas' },
  { id: 'contexto', title: 'Contexto e instituições' },
  { id: 'fontes', title: 'Fontes' },
] as const;

export const explorerCatalogues = [
  {
    group: 'acervo',
    path: 'conhecimento',
    title: 'Conhecimento',
    description: 'Busque em todo o acervo: registros, fontes e exemplos de metodologia.',
  },
  {
    group: 'ideias',
    path: 'entidades',
    title: 'Entidades',
    description: 'Pessoas, ideias, obras, acontecimentos e instituições em contexto.',
  },
  {
    group: 'ideias',
    path: 'ideologias',
    title: 'Ideologias',
    description: 'Tradições e ideias políticas, com suas conexões e fontes.',
  },
  {
    group: 'ideias',
    path: 'pessoas',
    title: 'Pessoas',
    description: 'Trajetórias e ideias nas relações registradas pelo acervo.',
  },
  {
    group: 'ideias',
    path: 'obras',
    title: 'Obras',
    description: 'Documentos e obras para investigar argumentos e contextos.',
  },
  {
    group: 'fontes',
    path: 'fontes',
    title: 'Fontes',
    description: 'Referências cadastradas e os registros que as citam.',
  },
  {
    group: 'contexto',
    path: 'paises',
    title: 'Países',
    description: 'Identidades estatais e recortes territoriais com fontes e limites explícitos.',
  },
  {
    group: 'contexto',
    path: 'regimes',
    title: 'Regimes',
    description: 'Recortes temporais e classificações atribuídas, sem confundir país e governo.',
  },
  {
    group: 'contexto',
    path: 'partidos',
    title: 'Partidos',
    description: 'Registros de partidos, com contexto institucional e fontes identificadas.',
  },
  {
    group: 'contexto',
    path: 'instituicoes',
    title: 'Instituições',
    description: 'Instituições em seus contextos históricos e documentais.',
  },
  {
    group: 'contexto',
    path: 'acontecimentos',
    title: 'Acontecimentos',
    description: 'Acontecimentos datados e suas fontes, sem causalidade automática.',
  },
  {
    group: 'ideias',
    path: 'conceitos',
    title: 'Conceitos',
    description: 'Formulações e questões conceituais registradas no acervo.',
  },
  {
    group: 'contexto',
    path: 'lugares',
    title: 'Lugares',
    description: 'Lugares e espaços documentados, distintos dos registros de países.',
  },
] as const;
export type ExplorerCatalogue = (typeof explorerCatalogues)[number]['path'];
export const EXPLORER_PAGE_SIZES: readonly number[] = [10, 20, 50];
export const EXPLORER_PAGE_SIZE = 10;

// Separates what the archive holds: records, sources and editorial pages are read differently.
export const explorerContentGroups = [
  { id: 'registros', title: 'Registros' },
  { id: 'fontes', title: 'Fontes' },
  { id: 'editorial', title: 'Páginas editoriais' },
] as const;
export type ExplorerContentGroup = (typeof explorerContentGroups)[number]['id'];
const editorialKinds: readonly string[] = [
  'atlas',
  'dossie',
  'leitura',
  'trilha',
  'verbete',
  'visualizacao',
];

export function explorerContentGroup(kind: string): ExplorerContentGroup {
  if (kind === 'fonte') return 'fontes';
  return editorialKinds.includes(kind) ? 'editorial' : 'registros';
}

export const normalizeExplorerQuery = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');

export function explorerEntries(
  index: readonly DiscoveryIndexEntry[],
  filter: { catalogue?: string; query?: string; kind?: string; state?: string },
): DiscoveryIndexEntry[] {
  const catalogue = filter.catalogue ?? 'conhecimento';
  const kind = (
    {
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
    } as Record<string, string>
  )[catalogue];
  const terms = normalizeExplorerQuery(filter.query ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return index
    .filter(
      (entry) =>
        (catalogue === 'conhecimento' ||
          catalogue === 'fontes' ||
          entry.path.startsWith('/verbete/')) &&
        (!kind || entry.kind === kind) &&
        (!filter.kind || entry.kind === filter.kind) &&
        (!filter.state || entry.state === filter.state) &&
        terms.every((term) => entry.searchText.includes(term)),
    )
    .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR') || a.id.localeCompare(b.id));
}

export function explorerFacets(index: readonly DiscoveryIndexEntry[], catalogue: string) {
  const entries = explorerEntries(index, { catalogue });
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

export function parseExplorerPageSize(value: string | null): number {
  const size = Number(value);
  return EXPLORER_PAGE_SIZES.includes(size) ? size : EXPLORER_PAGE_SIZE;
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
        (k) => !['q', 'tipo', 'estado', 'porPagina', 'pagina'].includes(k),
      )
    )
      return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}
