import type { NetworkClaim, NetworkGraph } from '@core/content/models/content-artifacts';
import type { EntityKind, KnowledgeGraph, Relation } from '@core/content/models/content-schema';
/** Node families of the graph page. Each one has a colour, a shape and an icon family. */
export type NetworkKindId =
  | 'ideology'
  | 'person'
  | 'work'
  | 'organization'
  | 'party'
  | 'event'
  | 'country'
  | 'polity'
  | 'place'
  | 'concept';

export type NetworkKindGroupId = 'ideas' | 'culture' | 'territories';

export type NetworkShape =
  | 'hexagon'
  | 'circle'
  | 'square'
  | 'triangle'
  | 'bar'
  | 'ring'
  | 'shield'
  | 'cross'
  | 'pin'
  | 'diamond';

export interface NetworkKindDefinition {
  id: NetworkKindId;
  label: string;
  plural: string;
  /** Visual family used to group the legend. */
  group: NetworkKindGroupId;
  /** Two-digit catalogue index shown in the legend. */
  code: string;
  shape: NetworkShape;
  /** CSS custom property holding the node colour. */
  color: string;
  icon:
    | 'ideology'
    | 'person'
    | 'work'
    | 'institution'
    | 'party'
    | 'event'
    | 'place'
    | 'concept'
    | 'polity';
}

export const networkKindGroups: readonly { id: NetworkKindGroupId; title: string }[] = [
  { id: 'ideas', title: 'Pessoas e ideias' },
  { id: 'culture', title: 'Obras e acontecimentos' },
  { id: 'territories', title: 'Instituições e territórios' },
];

export const networkKinds: readonly NetworkKindDefinition[] = [
  {
    id: 'ideology',
    label: 'Ideologia',
    plural: 'Ideologias',
    group: 'ideas',
    code: '01',
    shape: 'hexagon',
    color: '--color-accent',
    icon: 'ideology',
  },
  {
    id: 'person',
    label: 'Pessoa',
    plural: 'Pessoas',
    group: 'ideas',
    code: '02',
    shape: 'circle',
    color: '--color-info',
    icon: 'person',
  },
  {
    id: 'concept',
    label: 'Conceito',
    plural: 'Conceitos',
    group: 'ideas',
    code: '03',
    shape: 'diamond',
    color: '--color-steel',
    icon: 'concept',
  },
  {
    id: 'work',
    label: 'Obra',
    plural: 'Obras',
    group: 'culture',
    code: '04',
    shape: 'square',
    color: '--color-warning',
    icon: 'work',
  },
  {
    id: 'event',
    label: 'Acontecimento',
    plural: 'Acontecimentos',
    group: 'culture',
    code: '05',
    shape: 'ring',
    color: '--color-orange-strong',
    icon: 'event',
  },
  {
    id: 'organization',
    label: 'Organização',
    plural: 'Organizações',
    group: 'territories',
    code: '06',
    shape: 'triangle',
    color: '--color-moss',
    icon: 'institution',
  },
  {
    id: 'party',
    label: 'Partido',
    plural: 'Partidos',
    group: 'territories',
    code: '07',
    shape: 'bar',
    color: '--color-violet',
    icon: 'party',
  },
  {
    id: 'country',
    label: 'País',
    plural: 'Países',
    group: 'territories',
    code: '08',
    shape: 'shield',
    color: '--color-indigo',
    icon: 'polity',
  },
  {
    id: 'polity',
    label: 'Formação política',
    plural: 'Formações políticas',
    group: 'territories',
    code: '09',
    shape: 'cross',
    color: '--color-archive',
    icon: 'polity',
  },
  {
    id: 'place',
    label: 'Lugar',
    plural: 'Lugares',
    group: 'territories',
    code: '10',
    shape: 'pin',
    color: '--color-cartographic',
    icon: 'place',
  },
];

const kindByEntityKind: Partial<Record<EntityKind, NetworkKindId>> = {
  ideology: 'ideology',
  person: 'person',
  work: 'work',
  article: 'work',
  institution: 'organization',
  party: 'party',
  event: 'event',
  place: 'place',
  'historical-polity': 'polity',
  government: 'polity',
  concept: 'concept',
  policy: 'concept',
};

/**
 * The source graph still carries some countries, cities, books and concepts under a broader
 * Wikidata default (`institution` or `concept`). Until the extraction is reclassified, these
 * reviewed ids correct the graph family without changing the record itself.
 */
export const networkKindOverrides: Readonly<Record<string, NetworkKindId>> = {
  // Countries and territories
  'wiki-topic-australia': 'country',
  'wiki-topic-grecia': 'country',
  'wiki-topic-hungria': 'country',
  'wiki-topic-lituania': 'country',
  'wiki-topic-polonia': 'country',
  'wiki-topic-suecia': 'country',
  'wiki-topic-turquia': 'country',
  'wiki-topic-ucrania': 'country',
  'wiki-topic-canada': 'country',
  'wiki-topic-escocia': 'country',
  'wiki-topic-uniao-sovietica': 'country',
  'wiki-topic-porto-rico': 'place',
  // Historical polities
  'wiki-topic-alemanha-nazista': 'polity',
  // Cities
  'wiki-topic-porto-alegre': 'place',
  'wiki-topic-santos': 'place',
  'wiki-topic-barcelona': 'place',
  'wiki-topic-berlim': 'place',
  'wiki-topic-budapeste': 'place',
  'wiki-topic-buenos-aires': 'place',
  'wiki-topic-genebra': 'place',
  'wiki-topic-havana': 'place',
  'wiki-topic-londres': 'place',
  'wiki-topic-nova-iorque': 'place',
  'wiki-topic-sao-paulo': 'place',
  // Books and documents
  'wiki-topic-carta-das-nacoes-unidas': 'work',
  'wiki-topic-discurso-sobre-a-origem-e-os-fundamentos-da-desigualdade-entre-os-homens': 'work',
  'wiki-topic-paula-livro': 'work',
  'wiki-topic-a-arte-da-guerra-maquiavel': 'work',
  'wiki-topic-constituicao-brasileira-de-1988': 'work',
  // Events
  'wiki-topic-diretas-ja': 'event',
  'wiki-topic-conspiracao-dos-iguais': 'event',
  // Organizations
  'wiki-topic-congresso-dos-estados-unidos': 'organization',
  'wiki-topic-congresso-nacional-do-brasil': 'organization',
  // Concepts that arrived as institutions
  'wiki-topic-cooperativismo': 'concept',
  'wiki-topic-iluminismo': 'concept',
  'wiki-topic-renascimento': 'concept',
  'wiki-topic-ateismo': 'concept',
  'wiki-topic-autocracia': 'concept',
  'wiki-topic-vanguarda': 'concept',
  'wiki-topic-governo': 'concept',
  'wiki-topic-sindicato': 'concept',
  'wiki-topic-associacao': 'concept',
  'wiki-topic-confederacao': 'concept',
  'wiki-topic-empresa-estatal': 'concept',
  'wiki-topic-capitalismo': 'concept',
  'wiki-topic-democracia-liberal': 'concept',
  'wiki-topic-burocracia': 'concept',
  'wiki-topic-estado-socialista': 'concept',
  'wiki-topic-bolsa-escola': 'concept',
  'wiki-topic-tribo': 'concept',
  'wiki-topic-britanicos': 'concept',
  'wiki-topic-despotismo': 'concept',
  'wiki-topic-ditadura-militar': 'concept',
  'wiki-topic-evangelicalismo': 'concept',
  'wiki-topic-manufatura': 'concept',
  'wiki-topic-monarquia': 'concept',
  'wiki-topic-narodnik': 'concept',
  'wiki-topic-nova-direita': 'concept',
  'wiki-topic-nova-esquerda': 'concept',
  'wiki-topic-oligarquia': 'concept',
  'wiki-topic-presidencialismo': 'concept',
  'wiki-topic-realismo': 'concept',
  'wiki-topic-reformismo': 'concept',
  'wiki-topic-romantismo': 'concept',
  'wiki-topic-unipartidarismo': 'concept',
  // Political families
  'wiki-topic-bolchevique': 'party',
  'wiki-topic-menchevique': 'party',
};

export function networkKindOf(kind: EntityKind): NetworkKindId {
  return kindByEntityKind[kind] ?? 'concept';
}

export function networkKindOfEntity(entity: {
  id: string;
  kind: EntityKind;
  placeType?: 'place' | 'country' | 'regime';
  description?: string;
}): NetworkKindId {
  const override = networkKindOverrides[entity.id];
  if (override) return override;
  const description = entity.description ?? '';
  // The source graph often omits `placeType`; the record description still names the country.
  if (/^(país|estado soberano)\b/i.test(description)) return 'country';
  if (/^capital\b/i.test(description)) return 'place';
  if (entity.kind === 'place' && entity.placeType === 'country') return 'country';
  if (entity.kind === 'place' && entity.placeType === 'regime') return 'polity';
  return networkKindOf(entity.kind);
}

export function networkKindDefinition(id: NetworkKindId): NetworkKindDefinition {
  return networkKinds.find((kind) => kind.id === id) ?? networkKinds[networkKinds.length - 1];
}

/** Relation families: one colour and one dash pattern each, so colour is never the only cue. */
export type RelationFamilyId =
  | 'influenced'
  | 'rupture'
  | 'participation'
  | 'creation'
  | 'continuity'
  | 'documented'
  | 'connection';

export interface RelationFamilyDefinition {
  id: RelationFamilyId;
  label: string;
  /** One sentence explaining what the family groups. */
  note: string;
  color: string;
  /** SVG stroke-dasharray; empty for a solid line. */
  dash: string;
  directed: boolean;
}

export const relationFamilies: readonly RelationFamilyDefinition[] = [
  {
    id: 'influenced',
    label: 'Influência',
    note: 'Uma corrente, pessoa ou obra influenciou outra.',
    color: '--color-accent',
    dash: '',
    directed: true,
  },
  {
    id: 'rupture',
    label: 'Ruptura',
    note: 'Uma posição se formou contra outra.',
    color: '--color-orange-strong',
    dash: '3 3',
    directed: true,
  },
  {
    id: 'participation',
    label: 'Atuação',
    note: 'Participação, militância, cargo ou governo.',
    color: '--color-info',
    dash: '6 3',
    directed: true,
  },
  {
    id: 'creation',
    label: 'Criação',
    note: 'Fundação de uma organização ou autoria de uma obra.',
    color: '--color-moss',
    dash: '',
    directed: true,
  },
  {
    id: 'continuity',
    label: 'Continuidade',
    note: 'Uma forma se desdobrou, sucedeu ou veio depois de outra.',
    color: '--color-cartographic',
    dash: '12 4',
    directed: true,
  },
  {
    id: 'documented',
    label: 'Relação documentada',
    note: 'Associação histórica registrada numa fonte, sem um verbo mais específico.',
    color: '--color-indigo',
    dash: '1 4',
    directed: false,
  },
  {
    id: 'connection',
    label: 'Conexão',
    note: 'Vínculo de catálogo, localização, associação editorial ou link de navegação.',
    color: '--color-border-strong',
    dash: '1 3',
    directed: false,
  },
];

/** Relation `type` values (current and expected) per family. `reverse` flips the arrow. */
const familyByType: Record<string, { family: RelationFamilyId; reverse?: boolean }> = {
  influenced: { family: 'influenced' },
  influence: { family: 'influenced' },
  causal_claim: { family: 'influenced' },
  'causal-claim': { family: 'influenced' },
  event_influenced_ideology: { family: 'influenced' },
  influenced_by: { family: 'influenced', reverse: true },
  reacted_against: { family: 'rupture' },
  participated_in: { family: 'participation' },
  member_of: { family: 'participation' },
  governed: { family: 'participation' },
  founded: { family: 'creation' },
  founded_by: { family: 'creation', reverse: true },
  wrote: { family: 'creation' },
  authored: { family: 'creation' },
  developed_into: { family: 'continuity' },
  succeeded: { family: 'continuity' },
  preceded_by: { family: 'continuity' },
  documented_association: { family: 'documented' },
  'documented-association': { family: 'documented' },
  associated_with: { family: 'connection' },
  related_to: { family: 'connection' },
  occurred_in: { family: 'connection' },
  located_in: { family: 'connection' },
  editorial_link: { family: 'connection' },
  'editorial-link': { family: 'connection' },
  encyclopedic_link: { family: 'connection' },
  'encyclopedic-link': { family: 'connection' },
};

export function relationFamilyDefinition(id: RelationFamilyId): RelationFamilyDefinition {
  return relationFamilies.find((family) => family.id === id) ?? relationFamilies.at(-1)!;
}

export interface NetworkNode {
  id: string;
  slug: string;
  title: string;
  kind: NetworkKindId;
  /** One short sentence taken from the summary. */
  definition: string;
  summary: string;
  collections: string[];
  /** Years, when known, for the panel. */
  period: string | null;
  inReview: boolean;
  claims: NetworkClaim[];
  degree: number;
  /** Incident edges counted by relation nature, so navigation is not mistaken for evidence. */
  connections: Record<RelationNature, number>;
  /** Distinct neighbours of any nature. */
  distinctNeighbours: number;
  /** Distinct neighbours reached through each relation nature. */
  natureNeighbours: Record<RelationNature, number>;
}

/**
 * How well a link is grounded. Catalogue entries and navigation links are never presented as
 * documented influence: the reader sees the nature next to the phrase.
 */
export type RelationNature = 'stated' | 'catalogue' | 'navigation' | 'editorial';

export interface RelationNatureDefinition {
  id: RelationNature;
  label: string;
  /** One sentence for the reader about what this nature does and does not say. */
  note: string;
  /** Lower comes first when links are listed. */
  rank: number;
}

export const relationNatures: readonly RelationNatureDefinition[] = [
  {
    id: 'stated',
    label: 'Afirmado em fonte',
    note: 'Uma fonte de referência afirma esta relação, no texto indicado.',
    rank: 0,
  },
  {
    id: 'editorial',
    label: 'Ligação editorial',
    note: 'Associação feita pela edição do ATLAS para situar o tema, sem tese histórica própria.',
    rank: 1,
  },
  {
    id: 'catalogue',
    label: 'Registro de catálogo',
    note: 'Classificação de um catálogo colaborativo. Mostra associação, não influência documentada.',
    rank: 2,
  },
  {
    id: 'navigation',
    label: 'Ligação de navegação',
    note: 'Os verbetes se citam, mas isso não diz que um influenciou o outro.',
    rank: 3,
  },
];

export function relationNatureDefinition(id: RelationNature): RelationNatureDefinition {
  return relationNatures.find((nature) => nature.id === id) ?? relationNatures[0];
}

/**
 * Weights behind label relevance. A relation documented by a source is the strongest signal; an
 * editorial bridge situates the theme; a catalogue classification only suggests association; a
 * navigation link says nothing about historical importance and earns no prominence.
 */
export const labelNatureWeights: Readonly<Record<RelationNature, number>> = {
  stated: 1,
  editorial: 0.4,
  catalogue: 0.12,
  navigation: 0,
};

/**
 * Relevance for naming a node on the map. It combines documented connections, distinct neighbours,
 * cross-collection presence and editorial completeness. Raw degree is deliberately not used: a
 * catalogue or navigation hub would otherwise outrank a documented thinker. Popularity of links is
 * not historical importance.
 */
export function labelRelevance(node: NetworkNode): number {
  const edgeWeight = (nature: RelationNature) =>
    node.connections[nature] * labelNatureWeights[nature];
  const neighbourWeight = (nature: RelationNature) =>
    node.natureNeighbours[nature] * labelNatureWeights[nature] * 1.4;
  const documented =
    edgeWeight('stated') * 3 +
    edgeWeight('editorial') * 1.2 +
    edgeWeight('catalogue') * 0.4 +
    edgeWeight('navigation');
  const neighbours =
    neighbourWeight('stated') +
    neighbourWeight('editorial') +
    neighbourWeight('catalogue') +
    neighbourWeight('navigation');
  const crossCollection = Math.max(0, node.collections.length - 1) * 0.8;
  const completeness = node.inReview ? 0.85 : 1;
  return Number(((documented + neighbours + crossCollection) * completeness).toFixed(3));
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  family: RelationFamilyId;
  label: string;
  collection: string;
  /** Phrase read from source to target: "influenciou". */
  phrase: string;
  /** Phrase read from target to source: "foi influenciado por". */
  phraseReverse: string;
  /** Short sentence saying why the link exists. */
  context: string;
  nature: RelationNature;
  /** Name of the source of the claim, when the relation records one. */
  sourceName: string | null;
  sourceUrl: string | null;
  uncertainty: string;
}

export interface NetworkCollection {
  id: string;
  title: string;
  count: number;
}

export interface KnowledgeNetwork {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  collections: NetworkCollection[];
}

/** First sentence of a summary, capped so the panel stays scannable. */
export function firstSentence(text: string, limit = 200): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  const match = clean.match(/^.*?[.!?](?=\s|$)/);
  const sentence = match ? match[0] : clean;
  if (sentence.length <= limit) return sentence;
  return sentence.slice(0, limit - 1).replace(/\s+\S*$/, '') + '…';
}

function periodLabel(
  extent: { startYear: number | null; endYear: number | null; label: string | null } | null,
): string | null {
  if (!extent) return null;
  if (extent.label) return extent.label;
  if (extent.startYear === null && extent.endYear === null) return null;
  if (extent.startYear !== null && extent.endYear !== null)
    return `${extent.startYear}–${extent.endYear}`;
  return extent.startYear !== null ? `desde ${extent.startYear}` : `até ${extent.endYear}`;
}

/** Collections about the site itself are not subject matter for readers. */
const hiddenCollections = new Set(['atlas-methodology']);

/** Collection titles as the reader sees them, without notes on how the text was produced. */
export function collectionLabel(title: string): string {
  return title.replace(/\s*\([^)]*(wikip[eé]dia|rascunho)[^)]*\)/i, '').trim();
}

function provenanceName(source: 'wikipedia' | 'wikidata'): string {
  return source === 'wikidata' ? 'Wikidata' : 'Wikipédia';
}

export function natureOf(relation: Relation): RelationNature {
  if (relation.provenance?.source === 'wikidata') return 'catalogue';
  if (relation.type === 'encyclopedic-link') return 'navigation';
  if (relation.type === 'editorial-link') return 'editorial';
  if (relation.provenance) return 'stated';
  return 'editorial';
}

/** Flattens the knowledge graph into one deduplicated network: entities once, relations by id. */
export function buildKnowledgeNetwork(graph: KnowledgeGraph | NetworkGraph): KnowledgeNetwork {
  const atlases = graph.atlases.filter((atlas) => !hiddenCollections.has(atlas.id));
  const nodes = new Map<string, NetworkNode>();
  const claimsByEntity = new Map<string, NetworkClaim[]>();
  for (const atlas of atlases)
    for (const claim of atlas.claims)
      claimsByEntity.set(claim.entityId, [...(claimsByEntity.get(claim.entityId) ?? []), claim]);
  for (const atlas of atlases) {
    for (const entity of atlas.entities) {
      const existing = nodes.get(entity.id);
      if (existing) {
        if (!existing.collections.includes(atlas.id)) existing.collections.push(atlas.id);
        continue;
      }
      nodes.set(entity.id, {
        id: entity.id,
        slug: entity.slug,
        title: entity.title,
        kind: networkKindOfEntity({
          id: entity.id,
          kind: entity.kind,
          placeType: entity.kind === 'place' ? entity.placeType : undefined,
          description: entity.discoveryMetadata?.description ?? undefined,
        }),
        definition: firstSentence(entity.summary),
        summary: entity.summary,
        collections: [atlas.id],
        period: periodLabel(entity.temporalExtent),
        inReview: entity.editorialStatus === 'pending' || entity.editorialStatus === 'draft',
        claims: claimsByEntity.get(entity.id) ?? [],
        degree: 0,
        connections: { stated: 0, editorial: 0, catalogue: 0, navigation: 0 },
        distinctNeighbours: 0,
        natureNeighbours: { stated: 0, editorial: 0, catalogue: 0, navigation: 0 },
      });
    }
  }
  const edges = new Map<string, NetworkEdge>();
  for (const atlas of atlases) {
    for (const relation of atlas.relations) {
      if (edges.has(relation.id)) continue;
      if (!nodes.has(relation.fromEntityId) || !nodes.has(relation.toEntityId)) continue;
      const mapped = familyByType[relation.type] ?? { family: 'connection' as const };
      const reverse = !!mapped.reverse;
      edges.set(relation.id, {
        id: relation.id,
        source: mapped.reverse ? relation.toEntityId : relation.fromEntityId,
        target: mapped.reverse ? relation.fromEntityId : relation.toEntityId,
        family: mapped.family,
        label: relation.label,
        collection: atlas.id,
        phrase: reverse ? relation.reverseLabel : relation.label,
        phraseReverse: reverse ? relation.label : relation.reverseLabel,
        context: relation.context,
        nature: natureOf(relation),
        sourceName: relation.provenance ? provenanceName(relation.provenance.source) : null,
        sourceUrl: relation.provenance?.url ?? null,
        uncertainty: relation.uncertainty,
      });
    }
  }
  const neighbours = new Map<string, Set<string>>();
  const natureNeighbours = new Map<string, Record<RelationNature, Set<string>>>();
  for (const id of nodes.keys()) {
    neighbours.set(id, new Set());
    natureNeighbours.set(id, {
      stated: new Set(),
      editorial: new Set(),
      catalogue: new Set(),
      navigation: new Set(),
    });
  }
  for (const edge of edges.values()) {
    const source = nodes.get(edge.source)!;
    const target = nodes.get(edge.target)!;
    source.degree++;
    target.degree++;
    source.connections[edge.nature]++;
    target.connections[edge.nature]++;
    neighbours.get(edge.source)!.add(edge.target);
    neighbours.get(edge.target)!.add(edge.source);
    natureNeighbours.get(edge.source)![edge.nature].add(edge.target);
    natureNeighbours.get(edge.target)![edge.nature].add(edge.source);
  }
  for (const node of nodes.values()) {
    node.distinctNeighbours = neighbours.get(node.id)!.size;
    const byNature = natureNeighbours.get(node.id)!;
    node.natureNeighbours = {
      stated: byNature.stated.size,
      editorial: byNature.editorial.size,
      catalogue: byNature.catalogue.size,
      navigation: byNature.navigation.size,
    };
  }
  const collections = atlases.map((atlas) => ({
    id: atlas.id,
    title: collectionLabel(atlas.title),
    count: atlas.entities.length,
  }));
  return { nodes: [...nodes.values()], edges: [...edges.values()], collections };
}

export interface NetworkFilter {
  kinds: ReadonlySet<NetworkKindId>;
  families: ReadonlySet<RelationFamilyId>;
  collections: ReadonlySet<string>;
  onlyConnected: boolean;
}

export interface VisibleNetwork {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

/** Applies the type and collection filters. A hidden kind removes its edges too. */
export function filterNetwork(network: KnowledgeNetwork, filter: NetworkFilter): VisibleNetwork {
  const byKind = network.nodes.filter(
    (node) =>
      filter.kinds.has(node.kind) && node.collections.some((id) => filter.collections.has(id)),
  );
  const ids = new Set(byKind.map((node) => node.id));
  // A relation in this cut of the map brings its endpoints along, even when one of them was
  // catalogued in another collection. Otherwise a root or a bridge disappears and its links
  // are dropped with it.
  const joining = network.edges.filter(
    (edge) =>
      filter.families.has(edge.family) &&
      filter.collections.has(edge.collection) &&
      (ids.has(edge.source) || ids.has(edge.target)),
  );
  const pulled = new Set(joining.flatMap((edge) => [edge.source, edge.target]));
  const nodes = network.nodes.filter(
    (node) => ids.has(node.id) || (pulled.has(node.id) && filter.kinds.has(node.kind)),
  );
  const kept = new Set(nodes.map((node) => node.id));
  const edges = network.edges.filter(
    (edge) =>
      filter.families.has(edge.family) &&
      kept.has(edge.source) &&
      kept.has(edge.target) &&
      // Keep the old cross-collection links between two visible records.
      (filter.collections.has(edge.collection) || (ids.has(edge.source) && ids.has(edge.target))),
  );
  if (!filter.onlyConnected) return { nodes, edges };
  const connected = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
  return { nodes: nodes.filter((node) => connected.has(node.id)), edges };
}

function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Nodes whose title matches the query, best matches (prefix, then connections) first. */
export function searchNodes(
  nodes: readonly NetworkNode[],
  query: string,
  limit = 8,
): NetworkNode[] {
  const needle = fold(query.trim());
  if (!needle) return [];
  return nodes
    .map((node) => {
      const title = fold(node.title);
      const at = title.indexOf(needle);
      return { node, rank: at === 0 ? 0 : at > 0 ? 1 : 2 };
    })
    .filter((hit) => hit.rank < 2)
    .sort((a, b) => a.rank - b.rank || b.node.degree - a.node.degree)
    .slice(0, limit)
    .map((hit) => hit.node);
}

export interface NodeLink {
  edge: NetworkEdge;
  other: NetworkNode;
  outgoing: boolean;
}

export function linksOf(
  id: string,
  edges: readonly NetworkEdge[],
  nodes: ReadonlyMap<string, NetworkNode>,
): NodeLink[] {
  const links: NodeLink[] = [];
  for (const edge of edges) {
    if (edge.source !== id && edge.target !== id) continue;
    const other = nodes.get(edge.source === id ? edge.target : edge.source);
    if (other) links.push({ edge, other, outgoing: edge.source === id });
  }
  return links.sort(
    (a, b) =>
      relationNatureDefinition(a.edge.nature).rank - relationNatureDefinition(b.edge.nature).rank ||
      b.other.degree - a.other.degree,
  );
}

const positionPattern = /\b(esquerda|direita|centro|extrema|progressist|conservador)/i;

/** Claims that place an ideology on the political spectrum come first; each stays attributed. */
export function rankClaims(claims: readonly NetworkClaim[]): NetworkClaim[] {
  return [...claims].sort(
    (a, b) => Number(positionPattern.test(b.text)) - Number(positionPattern.test(a.text)),
  );
}

export function positionClaims(node: NetworkNode): NetworkClaim[] {
  return rankClaims(node.claims);
}

export interface NetworkPoint {
  x: number;
  y: number;
}

export interface NetworkLayout {
  positions: Map<string, NetworkPoint>;
  width: number;
  height: number;
  /** Where each group of entries sits, for the soft areas drawn behind them. */
  regions: NetworkRegion[];
}

/** Largest on-screen growth of a node shape; the layout reserves room for it. */
export const MAX_NODE_SCALE = 1.25;
const NODE_GAP = 26;

/** Shapes stay readable at any zoom: larger when zoomed out, smaller when zoomed in. */
export function nodeScaleFor(zoom: number): number {
  return Math.min(MAX_NODE_SCALE, Math.max(0.6, 1 / Math.sqrt(zoom)));
}

/** Space a node keeps for itself in the layout, including its largest on-screen size. */
export function nodeClearance(degree: number): number {
  return nodeRadius(degree) * MAX_NODE_SCALE + NODE_GAP / 2;
}

export interface NetworkRegion {
  id: string;
  x: number;
  y: number;
  radius: number;
  count: number;
}

/** Node radius grows with connections, within a readable range. */
export function nodeRadius(degree: number): number {
  return Math.min(13, 4.5 + Math.sqrt(degree) * 1.7);
}
