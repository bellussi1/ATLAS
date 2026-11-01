import { getEditorialType } from '../content/content-types';
import { editorialEntries, getEntryPath } from '../content/editorial-entries';
import type { Atlas, Claim, KnowledgeGraph, Source } from './content-schema';

export interface DiscoveryBacklink {
  id: string;
  path: string;
  title: string;
  label: string;
  context: string;
  relationType: string;
}

export interface DiscoveryIndexEntry {
  id: string;
  title: string;
  summary: string;
  aliases: string[];
  kind: string;
  kindLabel: string;
  state: string;
  stateLabel: string;
  path: string;
  fragment?: string;
  context: string;
  backlinks: DiscoveryBacklink[];
  searchText: string;
}

export interface DiscoveryIndexFilter {
  query?: string;
  kind?: string;
  state?: string;
}

const kindLabels: Record<string, string> = {
  pessoa: 'Pessoa',
  person: 'Pessoa',
  ideology: 'Ideia',
  evento: 'Evento',
  event: 'Evento',
  work: 'Obra',
  concept: 'Conceito',
  artigo: 'Artigo',
  fonte: 'Fonte',
  source: 'Fonte',
  institution: 'Instituição',
  place: 'Lugar',
  party: 'Partido',
  government: 'Governo',
  policy: 'Política pública',
  'historical-polity': 'Formação política histórica',
  article: 'Artigo',
};

const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  pending: 'Revisão editorial pendente',
  verified: 'Verificada após revisão humana',
  contested: 'Contestada',
  'needs-update': 'Precisa de atualização',
  registered: 'Registro cadastrado',
  exemplar: 'Exemplar de metodologia',
  previsto: 'Formato previsto',
  mixed: 'Estados editoriais variados',
};

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

function kindFacet(kind: string): string {
  return (
    ({ person: 'pessoa', event: 'evento', article: 'artigo' } as Record<string, string>)[kind] ??
    kind
  );
}

function entityState(atlas: Atlas, entityId: string): string {
  const states = new Set(
    atlas.claims
      .filter((claim) => claim.entityId === entityId)
      .map((claim) => claim.editorialStatus),
  );
  if (!states.size) return 'registered';
  return states.size === 1 ? [...states][0] : 'mixed';
}

function searchContent(values: unknown[]): string {
  return normalize(
    values
      .flat(Infinity)
      .filter((value): value is string => typeof value === 'string')
      .join(' '),
  );
}

export function buildDiscoveryIndex(graph: KnowledgeGraph): DiscoveryIndexEntry[] {
  const entries: DiscoveryIndexEntry[] = [];
  const entityEntries = new Map<string, DiscoveryIndexEntry>();
  const sourceEntries = new Map<string, DiscoveryIndexEntry>();
  const entityPaths = new Map<string, string>();
  const entityTitles = new Map<string, string>();
  const allEntities = graph.atlases.flatMap((atlas) =>
    atlas.entities.map((entity) => ({ atlas, entity })),
  );
  const allSources = graph.atlases.flatMap((atlas) =>
    atlas.sources.map((source) => ({ atlas, source })),
  );
  const allClaims = graph.atlases.flatMap((atlas) =>
    atlas.claims.map((claim) => ({ atlas, claim })),
  );
  const citations = graph.atlases.flatMap((atlas) => atlas.citations);
  const evidences = graph.atlases.flatMap((atlas) => atlas.evidences);
  const sources = new Map(allSources.map(({ source }) => [source.id, source]));
  const entities = new Map(allEntities.map(({ entity }) => [entity.id, entity]));
  const citationById = new Map(citations.map((citation) => [citation.id, citation]));
  const evidenceById = new Map(evidences.map((evidence) => [evidence.id, evidence]));

  for (const { atlas, entity } of allEntities) {
    const state = entityState(atlas, entity.id);
    const entry: DiscoveryIndexEntry = {
      id: entity.id,
      title: entity.title,
      summary: entity.summary,
      aliases: [...entity.aliases],
      kind: kindFacet(entity.kind),
      kindLabel: kindLabels[kindFacet(entity.kind)] ?? 'Registro',
      state,
      stateLabel: statusLabels[state],
      path: `/verbete/${entity.slug}`,
      context: entity.context,
      backlinks: [],
      searchText: searchContent([
        entity.title,
        entity.summary,
        entity.aliases,
        entity.context,
        entity.sections.map((section) => [section.heading, section.paragraphs]),
        atlas.claims.filter((claim) => claim.entityId === entity.id).map((claim) => claim.text),
      ]),
    };
    entries.push(entry);
    entityEntries.set(entity.id, entry);
    entityPaths.set(entity.id, entry.path);
    entityTitles.set(entity.id, entity.title);
  }

  for (const { atlas, source } of allSources) {
    const entry: DiscoveryIndexEntry = {
      id: source.id,
      title: source.title,
      summary: source.edition,
      aliases: [],
      kind: 'fonte',
      kindLabel: 'Fonte',
      state: 'registered',
      stateLabel: statusLabels['registered'],
      path: '/fontes',
      fragment: `source-${source.id}`,
      context: source.edition,
      backlinks: [],
      searchText: searchContent([
        source.title,
        source.edition,
        source.publicationDate ?? '',
        atlas.evidences
          .filter((item) => item.sourceId === source.id)
          .flatMap((item) => [item.locator, item.note ?? '']),
      ]),
    };
    entries.push(entry);
    sourceEntries.set(source.id, entry);
  }

  for (const { claim } of allClaims) {
    addSourceBacklinks(
      claim,
      sourceEntries,
      sources,
      citationById,
      evidenceById,
      entityPaths,
      entityTitles,
    );
  }

  for (const atlas of graph.atlases) {
    for (const relation of atlas.relations) {
      const target = entityEntries.get(relation.toEntityId);
      const source = entities.get(relation.fromEntityId);
      const path = entityPaths.get(relation.fromEntityId);
      if (!target || !source || !path) continue;
      target.backlinks.push({
        id: relation.id,
        path,
        title: source.title,
        label: relation.reverseLabel,
        context: relation.context,
        relationType: relation.type,
      });
    }
  }

  for (const entry of editorialEntries) {
    const type = getEditorialType(entry.type);
    entries.push({
      id: `editorial-${entry.type}-${entry.slug}`,
      title: entry.title,
      summary: entry.summary,
      aliases: [],
      kind: entry.type,
      kindLabel: type?.label ?? 'Conteúdo',
      state: entry.status,
      stateLabel: entry.statusLabel,
      path: getEntryPath(entry.type, entry.slug),
      context: entry.sections[0]?.paragraphs[0] ?? '',
      backlinks: [],
      searchText: searchContent([
        entry.title,
        entry.summary,
        entry.statusLabel,
        entry.sections.map((section) => [section.heading, section.paragraphs]),
      ]),
    });
  }

  const errors = validateDiscoveryDestinations(entries, graph);
  if (errors.length)
    throw new Error(`Índice de descoberta contém destinos inválidos: ${errors.join('; ')}`);
  return entries;
}

function addSourceBacklinks(
  claim: Claim,
  sourceEntries: Map<string, DiscoveryIndexEntry>,
  sources: Map<string, Source>,
  citations: Map<string, { id: string; evidenceId: string; relation: string }>,
  evidences: Map<string, { id: string; sourceId: string; locator: string }>,
  entityPaths: Map<string, string>,
  entityTitles: Map<string, string>,
): void {
  const path = entityPaths.get(claim.entityId);
  if (!path) return;
  for (const citationId of claim.citationIds) {
    const citation = citations.get(citationId);
    const evidence = citation ? evidences.get(citation.evidenceId) : undefined;
    const source = evidence ? sources.get(evidence.sourceId) : undefined;
    const entry = evidence ? sourceEntries.get(evidence.sourceId) : undefined;
    if (!citation || !evidence || !source || !entry) continue;
    entry.backlinks.push({
      id: `${claim.id}-${citation.id}`,
      path,
      title: entityTitles.get(claim.entityId) ?? 'Registro',
      label: `${citation.relation === 'supports' ? 'sustenta' : citation.relation === 'contests' ? 'contesta' : 'contextualiza'} esta afirmação`,
      context: `${claim.text} · ${evidence.locator}`,
      relationType: citation.relation,
    });
  }
}

export function filterDiscoveryIndex(
  index: DiscoveryIndexEntry[],
  filter: DiscoveryIndexFilter,
): DiscoveryIndexEntry[] {
  const query = normalize(filter.query?.trim() ?? '');
  return index.filter(
    (entry) =>
      (!filter.kind || entry.kind === filter.kind) &&
      (!filter.state || entry.state === filter.state) &&
      (!query || entry.searchText.includes(query)),
  );
}

export function validateDiscoveryDestinations(
  index: DiscoveryIndexEntry[],
  graph: KnowledgeGraph,
): string[] {
  const entityPaths = new Set(
    graph.atlases.flatMap((atlas) => atlas.entities.map((entity) => `/verbete/${entity.slug}`)),
  );
  const sourceIds = new Set(
    graph.atlases.flatMap((atlas) => atlas.sources.map((source) => source.id)),
  );
  const editorialPaths = new Set(
    editorialEntries.map((entry) => getEntryPath(entry.type, entry.slug)),
  );
  const errors: string[] = [];
  const hasDestination = (path: string, fragment?: string): boolean => {
    if (path.startsWith('/verbete/')) return entityPaths.has(path) && !fragment;
    if (path === '/fontes')
      return !fragment || (fragment.startsWith('source-') && sourceIds.has(fragment.slice(7)));
    return editorialPaths.has(path) && !fragment;
  };
  for (const entry of index) {
    if (!hasDestination(entry.path, entry.fragment))
      errors.push(
        `Destino inexistente: ${entry.path}${entry.fragment ? `#${entry.fragment}` : ''}`,
      );
    for (const backlink of entry.backlinks) {
      if (!hasDestination(backlink.path)) errors.push(`Destino inexistente: ${backlink.path}`);
    }
  }
  return errors;
}

export function safeDiscoveryOrigin(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, 'https://atlas.invalid');
    if (url.origin !== 'https://atlas.invalid') return null;
    if (url.pathname === '/marxismo' || url.pathname === '/ideologias/marxismo') {
      const allowed = [
        'argumento',
        'vinculo',
        'periodo',
        'relacao',
        'bibliografia',
        'pensadores-0',
        'origens-0',
        'conceitos-0',
      ];
      const anchors = [
        'introducao',
        'origens',
        'conceitos',
        'pensadores',
        'historia',
        'correntes',
        'criticas',
        'fontes',
      ];
      if (
        (url.hash && !anchors.includes(url.hash.slice(1))) ||
        [...url.searchParams.keys()].some((key) => !allowed.includes(key))
      )
        return null;
      if (
        url.searchParams.has('argumento') &&
        !['smith', 'marx'].includes(url.searchParams.get('argumento')!)
      )
        return null;
      if (
        url.searchParams.has('vinculo') &&
        !['todas', 'comparacao', 'critica'].includes(url.searchParams.get('vinculo')!)
      )
        return null;
      return `${url.pathname}${url.search}${url.hash}`;
    }
    if (url.hash) return null;
    if (url.pathname === '/atlas/marxismo' && !url.search) return url.pathname;
    if (url.pathname === '/atlas/marxismo' || url.pathname === '/atlas/marxismo/valor-e-trabalho') {
      if (
        [...url.searchParams.keys()].some((key) => !['argumento', 'vinculo'].includes(key)) ||
        url.searchParams.getAll('argumento').length !== 1 ||
        !['smith', 'marx'].includes(url.searchParams.get('argumento') ?? '') ||
        url.searchParams.getAll('vinculo').length > 1 ||
        (url.searchParams.has('vinculo') &&
          !['todas', 'comparacao', 'critica'].includes(url.searchParams.get('vinculo') ?? ''))
      )
        return null;
      return `${url.pathname}${url.search}`;
    }
    if (url.pathname !== '/conhecimento') return null;
    if ([...url.searchParams.keys()].some((key) => !['q', 'tipo', 'estado'].includes(key)))
      return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}
