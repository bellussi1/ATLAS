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
  'historical-polity': 'place',
  government: 'place',
  concept: 'concept',
  policy: 'concept',
};

export function networkKindOf(kind: EntityKind): NetworkKindId {
  return kindByEntityKind[kind] ?? 'concept';
}

export function networkKindOfEntity(entity: { id: string; kind: EntityKind }): NetworkKindId {
  return networkKindOf(entity.kind);
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
        kind: networkKindOfEntity(entity),
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
  /** Where each group of entries sits, for the soft areas drawn behind them. */
  regions: NetworkRegion[];
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
const NODE_GAP = 26;

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
  group: string;
  clearance: number;
  /** Centre of the group this node belongs to. */
  tx: number;
  ty: number;
  linked: boolean;
}

export interface NetworkRegion {
  id: string;
  x: number;
  y: number;
  radius: number;
  count: number;
}

/** Groups smaller than this are merged into one shared region. */
const MIN_REGION = 8;
export const OTHER_REGION = 'other';

/** Region a node is drawn in: its first collection, or the shared one when that is tiny. */
export function regionOf(node: NetworkNode, sizes: ReadonlyMap<string, number>): string {
  const id = node.collections[0];
  return (sizes.get(id) ?? 0) >= MIN_REGION ? id : OTHER_REGION;
}

/** Step of the even spiral that holds a group: nodes sit about two clearances apart. */
function spiralStep(list: readonly NetworkNode[]): number {
  const mean = list.reduce((sum, node) => sum + nodeClearance(node.degree), 0) / list.length;
  return (2 * (mean + 4)) / 1.9;
}

const GOLDEN_ANGLE = 2.399963229728653;

/**
 * Deterministic layout (d3-force) in two steps, like a map of regions: first the regions find
 * their places (related ones side by side, none overlapping), then each node settles inside its
 * own region with even spacing. Nodes without links stay in their region, close to the others.
 */
export function layoutNetwork(
  nodes: readonly NetworkNode[],
  edges: readonly NetworkEdge[],
  options: { ticks?: number; seed?: number } = {},
): NetworkLayout {
  const positions = new Map<string, NetworkPoint>();
  const count = nodes.length;
  if (!count) return { positions, width: 0, height: 0, regions: [] };
  const random = seeded(options.seed ?? 7);
  const sizes = new Map<string, number>();
  for (const node of nodes) {
    const id = node.collections[0];
    sizes.set(id, (sizes.get(id) ?? 0) + 1);
  }
  const groupOf = new Map(nodes.map((node) => [node.id, regionOf(node, sizes)]));
  const members = new Map<string, NetworkNode[]>();
  for (const node of nodes) {
    const group = groupOf.get(node.id)!;
    members.set(group, [...(members.get(group) ?? []), node]);
  }
  const linked = new Set(edges.flatMap((edge) => [edge.source, edge.target]));

  // Step 1: places for the regions, nearer when they share many links.
  interface Hub extends SimulationNodeDatum {
    id: string;
    radius: number;
  }
  const hubs: Hub[] = [...members.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([id, list], index, all) => {
      const angle = (index / all.length) * Math.PI * 2;
      const spread = Math.sqrt(count) * 40;
      return {
        id,
        radius: Math.max(70, spiralStep(list) * Math.sqrt(list.length) + 30),
        x: Math.cos(angle) * spread,
        y: Math.sin(angle) * spread,
      };
    });
  const between = new Map<string, number>();
  for (const edge of edges) {
    const a = groupOf.get(edge.source);
    const b = groupOf.get(edge.target);
    if (!a || !b || a === b) continue;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    between.set(key, (between.get(key) ?? 0) + 1);
  }
  const hubLinks = [...between.entries()].map(([key, weight]) => {
    const [source, target] = key.split('|');
    return { source, target, weight };
  });
  const hubSim = forceSimulation(hubs)
    .randomSource(random)
    .stop()
    .force(
      'link',
      forceLink<Hub, { source: string; target: string; weight: number }>(hubLinks)
        .id((hub) => hub.id)
        .distance(
          (link) =>
            ((link.source as unknown as Hub).radius + (link.target as unknown as Hub).radius) *
              1.05 +
            30,
        )
        .strength((link) => Math.min(0.5, 0.04 + link.weight * 0.02)),
    )
    .force('center', forceX<Hub>(0).strength(0.04))
    .force('centerY', forceY<Hub>(0).strength(0.05))
    .force('collide', forceCollide<Hub>((hub) => hub.radius + 28).iterations(4));
  for (let i = 0; i < 300; i++) hubSim.tick();
  const hubById = new Map(hubs.map((hub) => [hub.id, hub]));

  // Step 2: nodes sit on an even spiral inside their region, linked ones in the middle;
  // unlinked ones stay on the spiral, the rest settle with the forces.
  const slot = new Map<string, number>();
  const order = new Map<string, number>();
  for (const [group, list] of members) {
    const sorted = [...list].sort(
      (a, b) =>
        Number(linked.has(b.id)) - Number(linked.has(a.id)) ||
        (linked.has(a.id) ? b.degree - a.degree : a.kind.localeCompare(b.kind)) ||
        (a.title ?? a.id).localeCompare(b.title ?? b.id),
    );
    sorted.forEach((node, index) => {
      slot.set(node.id, index);
      order.set(group, spiralStep(list));
    });
  }
  const simNodes: SimNode[] = nodes.map((node) => {
    const group = groupOf.get(node.id)!;
    const hub = hubById.get(group)!;
    const index = slot.get(node.id)!;
    const step = order.get(group)!;
    const reach = step * Math.sqrt(index + 0.5);
    const angle = index * GOLDEN_ANGLE;
    const x = (hub.x ?? 0) + Math.cos(angle) * reach;
    const y = (hub.y ?? 0) + Math.sin(angle) * reach;
    const free = linked.has(node.id);
    return {
      id: node.id,
      group,
      clearance: nodeClearance(node.degree),
      linked: free,
      tx: hub.x ?? 0,
      ty: hub.y ?? 0,
      x,
      y,
      fx: free ? undefined : x,
      fy: free ? undefined : y,
    };
  });
  const known = new Set(simNodes.map((node) => node.id));
  const links = edges
    .filter((edge) => known.has(edge.source) && known.has(edge.target))
    .map((edge) => ({
      source: edge.source,
      target: edge.target,
      same: groupOf.get(edge.source) === groupOf.get(edge.target),
    }));
  const simulation = forceSimulation(simNodes)
    .randomSource(random)
    .stop()
    .force(
      'link',
      forceLink<SimNode, { source: string; target: string; same: boolean }>(links)
        .id((node) => node.id)
        .distance((link) => (link.same ? 46 : 150))
        .strength((link) => (link.same ? 0.35 : 0.01)),
    )
    .force('charge', forceManyBody<SimNode>().strength(-45).distanceMax(140))
    .force('x', forceX<SimNode>((node) => node.tx).strength(0.09))
    .force('y', forceY<SimNode>((node) => node.ty).strength(0.09))
    .force('collide', forceCollide<SimNode>((node) => node.clearance + 6).iterations(3));
  const ticks = options.ticks ?? 260;
  for (let i = 0; i < ticks; i++) simulation.tick();
  // A last pass with collisions alone settles any pair the other forces left touching.
  simulation.force('link', null).force('charge', null).force('x', null).force('y', null);
  for (let i = 0; i < 60; i++) simulation.tick();

  const marginX = 160;
  const marginY = 100;
  const minX = Math.min(...simNodes.map((node) => (node.x ?? 0) - node.clearance));
  const minY = Math.min(...simNodes.map((node) => (node.y ?? 0) - node.clearance));
  const maxX = Math.max(...simNodes.map((node) => (node.x ?? 0) + node.clearance));
  const maxY = Math.max(...simNodes.map((node) => (node.y ?? 0) + node.clearance));
  const shiftX = marginX - minX;
  const shiftY = marginY - minY;
  for (const node of simNodes)
    positions.set(node.id, { x: (node.x ?? 0) + shiftX, y: (node.y ?? 0) + shiftY });
  const regions: NetworkRegion[] = [...members.keys()].map((id) => {
    const own = simNodes.filter((node) => node.group === id);
    const cx = own.reduce((sum, node) => sum + (node.x ?? 0), 0) / own.length;
    const cy = own.reduce((sum, node) => sum + (node.y ?? 0), 0) / own.length;
    const reach = Math.max(
      ...own.map((node) => Math.hypot((node.x ?? 0) - cx, (node.y ?? 0) - cy)),
    );
    return { id, x: cx + shiftX, y: cy + shiftY, radius: reach + 46, count: own.length };
  });
  return {
    positions,
    width: maxX - minX + marginX * 2,
    height: maxY - minY + marginY * 2,
    regions,
  };
}

/** Node radius grows with connections, within a readable range. */
export function nodeRadius(degree: number): number {
  return Math.min(13, 4.5 + Math.sqrt(degree) * 1.7);
}
