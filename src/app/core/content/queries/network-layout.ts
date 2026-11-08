import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from 'd3-force';

import {
  type NetworkEdge,
  type NetworkLayout,
  type NetworkNode,
  type NetworkPoint,
  type NetworkRegion,
  nodeClearance,
} from './knowledge-network';

function seeded(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
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
/**
 * Text features used to place records by context. Titles weigh more than summaries; claims add
 * the vocabulary of each record. Stopwords are dropped so generic prose does not create clusters.
 */
const STOPWORDS = new Set(
  `a o as os um uma uns umas de do da dos das em no na nos nas por pelo pela pelos pelas para com sem sob sobre entre e ou mas que se como quando onde qual quais seu sua seus suas este esta estes estas esse essa esses essas aquele aquela aqueles aquelas é são foi foram ser estar está estão ter tem têm há também não mais muito muita muitos muitas já ainda só apenas mesmo mesma outro outra outros outras todo toda todos todas cada qualquer alguns algumas isso isto aquilo ele ela eles elas eu nós vós você vocês lhes lhe me te vos ao aos à às numa num duma dum etc the of and in to a an is are was were for on with as by from at or that this be has have had not but`.split(
    /\s+/,
  ),
);
const TITLE_WEIGHT = 4;
const CLAIM_WEIGHT = 0.8;
const CONTEXT_TOKENS = 12;
const CONTEXT_NEIGHBOURS = 3;
const MIN_CONTEXT_SIMILARITY = 0.09;
const MAX_TOKEN_DF = 180;
const MAX_POSTINGS = 80;

interface LayoutLink {
  source: string;
  target: string;
  kind: 'relation' | 'context';
  weight: number;
  same: boolean;
}

function folded(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function words(value: string): string[] {
  return folded(value)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word));
}

function textWeights(node: NetworkNode): Map<string, number> {
  const weights = new Map<string, number>();
  const add = (text: string | null | undefined, weight: number) => {
    if (!text) return;
    for (const word of words(text)) weights.set(word, (weights.get(word) ?? 0) + weight);
  };
  add(node.title, TITLE_WEIGHT);
  add(node.summary, 1);
  add(node.definition, 1);
  for (const claim of node.claims ?? []) add(claim.text, CLAIM_WEIGHT);
  return weights;
}

function textVectors(nodes: readonly NetworkNode[]): Map<string, number>[] {
  const raw = nodes.map(textWeights);
  const documentFrequency = new Map<string, number>();
  for (const weights of raw)
    for (const word of weights.keys())
      documentFrequency.set(word, (documentFrequency.get(word) ?? 0) + 1);
  const total = nodes.length;
  return raw.map((weights) => {
    const vector = new Map<string, number>();
    let norm = 0;
    for (const [word, frequency] of weights) {
      const idf = Math.log((total + 1) / ((documentFrequency.get(word) ?? 0) + 1)) + 1;
      const value = (1 + Math.log(frequency)) * idf;
      vector.set(word, value);
      norm += value * value;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [word, value] of vector) vector.set(word, value / norm);
    return vector;
  });
}

function dot(a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>): number {
  let sum = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const [word, value] of small) sum += value * (large.get(word) ?? 0);
  return sum;
}

function normalize(vector: Map<string, number>): void {
  let norm = 0;
  for (const value of vector.values()) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  for (const [word, value] of vector) vector.set(word, value / norm);
}

/** Groups with a vocabulary of their own: k-means on the normalized text vectors. */
function semanticGroups(
  nodes: readonly NetworkNode[],
  vectors: readonly ReadonlyMap<string, number>[],
): Map<string, string> {
  const groups = new Map<string, string>();
  const count = nodes.length;
  const withText = vectors.filter((vector) => vector.size > 0).length;
  if (count < 2 || withText < 2) {
    // Without text there is no semantics to read; keep a stable fallback for the synthetic case.
    const fallback = [...new Set(nodes.map((node) => node.collections[0] ?? 'other'))];
    for (const node of nodes) {
      const id = node.collections[0] ?? 'other';
      groups.set(node.id, `ctx-${fallback.indexOf(id)}`);
    }
    return groups;
  }
  const k = Math.min(18, Math.max(2, Math.round(Math.sqrt(count / 6))));
  const order = [...Array(count).keys()].sort(
    (a, b) => nodes[b]!.degree - nodes[a]!.degree || nodes[a]!.id.localeCompare(nodes[b]!.id),
  );
  const seeds: number[] = [order[0]!];
  const seeded = new Set<number>(seeds);
  while (seeds.length < k && seeds.length < count) {
    let best = -1;
    let worst = Number.POSITIVE_INFINITY;
    for (let i = 0; i < count; i++) {
      if (seeded.has(i)) continue;
      let nearest = Number.NEGATIVE_INFINITY;
      for (const seed of seeds) nearest = Math.max(nearest, dot(vectors[i]!, vectors[seed]!));
      if (
        nearest < worst - 1e-9 ||
        (Math.abs(nearest - worst) <= 1e-9 && (best < 0 || nodes[i]!.id < nodes[best]!.id))
      ) {
        worst = nearest;
        best = i;
      }
    }
    if (best < 0) break;
    seeds.push(best);
    seeded.add(best);
  }
  let centroids = seeds.map((seed) => new Map(vectors[seed]));
  centroids.forEach(normalize);
  const assignment = new Array<number>(count).fill(-1);
  for (let iteration = 0; iteration < 24; iteration++) {
    let changed = false;
    for (let i = 0; i < count; i++) {
      let best = 0;
      let bestScore = Number.NEGATIVE_INFINITY;
      for (let c = 0; c < centroids.length; c++) {
        const score = dot(vectors[i]!, centroids[c]!);
        if (score > bestScore + 1e-9) {
          bestScore = score;
          best = c;
        }
      }
      if (assignment[i] !== best) {
        assignment[i] = best;
        changed = true;
      }
    }
    if (!changed) break;
    const sums = centroids.map(() => new Map<string, number>());
    const sizes = new Array<number>(centroids.length).fill(0);
    for (let i = 0; i < count; i++) {
      const index = assignment[i]!;
      sizes[index] = (sizes[index] ?? 0) + 1;
      for (const [word, value] of vectors[i]!) {
        const sum = sums[index]!;
        sum.set(word, (sum.get(word) ?? 0) + value);
      }
    }
    centroids = sums.map((sum, index) => {
      if (!sizes[index]) return centroids[index]!;
      normalize(sum);
      return sum;
    });
  }
  for (let i = 0; i < count; i++) groups.set(nodes[i]!.id, `ctx-${assignment[i]}`);
  return groups;
}

/** Invisible weak links between records with similar text, so context reaches unlinked nodes. */
function contextLinks(
  nodes: readonly NetworkNode[],
  vectors: readonly ReadonlyMap<string, number>[],
  groupOf: ReadonlyMap<string, string>,
): LayoutLink[] {
  const top = vectors.map((vector) =>
    [...vector].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, CONTEXT_TOKENS),
  );
  const documentFrequency = new Map<string, number>();
  for (const vector of vectors)
    for (const word of vector.keys())
      documentFrequency.set(word, (documentFrequency.get(word) ?? 0) + 1);
  const postings = new Map<string, number[]>();
  top.forEach((tokens, index) => {
    for (const [word] of tokens) {
      if ((documentFrequency.get(word) ?? 0) > MAX_TOKEN_DF) continue;
      const list = postings.get(word) ?? [];
      if (list.length >= MAX_POSTINGS) continue;
      list.push(index);
      postings.set(word, list);
    }
  });
  const links = new Map<string, LayoutLink>();
  for (let i = 0; i < nodes.length; i++) {
    const candidates = new Set<number>();
    for (const [word] of top[i]!) {
      if ((documentFrequency.get(word) ?? 0) > MAX_TOKEN_DF) continue;
      for (const j of postings.get(word) ?? []) if (j !== i) candidates.add(j);
    }
    const nearest = [...candidates]
      .map((j) => ({ j, score: dot(vectors[i]!, vectors[j]!) }))
      .filter((item) => item.score >= MIN_CONTEXT_SIMILARITY)
      .sort((a, b) => b.score - a.score || nodes[a.j]!.id.localeCompare(nodes[b.j]!.id))
      .slice(0, CONTEXT_NEIGHBOURS);
    for (const { j, score } of nearest) {
      const a = Math.min(i, j);
      const b = Math.max(i, j);
      const key = `${a}|${b}`;
      const existing = links.get(key);
      if (existing && existing.weight >= score) continue;
      links.set(key, {
        source: nodes[a]!.id,
        target: nodes[b]!.id,
        kind: 'context',
        weight: score,
        same: groupOf.get(nodes[a]!.id) === groupOf.get(nodes[b]!.id),
      });
    }
  }
  return [...links.values()];
}

/** Step of the even spiral that holds a group: nodes sit about two clearances apart. */
function spiralStep(list: readonly NetworkNode[]): number {
  const mean = list.reduce((sum, node) => sum + nodeClearance(node.degree), 0) / list.length;
  return (2 * (mean + 4)) / 1.9;
}

const GOLDEN_ANGLE = 2.399963229728653;

/**
 * Deterministic layout (d3-force) in two steps. Records are grouped by text similarity, not by
 * collection: first the semantic groups find their places (related ones side by side), then each
 * node settles inside its group. Invisible context links pull similar records together, so a
 * record without a documented relation still sits near the vocabulary it shares with others.
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
  const vectors = textVectors(nodes);
  const groupOf = semanticGroups(nodes, vectors);
  const members = new Map<string, NetworkNode[]>();
  for (const node of nodes) {
    const group = groupOf.get(node.id)!;
    members.set(group, [...(members.get(group) ?? []), node]);
  }
  const context = contextLinks(nodes, vectors, groupOf);
  const attached = new Set([
    ...edges.flatMap((edge) => [edge.source, edge.target]),
    ...context.flatMap((link) => [link.source, link.target]),
  ]);

  // Step 1: places for the semantic groups, nearer when they share links or vocabulary.
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
  const addBetween = (a: string | undefined, b: string | undefined, weight: number) => {
    if (!a || !b || a === b) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    between.set(key, (between.get(key) ?? 0) + weight);
  };
  for (const edge of edges) addBetween(groupOf.get(edge.source), groupOf.get(edge.target), 1);
  for (const link of context)
    addBetween(groupOf.get(link.source), groupOf.get(link.target), link.weight * 0.6);
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
        .strength((link) => Math.min(0.5, 0.03 + link.weight * 0.02)),
    )
    .force('center', forceX<Hub>(0).strength(0.04))
    .force('centerY', forceY<Hub>(0).strength(0.05))
    .force('collide', forceCollide<Hub>((hub) => hub.radius + 28).iterations(4));
  for (let i = 0; i < 300; i++) hubSim.tick();
  const hubById = new Map(hubs.map((hub) => [hub.id, hub]));

  // Step 2: nodes sit on an even spiral inside their group, attached ones in the middle;
  // records with no relation but with a context match move toward that vocabulary.
  const slot = new Map<string, number>();
  const order = new Map<string, number>();
  for (const [group, list] of members) {
    const sorted = [...list].sort(
      (a, b) =>
        Number(attached.has(b.id)) - Number(attached.has(a.id)) ||
        (attached.has(a.id) ? b.degree - a.degree : a.kind.localeCompare(b.kind)) ||
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
    const free = attached.has(node.id);
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
  const links: LayoutLink[] = [
    ...edges
      .filter((edge) => known.has(edge.source) && known.has(edge.target))
      .map((edge) => ({
        source: edge.source,
        target: edge.target,
        kind: 'relation' as const,
        weight: 1,
        same: groupOf.get(edge.source) === groupOf.get(edge.target),
      })),
    ...context.filter((link) => known.has(link.source) && known.has(link.target)),
  ];
  const simulation = forceSimulation(simNodes)
    .randomSource(random)
    .stop()
    .force(
      'link',
      forceLink<SimNode, LayoutLink>(links)
        .id((node) => node.id)
        .distance((link) =>
          link.kind === 'context' ? (link.same ? 56 : 118) : link.same ? 46 : 150,
        )
        .strength((link) =>
          link.kind === 'context'
            ? (link.same ? 0.05 : 0.012) + link.weight * 0.08
            : link.same
              ? 0.35
              : 0.01,
        ),
    )
    .force('charge', forceManyBody<SimNode>().strength(-38).distanceMax(150))
    .force('x', forceX<SimNode>((node) => node.tx).strength(0.08))
    .force('y', forceY<SimNode>((node) => node.ty).strength(0.08))
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
