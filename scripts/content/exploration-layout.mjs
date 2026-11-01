// Build-only geometry. Positions communicate arrangement, never historical distance.
export function buildExplorationLayout(graph) {
  const all = graph.atlases.flatMap((a) => a.entities);
  const relations = graph.atlases
    .flatMap((a) => a.relations)
    .sort((a, b) => a.id.localeCompare(b.id));
  const parallel = new Map();
  for (const relation of relations) {
    const key = `${relation.fromEntityId}:${relation.toEntityId}`;
    const group = parallel.get(key) ?? [];
    group.push(relation.id);
    parallel.set(key, group);
  }
  const networks = {};
  for (const [key, entries] of [['all', all], ...graph.atlases.map((a) => [a.id, a.entities])]) {
    const ordered = [...entries].sort(
      (a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id),
    );
    const nodes = Object.fromEntries(
      ordered.map((e, i) => [e.id, { x: 115 + (i % 3) * 320, y: 55 + Math.floor(i / 3) * 85 }]),
    );
    const edges = Object.fromEntries(
      relations
        .filter((r) => nodes[r.fromEntityId] && nodes[r.toEntityId])
        .map((r) => {
          const a = nodes[r.fromEntityId];
          const b = nodes[r.toEntityId];
          const group = parallel.get(`${r.fromEntityId}:${r.toEntityId}`);
          const offset = (group.indexOf(r.id) - (group.length - 1) / 2) * 24;
          return [
            r.id,
            `M ${a.x} ${a.y} C ${a.x + 85} ${a.y - 30 + offset}, ${b.x - 85} ${b.y - 30 + offset}, ${b.x} ${b.y}`,
          ];
        }),
    );
    networks[key] = {
      height: Math.max(260, Math.ceil(ordered.length / 3) * 85 + 30),
      nodes,
      edges,
    };
    // Each local view is compiled once. Filtering hides nodes without moving those retained.
    for (const root of ordered) {
      const links = relations.filter(
        (r) =>
          nodes[r.fromEntityId] &&
          nodes[r.toEntityId] &&
          (r.fromEntityId === root.id || r.toEntityId === root.id),
      );
      const neighborIds = new Set(links.flatMap((r) => [r.fromEntityId, r.toEntityId]));
      const neighbors = ordered.filter((e) => e.id !== root.id && neighborIds.has(e.id));
      const height = Math.max(360, Math.ceil(neighbors.length / 2) * 90 + 60);
      const localNodes = Object.fromEntries(
        neighbors.map((e, i) => [
          e.id,
          {
            x: i % 2 === 0 ? 145 : 775,
            y: 60 + Math.floor(i / 2) * 90,
          },
        ]),
      );
      localNodes[root.id] = { x: 460, y: height / 2 };
      const localEdges = Object.fromEntries(
        links.map((r) => {
          const a = localNodes[r.fromEntityId];
          const b = localNodes[r.toEntityId];
          const group = parallel.get(`${r.fromEntityId}:${r.toEntityId}`);
          const offset = (group.indexOf(r.id) - (group.length - 1) / 2) * 24;
          return [
            r.id,
            `M ${a.x} ${a.y} Q ${(a.x + b.x) / 2} ${(a.y + b.y) / 2 - 35 + offset}, ${b.x} ${b.y}`,
          ];
        }),
      );
      networks[`focus:${key}:${root.id}`] = { height, nodes: localNodes, edges: localEdges };
    }
  }
  const years = all
    .flatMap((e) => [e.temporalExtent?.startYear, e.temporalExtent?.endYear])
    .filter((y) => y != null);
  const first = Math.min(...years);
  const last = Math.max(...years);
  const position = (year) => (first === last ? 50 : 4 + ((year - first) / (last - first)) * 92);
  const tickYears = years.length
    ? [
        ...new Set(
          Array.from({ length: 5 }, (_, i) => Math.round(first + ((last - first) * i) / 4)),
        ),
      ]
    : [];
  const markers = Object.fromEntries(
    all.flatMap((e) => {
      const extent = e.temporalExtent;
      const known = [extent?.startYear, extent?.endYear].filter((y) => y != null);
      if (!known.length) return [];
      const start = Math.min(...known),
        end = Math.max(...known);
      return [
        [
          e.id,
          {
            x: position(start),
            width: position(end) - position(start),
            partial: extent.startYear === null || extent.endYear === null,
          },
        ],
      ];
    }),
  );
  return {
    networks,
    timeline: { ticks: tickYears.map((year) => ({ year, x: position(year) })), markers },
  };
}
