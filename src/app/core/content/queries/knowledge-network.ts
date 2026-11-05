import type {
  Claim,
  EntityKind,
  KnowledgeGraph,
  Relation,
} from '@core/content/models/content-schema';
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceRadial,
  forceSimulation,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from 'd3-force';

/** Node families of the graph page. Each one has a colour, a shape and an icon family. */
export type NetworkKindId =
  'ideology' | 'person' | 'work' | 'organization' | 'party' | 'event' | 'place' | 'concept';

export type NetworkShape =
  'hexagon' | 'circle' | 'square' | 'triangle' | 'bar' | 'ring' | 'pin' | 'diamond';

export interface NetworkKindDefinition {
  id: NetworkKindId;
  label: string;
  plural: string;
  shape: NetworkShape;
  /** CSS custom property holding the node colour. */
  color: string;
  icon: 'ideology' | 'person' | 'work' | 'institution' | 'party' | 'event' | 'place' | 'concept';
}

export const networkKinds: readonly NetworkKindDefinition[] = [
  {
    id: 'ideology',
    label: 'Ideologia',
    plural: 'Ideologias',
    shape: 'hexagon',
    color: '--color-accent',
    icon: 'ideology',
  },
  {
    id: 'person',
    label: 'Pessoa',
    plural: 'Pessoas',
    shape: 'circle',
    color: '--color-info',
    icon: 'person',
  },
  {
    id: 'work',
    label: 'Obra',
    plural: 'Obras',
    shape: 'square',
    color: '--color-warning',
    icon: 'work',
  },
  {
    id: 'organization',
    label: 'Organização',
    plural: 'Organizações',
    shape: 'triangle',
    color: '--color-moss',
    icon: 'institution',
  },
  {
    id: 'party',
    label: 'Partido',
    plural: 'Partidos',
    shape: 'bar',
    color: '--color-violet',
    icon: 'party',
  },
  {
    id: 'event',
    label: 'Acontecimento',
    plural: 'Acontecimentos',
    shape: 'ring',
    color: '--color-orange-strong',
    icon: 'event',
  },
  {
    id: 'place',
    label: 'Lugar',
    plural: 'Lugares',
    shape: 'pin',
    color: '--color-cartographic',
    icon: 'place',
  },
  {
    id: 'concept',
    label: 'Conceito',
    plural: 'Conceitos',
    shape: 'diamond',
    color: '--color-steel',
    icon: 'concept',
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
  country: 'place',
  regime: 'place',
  'historical-polity': 'place',
  government: 'place',
  concept: 'concept',
  policy: 'concept',
};

export function networkKindOf(kind: EntityKind): NetworkKindId {
  return kindByEntityKind[kind] ?? 'concept';
}

export function networkKindDefinition(id: NetworkKindId): NetworkKindDefinition {
  return networkKinds.find((kind) => kind.id === id) ?? networkKinds[networkKinds.length - 1];
}

/** Relation families: one colour and one dash pattern each, so colour is never the only cue. */
export type RelationFamilyId =
  | 'influenced'
  | 'participated'
  | 'member'
  | 'founded'
  | 'wrote'
  | 'developed'
  | 'reacted'
  | 'succeeded'
  | 'governed'
  | 'occurred'
  | 'associated';

export interface RelationFamilyDefinition {
  id: RelationFamilyId;
  label: string;
  color: string;
  /** SVG stroke-dasharray; empty for a solid line. */
  dash: string;
  directed: boolean;
}

export const relationFamilies: readonly RelationFamilyDefinition[] = [
  { id: 'influenced', label: 'Influenciou', color: '--color-accent', dash: '', directed: true },
  {
    id: 'participated',
    label: 'Participou de',
    color: '--color-info',
    dash: '6 3',
    directed: true,
  },
  {
    id: 'member',
    label: 'Foi membro de',
    color: '--color-violet',
    dash: '2 3',
    directed: true,
  },
  { id: 'founded', label: 'Fundou', color: '--color-moss', dash: '', directed: true },
  { id: 'wrote', label: 'Escreveu', color: '--color-warning', dash: '9 3 2 3', directed: true },
  {
    id: 'developed',
    label: 'Desenvolveu-se em',
    color: '--color-cartographic',
    dash: '12 4',
    directed: true,
  },
  {
    id: 'reacted',
    label: 'Reagiu contra',
    color: '--color-orange-strong',
    dash: '3 3',
    directed: true,
  },
  { id: 'succeeded', label: 'Sucedeu', color: '--color-indigo', dash: '8 2', directed: true },
  { id: 'governed', label: 'Governou', color: '--color-danger', dash: '4 2 1 2', directed: true },
  {
    id: 'occurred',
    label: 'Ocorreu em',
    color: '--color-archive',
    dash: '1 4',
    directed: true,
  },
  {
    id: 'associated',
    label: 'Associado a',
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
  participated_in: { family: 'participated' },
  member_of: { family: 'member' },
  founded: { family: 'founded' },
  founded_by: { family: 'founded', reverse: true },
  wrote: { family: 'wrote' },
  authored: { family: 'wrote' },
  developed_into: { family: 'developed' },
  reacted_against: { family: 'reacted' },
  succeeded: { family: 'succeeded' },
  preceded_by: { family: 'succeeded' },
  governed: { family: 'governed' },
  occurred_in: { family: 'occurred' },
  located_in: { family: 'occurred' },
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
  claims: Claim[];
  degree: number;
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
export function buildKnowledgeNetwork(graph: KnowledgeGraph): KnowledgeNetwork {
  const atlases = graph.atlases.filter((atlas) => !hiddenCollections.has(atlas.id));
  const nodes = new Map<string, NetworkNode>();
  const claimsByEntity = new Map<string, Claim[]>();
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
        kind: networkKindOf(entity.kind),
        definition: firstSentence(entity.summary),
        summary: entity.summary,
        collections: [atlas.id],
        period: periodLabel(entity.temporalExtent),
        inReview: entity.editorialStatus === 'pending' || entity.editorialStatus === 'draft',
        claims: claimsByEntity.get(entity.id) ?? [],
        degree: 0,
      });
    }
  }
  const edges = new Map<string, NetworkEdge>();
  for (const atlas of atlases) {
    for (const relation of atlas.relations) {
      if (edges.has(relation.id)) continue;
      if (!nodes.has(relation.fromEntityId) || !nodes.has(relation.toEntityId)) continue;
      const mapped = familyByType[relation.type] ?? { family: 'associated' as const };
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
  for (const edge of edges.values()) {
    nodes.get(edge.source)!.degree++;
    nodes.get(edge.target)!.degree++;
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
  const edges = network.edges.filter(
    (edge) => filter.families.has(edge.family) && ids.has(edge.source) && ids.has(edge.target),
  );
  if (!filter.onlyConnected) return { nodes: byKind, edges };
  const connected = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
  return { nodes: byKind.filter((node) => connected.has(node.id)), edges };
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

export interface PathStep {
  edge: NetworkEdge;
  from: string;
  to: string;
}

/**
 * Shortest chain of links between two nodes (breadth-first, links read in either direction).
 * Returns null when they are not connected; an empty list when both are the same node.
 */
export function shortestPath(
  fromId: string,
  toId: string,
  edges: readonly NetworkEdge[],
): PathStep[] | null {
  if (fromId === toId) return [];
  const adjacent = new Map<string, { edge: NetworkEdge; other: string }[]>();
  for (const edge of edges) {
    adjacent.set(edge.source, [...(adjacent.get(edge.source) ?? []), { edge, other: edge.target }]);
    adjacent.set(edge.target, [...(adjacent.get(edge.target) ?? []), { edge, other: edge.source }]);
  }
  const previous = new Map<string, { edge: NetworkEdge; from: string }>();
  const queue = [fromId];
  const seen = new Set([fromId]);
  for (const current of queue) {
    for (const { edge, other } of adjacent.get(current) ?? []) {
      if (seen.has(other)) continue;
      seen.add(other);
      previous.set(other, { edge, from: current });
      if (other === toId) {
        const steps: PathStep[] = [];
        for (let at = toId; at !== fromId;) {
          const step = previous.get(at)!;
          steps.unshift({ edge: step.edge, from: step.from, to: at });
          at = step.from;
        }
        return steps;
      }
      queue.push(other);
    }
  }
  return null;
}

const positionPattern = /\b(esquerda|direita|centro|extrema|progressist|conservador)/i;

/** Claims that place an ideology on the political spectrum come first; each stays attributed. */
export function positionClaims(node: NetworkNode): Claim[] {
  return [...node.claims].sort(
    (a, b) => Number(positionPattern.test(b.text)) - Number(positionPattern.test(a.text)),
  );
}

export interface NetworkPoint {
  x: number;
  y: number;
}

export interface NetworkLayout {
  positions: Map<string, NetworkPoint>;
  width: number;
  height: number;
}

function seeded(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Largest on-screen growth of a node shape; the layout reserves room for it. */
export const MAX_NODE_SCALE = 1.25;
const NODE_GAP = 44;

/** Shapes stay readable at any zoom: larger when zoomed out, smaller when zoomed in. */
export function nodeScaleFor(zoom: number): number {
  return Math.min(MAX_NODE_SCALE, Math.max(0.6, 1 / Math.sqrt(zoom)));
}

/** Space a node keeps for itself in the layout, including its largest on-screen size. */
export function nodeClearance(degree: number): number {
  return nodeRadius(degree) * MAX_NODE_SCALE + NODE_GAP / 2;
}

interface SimNode extends SimulationNodeDatum {
  id: string;
  clearance: number;
  tx: number;
  ty: number;
  /** Nodes without links wait on a ring around the connected core. */
  isolated: boolean;
  /** Linked, but apart from the largest group: pulled toward the centre so they stay near. */
  satellite: boolean;
  /** Square root of the number of links: hubs push harder so their leaves fan out. */
  weight: number;
}

/** Ids of the largest group of linked nodes. */
function mainComponent(edges: readonly NetworkEdge[]): Set<string> {
  const adjacent = new Map<string, string[]>();
  for (const edge of edges) {
    adjacent.set(edge.source, [...(adjacent.get(edge.source) ?? []), edge.target]);
    adjacent.set(edge.target, [...(adjacent.get(edge.target) ?? []), edge.source]);
  }
  let best = new Set<string>();
  const seen = new Set<string>();
  for (const start of adjacent.keys()) {
    if (seen.has(start)) continue;
    const group = new Set([start]);
    seen.add(start);
    for (const id of group)
      for (const next of adjacent.get(id) ?? [])
        if (!seen.has(next)) {
          seen.add(next);
          group.add(next);
        }
    if (group.size > best.size) best = group;
  }
  return best;
}

/**
 * Deterministic force layout (d3-force): links pull, nodes repel, each collection leans toward
 * its own sector and a collision force keeps every shape, at its largest size, apart.
 */
export function layoutNetwork(
  nodes: readonly NetworkNode[],
  edges: readonly NetworkEdge[],
  options: { ticks?: number; seed?: number } = {},
): NetworkLayout {
  const positions = new Map<string, NetworkPoint>();
  const count = nodes.length;
  if (!count) return { positions, width: 0, height: 0 };
  const random = seeded(options.seed ?? 7);
  const span = Math.sqrt(count) * 130;
  const collectionIds = [...new Set(nodes.map((node) => node.collections[0]))];
  const linked = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
  const main = mainComponent(edges);
  const simNodes: SimNode[] = nodes.map((node) => {
    const sector = collectionIds.indexOf(node.collections[0]) / collectionIds.length;
    const angle = sector * Math.PI * 2;
    const own = !linked.has(node.id) || main.has(node.id);
    const tx = own ? Math.cos(angle) * span * 0.2 * 1.4 : 0;
    const ty = own ? Math.sin(angle) * span * 0.2 : 0;
    return {
      id: node.id,
      clearance: nodeClearance(node.degree),
      isolated: !linked.has(node.id),
      satellite: linked.has(node.id) && !main.has(node.id),
      weight: Math.sqrt(node.degree),
      tx,
      ty,
      x: tx + (random() - 0.5) * span * 0.4,
      y: ty + (random() - 0.5) * span * 0.4,
    };
  });
  const coreArea = simNodes
    .filter((n) => !n.isolated)
    .reduce((sum, n) => sum + n.clearance ** 2, 0);
  const coreRadius = Math.sqrt(coreArea / 0.4);
  const ringNeed =
    simNodes.filter((n) => n.isolated).reduce((sum, n) => sum + n.clearance * 2.2, 0) /
    (2 * Math.PI);
  const ringRadius = Math.max(coreRadius + 90, ringNeed);
  const known = new Set(simNodes.map((node) => node.id));
  const links = edges
    .filter((edge) => known.has(edge.source) && known.has(edge.target))
    .map((edge) => ({ source: edge.source, target: edge.target }));
  const simulation = forceSimulation(simNodes)
    .randomSource(random)
    .stop()
    .force(
      'link',
      forceLink<SimNode, { source: string; target: string }>(links)
        .id((node) => node.id)
        .distance(160)
        .strength(0.12),
    )
    .force(
      'charge',
      forceManyBody<SimNode>()
        .strength((node) => -(380 + node.weight * 60))
        .distanceMax(1500),
    )
    .force(
      'x',
      forceX<SimNode>((node) => node.tx).strength((node) =>
        node.isolated ? 0 : node.satellite ? 0.16 : 0.07,
      ),
    )
    .force(
      'y',
      forceY<SimNode>((node) => node.ty).strength((node) =>
        node.isolated ? 0 : node.satellite ? 0.16 : 0.07,
      ),
    )
    .force(
      'ring',
      forceRadial<SimNode>(ringRadius, 0, 0).strength((node) => (node.isolated ? 0.25 : 0)),
    )
    .force('collide', forceCollide<SimNode>((node) => node.clearance + 16).iterations(4));
  const ticks = options.ticks ?? 320;
  for (let i = 0; i < ticks; i++) simulation.tick();
  // A last pass with collisions alone settles any pair the other forces left touching.
  simulation
    .force('link', null)
    .force('charge', null)
    .force('x', null)
    .force('y', null)
    .force('ring', null);
  for (let i = 0; i < 80; i++) simulation.tick();
  const marginX = 160;
  const marginY = 64;
  const minX = Math.min(...simNodes.map((node) => (node.x ?? 0) - node.clearance));
  const minY = Math.min(...simNodes.map((node) => (node.y ?? 0) - node.clearance));
  const maxX = Math.max(...simNodes.map((node) => (node.x ?? 0) + node.clearance));
  const maxY = Math.max(...simNodes.map((node) => (node.y ?? 0) + node.clearance));
  for (const node of simNodes)
    positions.set(node.id, {
      x: (node.x ?? 0) - minX + marginX,
      y: (node.y ?? 0) - minY + marginY,
    });
  return { positions, width: maxX - minX + marginX * 2, height: maxY - minY + marginY * 2 };
}

/** Node radius grows with connections, within a readable range. */
export function nodeRadius(degree: number): number {
  return Math.min(16, 6 + Math.sqrt(degree) * 2.2);
}
