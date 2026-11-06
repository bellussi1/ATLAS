import type { Relation } from '@core/content/models/content-schema';
import { methodologyKnowledgeGraph } from '@testing/content-fixture';

import {
  buildKnowledgeNetwork,
  collectionLabel,
  filterNetwork,
  firstSentence,
  layoutNetwork,
  linksOf,
  MAX_NODE_SCALE,
  natureOf,
  type NetworkEdge,
  networkKindOf,
  networkKinds,
  type NetworkNode,
  nodeRadius,
  nodeScaleFor,
  relationFamilies,
  searchNodes,
  shortestPath,
} from './knowledge-network';

const network = buildKnowledgeNetwork(methodologyKnowledgeGraph);
const all = {
  kinds: new Set(networkKinds.map((k) => k.id)),
  families: new Set(relationFamilies.map((f) => f.id)),
  collections: new Set(network.collections.map((c) => c.id)),
  onlyConnected: false,
};

describe('knowledge network', () => {
  it('lists each entity once and keeps only edges between known nodes', () => {
    const ids = network.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const edge of network.edges) {
      expect(ids).toContain(edge.source);
      expect(ids).toContain(edge.target);
    }
    expect(network.nodes.reduce((sum, n) => sum + n.degree, 0)).toBe(network.edges.length * 2);
  });

  it('maps every entity kind to one of the eight legend families', () => {
    expect(networkKindOf('institution')).toBe('organization');
    expect(networkKindOf('historical-polity')).toBe('place');
    expect(networkKindOf('article')).toBe('work');
    expect(networkKinds).toHaveLength(8);
    expect(new Set(networkKinds.map((k) => k.shape)).size).toBe(8);
    expect(new Set(networkKinds.map((k) => k.color)).size).toBe(8);
  });

  it('gives each relation family its own colour or dash pattern', () => {
    const looks = relationFamilies.map((f) => `${f.color}|${f.dash}`);
    expect(new Set(looks).size).toBe(relationFamilies.length);
  });

  it('filters by kind, collection and connection, dropping edges of hidden nodes', () => {
    const first = network.nodes[0];
    const hidden = filterNetwork(network, {
      ...all,
      kinds: new Set([...all.kinds].filter((k) => k !== first.kind)),
    });
    expect(hidden.nodes.some((n) => n.kind === first.kind)).toBe(false);
    const ids = new Set(hidden.nodes.map((n) => n.id));
    for (const edge of hidden.edges)
      expect(ids.has(edge.source) && ids.has(edge.target)).toBe(true);
    expect(filterNetwork(network, { ...all, collections: new Set() }).nodes).toEqual([]);
    const connected = filterNetwork(network, { ...all, onlyConnected: true });
    expect(connected.nodes.every((n) => n.degree > 0)).toBe(true);
  });

  it('searches names ignoring case and accents', () => {
    const node = network.nodes[0];
    const hits = searchNodes(network.nodes, node.title.toUpperCase());
    expect(hits.map((n) => n.id)).toContain(node.id);
    expect(searchNodes(network.nodes, '   ')).toEqual([]);
    expect(searchNodes(network.nodes, 'zzzz-inexistente')).toEqual([]);
  });

  it('lists the links of a node with their direction', () => {
    const edge = network.edges[0];
    const index = new Map(network.nodes.map((n) => [n.id, n]));
    const links = linksOf(edge.source, network.edges, index);
    expect(links.find((l) => l.edge.id === edge.id)?.outgoing).toBe(true);
  });

  it('shows collection titles without production notes and omits site-internal collections', () => {
    expect(collectionLabel('Marxismo (rascunhos da Wikipédia)')).toBe('Marxismo');
    expect(collectionLabel('Atlas do Liberalismo')).toBe('Atlas do Liberalismo');
    expect(network.collections.some((c) => c.id === 'atlas-methodology')).toBe(false);
    expect(network.collections.every((c) => !/wikip[eé]dia/i.test(c.title))).toBe(true);
  });

  it('cuts a summary at the first sentence', () => {
    expect(firstSentence('Primeira frase. Segunda frase.')).toBe('Primeira frase.');
    expect(firstSentence('a'.repeat(400), 50).length).toBeLessThanOrEqual(50);
  });

  it('lays nodes out deterministically and never lets two shapes touch', () => {
    const a = layoutNetwork(network.nodes, network.edges);
    const b = layoutNetwork(network.nodes, network.edges);
    expect([...a.positions.entries()]).toEqual([...b.positions.entries()]);
    expect(a.positions.size).toBe(network.nodes.length);
    for (const { x, y } of a.positions.values()) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(a.width);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(a.height);
    }
    const items = network.nodes.map((n) => ({ n, p: a.positions.get(n.id)! }));
    for (let i = 0; i < items.length; i++)
      for (let j = i + 1; j < items.length; j++) {
        const distance = Math.hypot(items[i].p.x - items[j].p.x, items[i].p.y - items[j].p.y);
        const needed =
          (nodeRadius(items[i].n.degree) + nodeRadius(items[j].n.degree)) * MAX_NODE_SCALE;
        expect(distance).toBeGreaterThanOrEqual(needed);
      }
    expect(layoutNetwork([], []).positions.size).toBe(0);
  }, 30000);

  it('puts nodes without links on a ring around the connected core', () => {
    const layout = layoutNetwork(network.nodes, network.edges);
    const linked = new Set(network.edges.flatMap((e) => [e.source, e.target]));
    const center = { x: layout.width / 2, y: layout.height / 2 };
    const radius = (id: string) =>
      Math.hypot(layout.positions.get(id)!.x - center.x, layout.positions.get(id)!.y - center.y);
    const core = network.nodes.filter((n) => linked.has(n.id)).map((n) => radius(n.id));
    const isolated = network.nodes.filter((n) => !linked.has(n.id)).map((n) => radius(n.id));
    expect(isolated.length).toBeGreaterThan(0);
    const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
    expect(mean(isolated)).toBeGreaterThan(mean(core));
  });

  it('keeps the on-screen node scale within the reserved range', () => {
    expect(nodeScaleFor(0.01)).toBe(MAX_NODE_SCALE);
    expect(nodeScaleFor(1)).toBe(1);
    expect(nodeScaleFor(50)).toBeGreaterThanOrEqual(0.6);
  });

  it('tells catalogue entries and navigation links apart from statements in a source', () => {
    const base = { type: 'influenced', evidenceIds: [] } as unknown as Relation;
    const from = (patch: Partial<Relation>) => ({ ...base, ...patch }) as Relation;
    const provenance = (source: 'wikipedia' | 'wikidata') => ({
      source,
      url: 'https://example.org',
      retrievedAt: '2026-01-01',
    });
    expect(natureOf(from({ provenance: provenance('wikidata') }))).toBe('catalogue');
    expect(natureOf(from({ provenance: provenance('wikipedia') }))).toBe('stated');
    expect(natureOf(from({ type: 'encyclopedic-link', provenance: provenance('wikipedia') }))).toBe(
      'navigation',
    );
    expect(natureOf(from({ type: 'editorial-link' }))).toBe('editorial');
  });

  it('reads each link from both sides and records why it exists', () => {
    for (const edge of network.edges) {
      expect(edge.phrase.length).toBeGreaterThan(0);
      expect(edge.phraseReverse.length).toBeGreaterThan(0);
      expect(edge.context.length).toBeGreaterThan(0);
    }
  });

  it('finds the shortest chain between two nodes in either direction', () => {
    const edge = (id: string, source: string, target: string) =>
      ({ id, source, target }) as unknown as NetworkEdge;
    const edges = [
      edge('1', 'a', 'b'),
      edge('2', 'c', 'b'),
      edge('3', 'c', 'd'),
      edge('4', 'a', 'd'),
    ];
    expect(shortestPath('a', 'a', edges)).toEqual([]);
    expect(shortestPath('a', 'c', edges)?.map((step) => step.edge.id)).toHaveLength(2);
    expect(shortestPath('a', 'd', edges)?.map((step) => step.edge.id)).toEqual(['4']);
    expect(shortestPath('a', 'z', edges)).toBeNull();
  });

  it('keeps small linked groups close to the main group instead of drifting away', () => {
    const node = (id: string) =>
      ({ id, kind: 'person', collections: ['c'], degree: 1 }) as unknown as NetworkNode;
    const edge = (id: string, source: string, target: string) =>
      ({ id, source, target }) as unknown as NetworkEdge;
    const main = Array.from({ length: 40 }, (_, i) => `m${i}`);
    const nodes = [...main, 'x1', 'x2'].map(node);
    const edges = [
      ...main.slice(1).map((id, i) => edge(`e${i}`, main[i], id)),
      edge('far', 'x1', 'x2'),
    ];
    const { positions } = layoutNetwork(nodes, edges);
    const points = main.map((id) => positions.get(id)!);
    const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    const reach = Math.max(...points.map((p) => Math.hypot(p.x - cx, p.y - cy)));
    const pair = positions.get('x1')!;
    expect(Math.hypot(pair.x - cx, pair.y - cy)).toBeLessThanOrEqual(reach * 1.25);
  });

  it('lays out a graph of about 700 entries and 1000 links within a time budget', () => {
    const count = 700;
    const nodes = Array.from(
      { length: count },
      (_, i) =>
        ({
          id: `n${i}`,
          kind: 'person',
          collections: [`c${i % 12}`],
          degree: 0,
        }) as unknown as NetworkNode,
    );
    let state = 12345;
    const next = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
    const edges = Array.from({ length: 1000 }, (_, i) => {
      const source = Math.floor(next() * 500);
      const target = Math.floor(next() * 500);
      nodes[source].degree++;
      nodes[target].degree++;
      return {
        id: `e${i}`,
        source: `n${source}`,
        target: `n${(target + (source === target ? 1 : 0)) % 500}`,
      };
    }) as unknown as NetworkEdge[];
    const started = performance.now();
    const { positions } = layoutNetwork(nodes, edges);
    const elapsed = performance.now() - started;
    console.info(`layout of ${count} nodes and ${edges.length} links: ${Math.round(elapsed)} ms`);
    expect(positions.size).toBe(count);
    expect(elapsed).toBeLessThan(8000);
  }, 30000);
});
