import type { NetworkGraph } from '@core/content/models/content-artifacts';
import { networkGraphSchema } from '@core/content/models/content-artifacts';
import type { Relation } from '@core/content/models/content-schema';
import { methodologyKnowledgeGraph } from '@testing/content-fixture';

import {
  buildKnowledgeNetwork,
  collectionLabel,
  filterNetwork,
  firstSentence,
  labelRelevance,
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
  relationWeightDefinition,
  relationWeightOf,
  relationWeights,
  searchNodes,
} from './knowledge-network';
import { layoutNetwork } from './network-layout';

const network = buildKnowledgeNetwork(methodologyKnowledgeGraph);
const all = {
  kinds: new Set(networkKinds.map((k) => k.id)),
  scopes: new Set(['nucleo', 'contexto', 'fora'] as const),
  families: new Set(relationFamilies.map((f) => f.id)),
  collections: new Set(network.collections.map((c) => c.id)),
  onlyConnected: false,
};

describe('knowledge network', () => {
  it('builds the same network from the slim projection used by /grafos', () => {
    const slim: NetworkGraph = networkGraphSchema.parse({
      id: methodologyKnowledgeGraph.id,
      version: methodologyKnowledgeGraph.version,
      updatedAt: methodologyKnowledgeGraph.updatedAt,
      atlases: methodologyKnowledgeGraph.atlases.map((atlas) => ({
        id: atlas.id,
        title: atlas.title,
        entities: atlas.entities.map((entity) => ({
          id: entity.id,
          slug: entity.slug,
          title: entity.title,
          kind: entity.kind,
          placeType: entity.kind === 'place' ? entity.placeType : undefined,
          summary: entity.summary,
          temporalExtent: entity.temporalExtent,
          editorialStatus: entity.editorialStatus,
          discoveryMetadata: entity.discoveryMetadata
            ? { description: entity.discoveryMetadata.description }
            : undefined,
        })),
        claims: atlas.claims.slice(0, 3).map((claim) => ({
          id: claim.id,
          entityId: claim.entityId,
          text: claim.text,
          classification: claim.classification,
          editorialStatus: claim.editorialStatus,
        })),
        assetLicenses: atlas.assetLicenses,
        relations: atlas.relations,
      })),
    });
    const projected = buildKnowledgeNetwork(slim);
    expect(projected.nodes.map((node) => node.id)).toEqual(network.nodes.map((node) => node.id));
    expect(projected.edges.map((edge) => edge.id)).toEqual(network.edges.map((edge) => edge.id));
    expect(projected.nodes.every((node) => node.claims.length <= 3)).toBe(true);
  });

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

  it('weighs relations by what they assert, not by how they were imported', () => {
    const weigh = (type: string, label: string) => relationWeightOf({ type, label } as Relation);
    expect(weigh('influenced', 'influenciou')).toBe('historical');
    expect(weigh('influenced_by', 'foi influenciado por')).toBe('historical');
    expect(weigh('reacted_against', 'reagiu contra')).toBe('historical');
    expect(weigh('developed_into', 'desenvolveu-se em')).toBe('historical');
    expect(weigh('participated_in', 'participou de')).toBe('action');
    expect(weigh('wrote', 'escreveu')).toBe('action');
    expect(weigh('documented-association', 'fundou')).toBe('action');
    expect(weigh('documented-association', 'governou')).toBe('action');
    expect(weigh('documented-association', 'foi membro de')).toBe('administrative');
    expect(weigh('documented-association', 'está sediado em')).toBe('administrative');
    expect(weigh('associated_with', 'é classificado com a ideologia')).toBe('catalog');
    expect(weigh('encyclopedic-link', 'link de descoberta na Wikipedia')).toBe('catalog');
    expect(relationWeights.filter((weight) => weight.political).map((weight) => weight.id)).toEqual(
      ['historical', 'action'],
    );
    expect(relationWeightDefinition('historical').rank).toBeLessThan(
      relationWeightDefinition('catalog').rank,
    );
  });

  it('counts only historical and action links as political relevance', () => {
    for (const node of network.nodes) {
      const total = Object.values(node.weightConnections).reduce((sum, value) => sum + value, 0);
      expect(total).toBe(node.degree);
      expect(node.politicalConnections).toBe(
        node.weightConnections.historical + node.weightConnections.action,
      );
    }
    const edgesByWeight = network.edges.reduce(
      (sum, edge) => sum + (edge.weight === 'historical' || edge.weight === 'action' ? 1 : 0),
      0,
    );
    const nodesByWeight = network.nodes.reduce((sum, node) => sum + node.politicalConnections, 0);
    expect(nodesByWeight).toBe(edgesByWeight * 2);
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

  it('maps every entity kind to one of the ten legend families', () => {
    expect(networkKindOf('institution')).toBe('organization');
    expect(networkKindOf('historical-polity')).toBe('polity');
    expect(networkKindOf('article')).toBe('work');
    expect(networkKindOfEntity({ id: 'p', kind: 'place', placeType: 'country' })).toBe('country');
    expect(networkKindOfEntity({ id: 'r', kind: 'place', placeType: 'regime' })).toBe('polity');
    expect(networkKindOfEntity({ id: 'c', kind: 'place' })).toBe('place');
    expect(
      networkKindOfEntity({ id: 'p2', kind: 'place', description: 'País da Europa Central.' }),
    ).toBe('country');
    expect(
      networkKindOfEntity({ id: 'p3', kind: 'concept', description: 'Capital da França.' }),
    ).toBe('place');
    expect(networkKindOfEntity({ id: 'p4', kind: 'place', placeCategory: 'country' })).toBe(
      'country',
    );
    expect(networkKindOfEntity({ id: 'p5', kind: 'place', placeCategory: 'state' })).toBe('polity');
    expect(networkKindOfEntity({ id: 'p6', kind: 'place', placeCategory: 'city' })).toBe('place');
    expect(networkKindOfEntity({ id: 'wiki-topic-canada', kind: 'institution' })).toBe('country');
    expect(
      networkKindOfEntity({ id: 'wiki-topic-berlim', kind: 'place', placeCategory: 'city' }),
    ).toBe('place');
    expect(networkKindOfEntity({ id: 'wiki-topic-iluminismo', kind: 'institution' })).toBe(
      'concept',
    );
    expect(networkKinds).toHaveLength(10);
    expect(new Set(networkKinds.map((k) => k.shape)).size).toBe(10);
    expect(new Set(networkKinds.map((k) => k.color)).size).toBe(10);
    expect(new Set(networkKinds.map((k) => k.code)).size).toBe(10);
  });

  it('keeps dated events as events and topic records as concepts', () => {
    expect(networkKindOfEntity({ id: 'event-guerra-da-coreia', kind: 'event' })).toBe('event');
    expect(networkKindOfEntity({ id: 'wiki-topic-aborto', kind: 'concept' })).toBe('concept');
  });

  it('groups relation types into seven readable families', () => {
    expect(relationFamilies.map((family) => family.label)).toEqual([
      'Influência',
      'Ruptura',
      'Atuação',
      'Criação',
      'Continuidade',
      'Relação documentada',
      'Conexão',
    ]);
    const looks = relationFamilies.map((f) => `${f.color}|${f.dash}`);
    expect(new Set(looks).size).toBe(relationFamilies.length);
    expect(network.edges.find((edge) => edge.nature === 'navigation')?.family).toBe('connection');
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

  it('isolates one or two hops around the selected node without touching the layout', () => {
    const root =
      network.nodes.find((node) => node.id === 'person-karl-marx') ??
      network.nodes.find((node) => node.degree >= 4)!;
    const one = filterNetwork(network, {
      ...all,
      neighborhood: { root: root.id, depth: 1 },
    });
    const two = filterNetwork(network, {
      ...all,
      neighborhood: { root: root.id, depth: 2 },
    });
    const full = filterNetwork(network, all);
    expect(one.nodes.some((node) => node.id === root.id)).toBe(true);
    expect(one.nodes.length).toBeGreaterThan(1);
    expect(one.nodes.length).toBeLessThan(full.nodes.length);
    expect(two.nodes.length).toBeGreaterThan(one.nodes.length);
    const ids = new Set(one.nodes.map((node) => node.id));
    for (const edge of one.edges) expect(ids.has(edge.source) && ids.has(edge.target)).toBe(true);
    expect(
      filterNetwork(network, { ...all, neighborhood: { root: 'missing', depth: 1 } }).nodes,
    ).toEqual([]);
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
      family: 'connection',
      collection: 'atlas-a',
    } as unknown as NetworkEdge;
    const cut = filterNetwork(
      { nodes: [root, person], edges: [link], collections: [] },
      { ...all, collections: new Set(['atlas-a']) },
    );
    expect(cut.nodes.map((node) => node.id)).toEqual(['root', 'person']);
    expect(cut.edges).toHaveLength(1);
  });

  it('filters by period and leaves records without dates out of an active interval', () => {
    const node = (id: string, startYear: number | null, endYear: number | null = null) =>
      ({
        id,
        kind: 'person',
        collections: ['atlas-a'],
        temporalExtent: startYear === null ? null : { startYear, endYear },
      }) as unknown as NetworkNode;
    const edge = (id: string, source: string, target: string) =>
      ({
        id,
        source,
        target,
        family: relationFamilies[0].id,
        collection: 'atlas-a',
      }) as unknown as NetworkEdge;
    const network = {
      nodes: [
        node('inside', 1900, 1910),
        node('crosses', 1850, 1905),
        node('outside', 1960),
        node('undated', null),
      ],
      edges: [
        edge('inside-crosses', 'inside', 'crosses'),
        edge('inside-outside', 'inside', 'outside'),
      ],
      collections: [],
    };
    const filter = { ...all, collections: new Set(['atlas-a']) };
    const cut = filterNetwork(network, { ...filter, period: { from: 1900, to: 1950 } });
    expect(cut.nodes.map((item) => item.id)).toEqual(['inside', 'crosses']);
    expect(cut.edges.map((item) => item.id)).toEqual(['inside-crosses']);
    expect(filterNetwork(network, filter).nodes).toHaveLength(4);
  });

  it('finds the shortest route between two nodes and respects the active cut', () => {
    const node = (id: string, kind = 'person') =>
      ({
        id,
        kind,
        collections: ['atlas-a'],
        temporalExtent: null,
      }) as unknown as NetworkNode;
    const edge = (id: string, source: string, target: string) =>
      ({
        id,
        source,
        target,
        family: relationFamilies[0].id,
        collection: 'atlas-a',
      }) as unknown as NetworkEdge;
    const network = {
      nodes: [node('a'), node('b'), node('c'), node('d'), node('e')],
      edges: [edge('ab', 'a', 'b'), edge('bc', 'b', 'c'), edge('cd', 'c', 'd')],
      collections: [],
    };
    const filter = { ...all, collections: new Set(['atlas-a']) };
    const found = filterNetwork(network, { ...filter, path: { from: 'a', to: 'd' } });
    expect(found.path).toEqual({
      nodes: ['a', 'b', 'c', 'd'],
      edges: ['ab', 'bc', 'cd'],
      found: true,
    });
    expect(found.nodes).toHaveLength(5);
    expect(filterNetwork(network, { ...filter, path: { from: 'a', to: 'e' } }).path).toEqual({
      nodes: [],
      edges: [],
      found: false,
    });
    const hidden = filterNetwork(
      {
        ...network,
        nodes: network.nodes.map((item) => (item.id === 'b' ? node('b', 'concept') : item)),
      },
      {
        ...filter,
        kinds: new Set([...filter.kinds].filter((kind) => kind !== 'concept')),
        path: { from: 'a', to: 'd' },
      },
    );
    expect(hidden.path?.found).toBe(false);
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
  }, 60000);

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
