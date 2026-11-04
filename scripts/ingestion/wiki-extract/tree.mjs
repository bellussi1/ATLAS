// Regras da árvore de ideologias extraída da Wikidata (P279, subclasse de).
// Usado antes de gravar cada arquivo em `tree/` e pelos testes em `tree.spec.mjs`.

export const MAX_DEPTH = 5;
export const MAX_NODES_PER_LEVEL = 20;

const qidPattern = /^Q\d+$/;

/** Retorna as violações das regras; lista vazia significa árvore válida. */
export function treeViolations(tree) {
  const violations = [];
  const nodes = Array.isArray(tree.nodes) ? tree.nodes : [];
  const edges = Array.isArray(tree.edges) ? tree.edges : [];
  const byQid = new Map();

  for (const node of nodes) {
    if (!qidPattern.test(node.qid)) violations.push(`QID inválido: ${node.qid}`);
    if (byQid.has(node.qid)) violations.push(`QID duplicado: ${node.qid}`);
    byQid.set(node.qid, node);
    if (!Number.isInteger(node.depth) || node.depth < 0 || node.depth > MAX_DEPTH)
      violations.push(`profundidade fora do limite em ${node.qid}: ${node.depth}`);
    if (!Number.isInteger(node.sitelinks) || node.sitelinks < 0)
      violations.push(`sitelinks inválido em ${node.qid}`);
    if (!node.labels || !('pt' in node.labels) || !('en' in node.labels))
      violations.push(`rótulos pt/en ausentes em ${node.qid}`);
  }

  if (nodes.filter((node) => node.depth === 0).length !== 1 || byQid.get(tree.root)?.depth !== 0)
    violations.push(`a raiz ${tree.root} deve ser o único nó na profundidade 0`);
  for (let depth = 1; depth <= MAX_DEPTH; depth += 1) {
    const count = nodes.filter((node) => node.depth === depth).length;
    if (count > MAX_NODES_PER_LEVEL)
      violations.push(`salto ${depth} tem ${count} nós (máximo ${MAX_NODES_PER_LEVEL})`);
  }

  const seenEdges = new Set();
  for (const edge of edges) {
    if (edge.property !== 'P279') violations.push(`propriedade inesperada: ${edge.property}`);
    const child = byQid.get(edge.child);
    const parent = byQid.get(edge.parent);
    if (!child || !parent) {
      violations.push(`aresta aponta para nó inexistente: ${edge.child} -> ${edge.parent}`);
      continue;
    }
    const key = `${edge.child}>${edge.parent}`;
    if (seenEdges.has(key)) violations.push(`aresta duplicada: ${key}`);
    seenEdges.add(key);
    if (child.depth > parent.depth + 1) violations.push(`profundidade inconsistente em ${key}`);
  }

  for (const node of nodes.filter((item) => item.depth > 0)) {
    const hasParentOneLevelUp = edges.some(
      (edge) => edge.child === node.qid && byQid.get(edge.parent)?.depth === node.depth - 1,
    );
    if (!hasParentOneLevelUp) violations.push(`nó ${node.qid} sem pai no salto anterior`);
  }

  const cycle = findCycle(edges);
  if (cycle) violations.push(`ciclo: ${cycle.join(' -> ')}`);
  return violations;
}

/** Procura ciclo na direção child -> parent; devolve o caminho do ciclo ou null. */
function findCycle(edges) {
  const parentsOf = new Map();
  for (const { child, parent } of edges)
    parentsOf.set(child, [...(parentsOf.get(child) ?? []), parent]);
  const state = new Map();
  const stack = [];
  const visit = (qid) => {
    if (state.get(qid) === 2) return null;
    if (state.get(qid) === 1) return [...stack.slice(stack.indexOf(qid)), qid];
    state.set(qid, 1);
    stack.push(qid);
    for (const parent of parentsOf.get(qid) ?? []) {
      const found = visit(parent);
      if (found) return found;
    }
    stack.pop();
    state.set(qid, 2);
    return null;
  };
  for (const qid of parentsOf.keys()) {
    const found = visit(qid);
    if (found) return found;
  }
  return null;
}
