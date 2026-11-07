import type { Relation } from '@core/content/models/content-schema';
import { methodologyKnowledgeGraph } from '@testing/content-fixture';

import {
  buildKnowledgeNetwork,
  collectionLabel,
  filterNetwork,
  firstSentence,
  labelRelevance,
  layoutNetwork,
  linksOf,
  MAX_NODE_SCALE,
  natureOf,
  type NetworkEdge,
  networkKindOf,
  networkKindOfEntity,
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

  it('counts incident edges and distinct neighbours by relation nature', () => {
    for (const node of network.nodes) {
      const total = Object.values(node.connections).reduce((sum, value) => sum + value, 0);
      expect(total).toBe(node.degree);
      expect(node.distinctNeighbours).toBeGreaterThanOrEqual(
        Math.max(...Object.values(node.natureNeighbours)),
      );
    }
    const stated = network.edges.find((edge) => edge.nature === 'stated')!;
    expect(
      network.nodes.find((node) => node.id === stated.source)!.connections.stated,
    ).toBeGreaterThan(0);
  });

  it('ranks documented relations above catalogue and navigation links', () => {
    const base = network.nodes.find((node) => node.degree > 0)!;
    const empty = { stated: 0, editorial: 0, catalogue: 0, navigation: 0 };
    const node = (
      connections: Partial<Record<keyof typeof empty, number>>,
      natureNeighbours: Partial<Record<keyof typeof empty, number>>,
      extra: Partial<NetworkNode> = {},
    ): NetworkNode => ({
      ...base,
      degree: Object.values(connections).reduce((sum, value) => sum + (value ?? 0), 0),
      connections: { ...empty, ...connections },
      natureNeighbours: { ...empty, ...natureNeighbours },
      distinctNeighbours: Object.values(natureNeighbours).reduce(
        (sum, value) => sum + (value ?? 0),
        0,
      ),
      collections: ['atlas-test'],
      inReview: false,
      ...extra,
    });
    const documented = node({ stated: 4 }, { stated: 4 });
    const catalogue = node({ catalogue: 12 }, { catalogue: 12 });
    const navigation = node({ navigation: 30 }, { navigation: 30 });
    expect(labelRelevance(documented)).toBeGreaterThan(labelRelevance(catalogue));
    expect(labelRelevance(catalogue)).toBeGreaterThan(labelRelevance(navigation));
    expect(
      labelRelevance(node({ stated: 4 }, { stated: 4 }, { collections: ['a', 'b'] })),
    ).toBeGreaterThan(labelRelevance(documented));
    expect(labelRelevance({ ...documented, inReview: true })).toBeLessThan(
      labelRelevance(documented),
    );
  });

  it('maps every entity kind to one of the eight legend families', () => {
    expect(networkKindOf('institution')).toBe('organization');
    expect(networkKindOf('historical-polity')).toBe('place');
    expect(networkKindOf('article')).toBe('work');
    expect(networkKinds).toHaveLength(8);
    expect(new Set(networkKinds.map((k) => k.shape)).size).toBe(8);
    expect(new Set(networkKinds.map((k) => k.color)).size).toBe(8);
  });

  it('keeps dated events as events and topic records as concepts', () => {
    expect(networkKindOfEntity({ id: 'event-guerra-da-coreia', kind: 'event' })).toBe('event');
    expect(networkKindOfEntity({ id: 'wiki-topic-aborto', kind: 'concept' })).toBe('concept');
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

  it('pulls the endpoints of a scoped relation into the cut', () => {
    const person = {
      id: 'person',
      kind: 'person',
      collections: ['atlas-a'],
    } as unknown as NetworkNode;
    const root = {
      id: 'root',
      kind: 'ideology',
      collections: ['atlas-b'],
    } as unknown as NetworkNode;
    const link = {
      id: 'link',
      source: 'root',
      target: 'person',
      family: 'associated',
      collection: 'atlas-a',
    } as unknown as NetworkEdge;
    const cut = filterNetwork(
      { nodes: [root, person], edges: [link], collections: [] },
      { ...all, collections: new Set(['atlas-a']) },
    );
    expect(cut.nodes.map((node) => node.id)).toEqual(['root', 'person']);
    expect(cut.edges).toHaveLength(1);
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

  it('groups nodes by text context instead of collection', () => {
    const layout = layoutNetwork(network.nodes, network.edges);
    const collections = new Set(network.nodes.flatMap((node) => node.collections));
    expect(layout.regions.length).toBeGreaterThan(0);
    expect(layout.regions.every((region) => region.id.startsWith('ctx-'))).toBe(true);
    expect(layout.regions.some((region) => collections.has(region.id))).toBe(false);
  }, 30000);

  it('returns one semantic region per context group', () => {
    const { regions } = layoutNetwork(network.nodes, network.edges);
    expect(regions.length).toBeGreaterThan(0);
    expect(new Set(regions.map((region) => region.id)).size).toBe(regions.length);
  }, 30000);

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
