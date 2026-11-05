import type { Claim, EntityKind, KnowledgeGraph } from '@core/content/models/content-schema';

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

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  family: RelationFamilyId;
  label: string;
  collection: string;
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
      edges.set(relation.id, {
        id: relation.id,
        source: mapped.reverse ? relation.toEntityId : relation.fromEntityId,
        target: mapped.reverse ? relation.fromEntityId : relation.toEntityId,
        family: mapped.family,
        label: relation.label,
        collection: atlas.id,
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
  return links.sort((a, b) => b.other.degree - a.other.degree);
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

function seeded(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * Deterministic force layout in a unit space of `width` × `height`: collections start in their
 * own sector, edges pull, nodes repel, a weak gravity keeps components together.
 */
export function layoutNetwork(
  nodes: readonly NetworkNode[],
  edges: readonly NetworkEdge[],
  options: { width: number; height: number; iterations?: number; seed?: number } = {
    width: 1600,
    height: 1000,
  },
): Map<string, NetworkPoint> {
  const { width, height } = options;
  const iterations = options.iterations ?? 220;
  const random = seeded(options.seed ?? 7);
  const count = nodes.length;
  const positions = new Map<string, NetworkPoint>();
  if (!count) return positions;
  const index = new Map(nodes.map((node, i) => [node.id, i]));
  const x = new Float64Array(count);
  const y = new Float64Array(count);
  const collectionIds = [...new Set(nodes.map((node) => node.collections[0]))];
  nodes.forEach((node, i) => {
    const sector = collectionIds.indexOf(node.collections[0]) / collectionIds.length;
    const angle = sector * Math.PI * 2 + random() * 0.9;
    const radius = (0.15 + random() * 0.3) * Math.min(width, height);
    x[i] = width / 2 + Math.cos(angle) * radius * 1.4;
    y[i] = height / 2 + Math.sin(angle) * radius;
  });
  const pairs = edges
    .map((edge) => [index.get(edge.source), index.get(edge.target)] as const)
    .filter(
      (pair): pair is readonly [number, number] => pair[0] !== undefined && pair[1] !== undefined,
    );
  const area = width * height;
  const ideal = Math.sqrt(area / count) * 0.8;
  const fx = new Float64Array(count);
  const fy = new Float64Array(count);
  for (let step = 0; step < iterations; step++) {
    const cooling = 1 - step / iterations;
    const limit = ideal * 0.6 * cooling + 1;
    fx.fill(0);
    fy.fill(0);
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        let dx = x[i] - x[j];
        let dy = y[i] - y[j];
        let distance = dx * dx + dy * dy;
        if (distance < 0.01) {
          dx = random() - 0.5;
          dy = random() - 0.5;
          distance = dx * dx + dy * dy + 0.01;
        }
        if (distance > ideal * ideal * 16) continue;
        const push = (ideal * ideal) / distance;
        fx[i] += dx * push;
        fy[i] += dy * push;
        fx[j] -= dx * push;
        fy[j] -= dy * push;
      }
    }
    for (const [a, b] of pairs) {
      const dx = x[a] - x[b];
      const dy = y[a] - y[b];
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const pull = (distance - ideal * 0.7) / (distance * 3);
      fx[a] -= dx * pull;
      fy[a] -= dy * pull;
      fx[b] += dx * pull;
      fy[b] += dy * pull;
    }
    for (let i = 0; i < count; i++) {
      fx[i] += (width / 2 - x[i]) * 0.01;
      fy[i] += (height / 2 - y[i]) * 0.01 * (width / height);
      const size = Math.hypot(fx[i], fy[i]) || 1;
      const move = Math.min(size, limit);
      x[i] += (fx[i] / size) * move;
      y[i] += (fy[i] / size) * move;
    }
  }
  const minX = Math.min(...x);
  const maxX = Math.max(...x);
  const minY = Math.min(...y);
  const maxY = Math.max(...y);
  const margin = 40;
  const scale = Math.min(
    (width - margin * 2) / Math.max(maxX - minX, 1),
    (height - margin * 2) / Math.max(maxY - minY, 1),
  );
  nodes.forEach((node, i) => {
    positions.set(node.id, {
      x: margin + (x[i] - minX) * scale + (width - margin * 2 - (maxX - minX) * scale) / 2,
      y: margin + (y[i] - minY) * scale + (height - margin * 2 - (maxY - minY) * scale) / 2,
    });
  });
  return positions;
}

/** Node radius grows with connections, within a readable range. */
export function nodeRadius(degree: number): number {
  return Math.min(16, 6 + Math.sqrt(degree) * 2.2);
}
