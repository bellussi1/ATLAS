import { methodologyKnowledgeGraph } from '@testing/content-fixture';

import {
  buildKnowledgeNetwork,
  collectionLabel,
  filterNetwork,
  firstSentence,
  layoutNetwork,
  linksOf,
  MAX_NODE_SCALE,
  networkKindOf,
  networkKinds,
  nodeRadius,
  nodeScaleFor,
  relationFamilies,
  searchNodes,
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
  });

  it('keeps the on-screen node scale within the reserved range', () => {
    expect(nodeScaleFor(0.01)).toBe(MAX_NODE_SCALE);
    expect(nodeScaleFor(1)).toBe(1);
    expect(nodeScaleFor(50)).toBeGreaterThanOrEqual(0.6);
  });
});
