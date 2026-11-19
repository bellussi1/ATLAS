import type { NetworkClaim, NetworkGraph } from '@core/content/models/content-artifacts';
import type {
  EntityKind,
  KnowledgeGraph,
  PlaceCategory,
  Relation,
  Scope,
} from '@core/content/models/content-schema';
import { classifyRelation, type RelationFamilyId } from '@core/content/queries/relation-category';
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
  // Territories whose source record is still an institution or a broader place.
  'wiki-topic-canada': 'country',
  'wiki-topic-escocia': 'country',
  'wiki-topic-porto-rico': 'place',
  // Historical polities
  'wiki-topic-alemanha-nazista': 'polity',
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
  placeCategory?: PlaceCategory;
  description?: string;
}): NetworkKindId {
  const override = networkKindOverrides[entity.id];
  if (override) return override;
  // The catalogue categories are the source of truth once the record has been classified.
  if (entity.kind === 'place') {
    if (entity.placeCategory === 'country') return 'country';
    if (entity.placeCategory === 'state') return 'polity';
    if (entity.placeCategory) return 'place';
  }
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
export type { RelationFamilyId } from '@core/content/queries/relation-category';

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
    dash: '8 3 2 3',
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
    id: 'affiliation',
    label: 'Filiação',
    note: 'Pertencimento a uma corrente ou movimento, ou defesa de uma ideia ou programa.',
    color: '--color-indigo',
    dash: '1 4',
    directed: true,
  },
  {
    id: 'location',
    label: 'Lugar',
    note: 'Onde algo ocorreu, está sediado ou se insere.',
    color: '--color-border-strong',
    dash: '1 3',
    directed: true,
  },
];

export function relationFamilyDefinition(id: RelationFamilyId): RelationFamilyDefinition {
  return relationFamilies.find((family) => family.id === id) ?? relationFamilies.at(-1)!;
}

export interface NetworkNode {
  id: string;
  slug: string;
  title: string;
  kind: NetworkKindId;
  /** Editorial relevance inside the archive. */
  scope: Scope;
  /** One short sentence taken from the summary. */
  definition: string;
  summary: string;
  collections: string[];
  /** Years, when known, for the panel and the period filter. */
  period: string | null;
  /** Machine-readable years for the period filter; null when the record has no date. */
  temporalExtent: { startYear: number | null; endYear: number | null } | null;
  inReview: boolean;
  claims: NetworkClaim[];
  degree: number;
  /** Incident edges counted by relation nature, so navigation is not mistaken for evidence. */
  connections: Record<RelationNature, number>;
  /** Incident edges counted by what they assert, from history to catalogue. */
  weightConnections: Record<RelationWeight, number>;
  /** Historical and action links; administrative and catalogue links are context. */
  politicalConnections: number;
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

/**
 * What a relation asserts, independently of how well it is sourced. Historical and action links
 * count as political relevance; administrative and catalogue links remain visible as context.
 */
export type RelationWeight = 'historical' | 'action' | 'administrative' | 'catalog';

export interface RelationWeightDefinition {
  id: RelationWeight;
  label: string;
  /** One sentence for the reader about what this weight does and does not say. */
  note: string;
  /** Whether the relation counts as political relevance. */
  political: boolean;
  /** Lower comes first when links are listed. */
  rank: number;
}

export const relationWeights: readonly RelationWeightDefinition[] = [
  {
    id: 'historical',
    label: 'Histórico',
    note: 'Afirma influência, reação ou desenvolvimento entre os registros.',
    political: true,
    rank: 0,
  },
  {
    id: 'action',
    label: 'Ação',
    note: 'Registra o que a pessoa ou a organização fez: fundou, governou, escreveu, participou.',
    political: true,
    rank: 1,
  },
  {
    id: 'administrative',
    label: 'Administrativo',
    note: 'Vínculo de pertencimento, filiação, sede ou sucessão. Não afirma influência.',
    political: false,
    rank: 2,
  },
  {
    id: 'catalog',
    label: 'Catálogo',
    note: 'Classificação ou associação de catálogo. Não afirma relação histórica.',
    political: false,
    rank: 3,
  },
];

export function relationWeightDefinition(id: RelationWeight): RelationWeightDefinition {
  return relationWeights.find((weight) => weight.id === id) ?? relationWeights[3];
}

/** Labels that describe an action even when the relation type is the generic documented one. */
const actionDocumentedLabel =
  /^(fundou|governou|presidiu|promulgou|escreveu|lutou|assumiu|dirigiu|liderou|chefiou|comandou|organizou|criou|assinou|decretou|elegeu|derrubou|instaurou|proclamou|declarou|votou|aprovou)/i;

export function relationWeightOf(relation: Pick<Relation, 'type' | 'label'>): RelationWeight {
  if (
    ['associated_with', 'related_to', 'editorial-link', 'encyclopedic-link'].includes(relation.type)
  )
    return 'catalog';
  if (
    [
      'influence',
      'influenced',
      'influenced_by',
      'reacted_against',
      'developed_into',
      'causal-claim',
      'event_influenced_ideology',
    ].includes(relation.type)
  )
    return 'historical';
  if (['participated_in', 'wrote', 'authored'].includes(relation.type)) return 'action';
  if (relation.type === 'documented-association' && actionDocumentedLabel.test(relation.label))
    return 'action';
  return 'administrative';
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
  /** What the relation asserts: history, action, administration or catalogue. */
  weight: RelationWeight;
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
  return title
    .replace(/\s*\([^)]*(wikip[eé]dia|rascunho)[^)]*\)/i, '')
    .replace(/:\s*registros em revis[aã]o$/i, '')
    .trim();
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
          placeCategory: entity.kind === 'place' ? entity.placeCategory : undefined,
          description: entity.discoveryMetadata?.description ?? undefined,
        }),
        scope: entity.scope ?? 'nucleo',
        definition: firstSentence(entity.summary),
        summary: entity.summary,
        collections: [atlas.id],
        period: periodLabel(entity.temporalExtent),
        temporalExtent: entity.temporalExtent
          ? {
              startYear: entity.temporalExtent.startYear,
              endYear: entity.temporalExtent.endYear,
            }
          : null,
        inReview: entity.editorialStatus === 'pending' || entity.editorialStatus === 'draft',
        claims: claimsByEntity.get(entity.id) ?? [],
        degree: 0,
        connections: { stated: 0, editorial: 0, catalogue: 0, navigation: 0 },
        weightConnections: { historical: 0, action: 0, administrative: 0, catalog: 0 },
        politicalConnections: 0,
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
      const mapped = classifyRelation(relation);
      if (!mapped) continue;
      const reverse = mapped.reverse;
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
        weight: relationWeightOf(relation),
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
    source.weightConnections[edge.weight]++;
    target.weightConnections[edge.weight]++;
    neighbours.get(edge.source)!.add(edge.target);
    neighbours.get(edge.target)!.add(edge.source);
    natureNeighbours.get(edge.source)![edge.nature].add(edge.target);
    natureNeighbours.get(edge.target)![edge.nature].add(edge.source);
  }
  for (const node of nodes.values()) {
    node.distinctNeighbours = neighbours.get(node.id)!.size;
    node.politicalConnections = node.weightConnections.historical + node.weightConnections.action;
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
  scopes: ReadonlySet<Scope>;
  families: ReadonlySet<RelationFamilyId>;
  collections: ReadonlySet<string>;
  onlyConnected: boolean;
  /** Keeps only the connected nodes within `depth` hops of `root`; null shows the whole cut. */
  neighborhood?: { root: string; depth: 1 | 2 } | null;
  /** Inclusive year interval. Nodes without a known year leave the cut while it is active. */
  period?: { from: number | null; to: number | null } | null;
  /** Shortest undirected route between two nodes in the current cut. */
  path?: { from: string; to: string; variant?: number } | null;
}

export interface VisibleNetwork {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  /** Set only when the path filter is active; `found: false` means no route in this cut. */
  path?: {
    nodes: string[];
    edges: string[];
    found: boolean;
    variant?: number;
    totalVariants?: number;
  };
}

/** Whether a node's known interval crosses the inclusive filter. */
function inPeriod(node: NetworkNode, period: { from: number | null; to: number | null }): boolean {
  const extent = node.temporalExtent;
  if (!extent) return false;
  const start = extent.startYear ?? extent.endYear;
  const end = extent.endYear ?? extent.startYear;
  if (start === null || end === null) return false;
  return (period.from === null || end >= period.from) && (period.to === null || start <= period.to);
}

const pathKindFactor: Readonly<Record<string, number>> = {
  person: 0.65,
  work: 0.75,
  event: 0.85,
  party: 0.9,
  institution: 0.95,
  regime: 0.95,
  concept: 1.15,
  ideology: 1.45,
  place: 1.55,
};

const pathWeightFactor: Readonly<Record<RelationWeight, number>> = {
  historical: 0.75,
  action: 0.85,
  administrative: 1.2,
  catalog: 1.55,
};

const pathNatureFactor: Readonly<Record<RelationNature, number>> = {
  stated: 0.85,
  editorial: 1.0,
  catalogue: 1.35,
  navigation: 1.35,
};

function weightedDijkstra(
  nodeMap: ReadonlyMap<string, NetworkNode>,
  adjacency: ReadonlyMap<string, { edge: NetworkEdge; other: string }[]>,
  from: string,
  to: string,
  edgePenalties: ReadonlyMap<string, number>,
  nodePenalties: ReadonlyMap<string, number>,
): { nodes: string[]; edges: string[] } | null {
  const dist = new Map<string, number>([[from, 0]]);
  const previous = new Map<string, { node: string; edge: string }>();
  const visited = new Set<string>();
  const queue: { id: string; cost: number }[] = [{ id: from, cost: 0 }];

  while (queue.length > 0) {
    let bestIdx = 0;
    for (let i = 1; i < queue.length; i++) {
      if (queue[i].cost < queue[bestIdx].cost) bestIdx = i;
    }
    const current = queue.splice(bestIdx, 1)[0];
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    if (current.id === to) break;

    for (const link of adjacency.get(current.id) ?? []) {
      if (visited.has(link.other)) continue;
      const otherNode = nodeMap.get(link.other);
      if (!otherNode) continue;
      const isDest = link.other === to;
      const weight = pathWeightFactor[link.edge.weight] ?? 1.2;
      const nature = pathNatureFactor[link.edge.nature] ?? 1.0;
      const kind = isDest ? 1.0 : (pathKindFactor[otherNode.kind] ?? 1.0);
      const penalty =
        (edgePenalties.get(link.edge.id) ?? 0) +
        (isDest ? 0 : (nodePenalties.get(link.other) ?? 0));
      const nextCost = current.cost + 1 + weight * nature * kind * 0.25 + penalty;
      if (nextCost < (dist.get(link.other) ?? Infinity)) {
        dist.set(link.other, nextCost);
        previous.set(link.other, { node: current.id, edge: link.edge.id });
        queue.push({ id: link.other, cost: nextCost });
      }
    }
  }

  if (!previous.has(to)) return null;
  const pathNodes = [to];
  const pathEdges: string[] = [];
  let cursor = to;
  while (cursor !== from) {
    const step = previous.get(cursor);
    if (!step) return null;
    pathEdges.unshift(step.edge);
    pathNodes.unshift(step.node);
    cursor = step.node;
  }
  return { nodes: pathNodes, edges: pathEdges };
}

/** Weighted shortest undirected routes in the filtered cut, favouring people, works and documented historical/action links. */
function shortestPath(
  nodes: readonly NetworkNode[],
  edges: readonly NetworkEdge[],
  from: string,
  to: string,
  variant = 0,
): NonNullable<VisibleNetwork['path']> {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  if (!nodeMap.has(from) || !nodeMap.has(to)) return { nodes: [], edges: [], found: false };
  if (from === to) return { nodes: [from], edges: [], found: true, variant: 0, totalVariants: 1 };

  const adjacency = new Map<string, { edge: NetworkEdge; other: string }[]>();
  const push = (source: string, target: string, edge: NetworkEdge) => {
    const list = adjacency.get(source) ?? [];
    list.push({ edge, other: target });
    adjacency.set(source, list);
  };
  for (const edge of edges) {
    push(edge.source, edge.target, edge);
    push(edge.target, edge.source, edge);
  }

  const maxVariants = 5;
  const variants: { nodes: string[]; edges: string[] }[] = [];
  const seenSignatures = new Set<string>();
  const edgePenalties = new Map<string, number>();
  const nodePenalties = new Map<string, number>();

  for (let attempt = 0; attempt < maxVariants + 2 && variants.length < maxVariants; attempt++) {
    const candidate = weightedDijkstra(nodeMap, adjacency, from, to, edgePenalties, nodePenalties);
    if (!candidate) break;
    const signature = candidate.edges.join('|');
    if (!seenSignatures.has(signature)) {
      seenSignatures.add(signature);
      variants.push(candidate);
    }
    for (const edgeId of candidate.edges) {
      edgePenalties.set(edgeId, (edgePenalties.get(edgeId) ?? 0) + 4);
    }
    for (let i = 1; i < candidate.nodes.length - 1; i++) {
      const nodeId = candidate.nodes[i];
      nodePenalties.set(nodeId, (nodePenalties.get(nodeId) ?? 0) + 2.5);
    }
  }

  if (variants.length === 0) return { nodes: [], edges: [], found: false };
  const index = ((variant % variants.length) + variants.length) % variants.length;
  return {
    nodes: variants[index].nodes,
    edges: variants[index].edges,
    found: true,
    variant: index,
    totalVariants: variants.length,
  };
}

/** Applies the type, collection, period and connection filters. A hidden kind removes its edges too. */
export function filterNetwork(network: KnowledgeNetwork, filter: NetworkFilter): VisibleNetwork {
  const byKind = network.nodes.filter(
    (node) =>
      filter.scopes.has(node.scope ?? 'nucleo') &&
      filter.kinds.has(node.kind) &&
      node.collections.some((id) => filter.collections.has(id)),
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
    (node) =>
      ids.has(node.id) ||
      (pulled.has(node.id) &&
        filter.scopes.has(node.scope ?? 'nucleo') &&
        filter.kinds.has(node.kind)),
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
  const period = filter.period;
  const periodNodes = period ? nodes.filter((node) => inPeriod(node, period)) : nodes;
  const periodIds = new Set(periodNodes.map((node) => node.id));
  const periodEdges = period
    ? edges.filter((edge) => periodIds.has(edge.source) && periodIds.has(edge.target))
    : edges;
  const connected = filter.onlyConnected
    ? new Set(periodEdges.flatMap((edge) => [edge.source, edge.target]))
    : null;
  const cutNodes = connected ? periodNodes.filter((node) => connected.has(node.id)) : periodNodes;
  const cutEdges = connected
    ? periodEdges.filter((edge) => connected.has(edge.source) && connected.has(edge.target))
    : periodEdges;
  if (filter.path)
    return {
      nodes: cutNodes,
      edges: cutEdges,
      path: shortestPath(cutNodes, cutEdges, filter.path.from, filter.path.to, filter.path.variant),
    };
  if (!filter.neighborhood) return { nodes: cutNodes, edges: cutEdges };
  const { root, depth } = filter.neighborhood;
  // A root hidden by the type, collection or period filters has no neighbourhood to show.
  if (!cutNodes.some((node) => node.id === root)) return { nodes: [], edges: [] };
  const adjacency = new Map<string, Set<string>>();
  for (const edge of cutEdges) {
    let from = adjacency.get(edge.source);
    if (!from) {
      from = new Set();
      adjacency.set(edge.source, from);
    }
    from.add(edge.target);
    let to = adjacency.get(edge.target);
    if (!to) {
      to = new Set();
      adjacency.set(edge.target, to);
    }
    to.add(edge.source);
  }
  const near = new Set([root]);
  let frontier = [root];
  for (let level = 0; level < depth; level += 1) {
    const next: string[] = [];
    for (const id of frontier)
      for (const other of adjacency.get(id) ?? [])
        if (!near.has(other)) {
          near.add(other);
          next.push(other);
        }
    frontier = next;
  }
  return {
    nodes: cutNodes.filter((node) => near.has(node.id)),
    edges: cutEdges.filter((edge) => near.has(edge.source) && near.has(edge.target)),
  };
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
      relationWeightDefinition(a.edge.weight).rank - relationWeightDefinition(b.edge.weight).rank ||
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
