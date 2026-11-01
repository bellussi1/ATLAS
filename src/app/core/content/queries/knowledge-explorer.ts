import type { DiscoveryIndexEntry } from './discovery-index';

export const explorerCatalogues = [
  {
    path: 'conhecimento',
    title: 'Conhecimento',
    description: 'Busque em todo o acervo: registros, fontes e exemplos de metodologia.',
  },
  {
    path: 'entidades',
    title: 'Entidades',
    description: 'Pessoas, ideias, obras, acontecimentos e instituições em contexto.',
  },
  {
    path: 'ideologias',
    title: 'Ideologias',
    description: 'Tradições e ideias políticas, com suas conexões e fontes.',
  },
  {
    path: 'pessoas',
    title: 'Pessoas',
    description: 'Trajetórias e ideias nas relações registradas pelo acervo.',
  },
  {
    path: 'obras',
    title: 'Obras',
    description: 'Documentos e obras para investigar argumentos e contextos.',
  },
  {
    path: 'fontes',
    title: 'Fontes',
    description: 'Referências cadastradas e os registros que as citam.',
  },
  {
    path: 'paises',
    title: 'Países',
    description: 'Identidades estatais e recortes territoriais com fontes e limites explícitos.',
  },
  {
    path: 'regimes',
    title: 'Regimes',
    description: 'Recortes temporais e classificações atribuídas, sem confundir país e governo.',
  },
  {
    path: 'partidos',
    title: 'Partidos',
    description: 'Registros de partidos, com contexto institucional e fontes identificadas.',
  },
  {
    path: 'instituicoes',
    title: 'Instituições',
    description: 'Instituições em seus contextos históricos e documentais.',
  },
  {
    path: 'acontecimentos',
    title: 'Acontecimentos',
    description: 'Acontecimentos datados e suas fontes, sem causalidade automática.',
  },
  {
    path: 'conceitos',
    title: 'Conceitos',
    description: 'Formulações e questões conceituais registradas no acervo.',
  },
  {
    path: 'lugares',
    title: 'Lugares',
    description: 'Lugares e espaços documentados, distintos dos registros de países.',
  },
] as const;
export type ExplorerCatalogue = (typeof explorerCatalogues)[number]['path'];
export const normalizeExplorerQuery = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

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
  const facet = (field: 'kind' | 'state', label: 'kindLabel' | 'stateLabel') =>
    [
      ...new Map(entries.map((e) => [e[field], { value: e[field], label: e[label] }])).values(),
    ].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  return { kinds: facet('kind', 'kindLabel'), states: facet('state', 'stateLabel') };
}

export function safeExplorerReturn(value: string | null): string | null {
  if (!value?.startsWith('/') || value.startsWith('//')) return null;
  try {
    const url = new URL(value, 'https://atlas.invalid');
    if (
      url.origin !== 'https://atlas.invalid' ||
      url.hash ||
      !explorerCatalogues.some((c) => '/' + c.path === url.pathname) ||
      [...url.searchParams.keys()].some((k) => !['q', 'tipo', 'estado', 'idioma'].includes(k))
    )
      return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}
