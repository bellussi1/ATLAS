import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { MAX_DEPTH, MAX_NODES_PER_LEVEL, treeViolations } from './tree.mjs';

const fixture = {
  name: 'exemplo',
  root: 'Q1',
  nodes: [
    { qid: 'Q1', labels: { pt: 'raiz', en: 'root' }, sitelinks: 100, depth: 0 },
    { qid: 'Q2', labels: { pt: null, en: 'child' }, sitelinks: 50, depth: 1 },
    { qid: 'Q3', labels: { pt: 'neto', en: 'grandchild' }, sitelinks: 10, depth: 2 },
  ],
  edges: [
    { child: 'Q2', parent: 'Q1', property: 'P279' },
    { child: 'Q3', parent: 'Q2', property: 'P279' },
  ],
};

const clone = (value) => structuredClone(value);

test('accepts fixed data that follows every rule, including null pt labels', () => {
  assert.deepEqual(treeViolations(fixture), []);
});

test('rejects a cycle in the child -> parent direction', () => {
  const tree = clone(fixture);
  tree.edges.push({ child: 'Q1', parent: 'Q3', property: 'P279' });
  assert.ok(treeViolations(tree).some((violation) => violation.startsWith('ciclo: ')));
});

test('rejects a self-referencing edge', () => {
  const tree = clone(fixture);
  tree.edges.push({ child: 'Q2', parent: 'Q2', property: 'P279' });
  assert.ok(treeViolations(tree).some((violation) => violation.startsWith('ciclo: ')));
});

test('rejects depth beyond the five-hop limit', () => {
  const tree = clone(fixture);
  tree.nodes.push({
    qid: 'Q9',
    labels: { pt: null, en: null },
    sitelinks: 1,
    depth: MAX_DEPTH + 1,
  });
  assert.ok(
    treeViolations(tree).some((violation) =>
      violation.includes('profundidade fora do limite em Q9'),
    ),
  );
});

test('rejects more than twenty nodes on one hop, and accepts exactly twenty', () => {
  const level = (count) =>
    Array.from({ length: count }, (_, index) => ({
      qid: `Q${100 + index}`,
      labels: { pt: null, en: null },
      sitelinks: index,
      depth: 1,
    }));
  const twenty = { ...clone(fixture), nodes: [fixture.nodes[0], ...level(MAX_NODES_PER_LEVEL)] };
  twenty.edges = level(MAX_NODES_PER_LEVEL).map((node) => ({
    child: node.qid,
    parent: 'Q1',
    property: 'P279',
  }));
  assert.deepEqual(treeViolations(twenty), []);

  const twentyOne = {
    ...clone(fixture),
    nodes: [fixture.nodes[0], ...level(MAX_NODES_PER_LEVEL + 1)],
  };
  assert.ok(
    treeViolations(twentyOne).some((violation) => violation.includes('salto 1 tem 21 nós')),
  );
});

test('rejects an edge that points to a node outside the tree', () => {
  const tree = clone(fixture);
  tree.edges.push({ child: 'Q2', parent: 'Q404', property: 'P279' });
  assert.ok(
    treeViolations(tree).some((violation) => violation.includes('nó inexistente: Q2 -> Q404')),
  );
});

test('rejects QIDs outside the Q<digits> format', () => {
  const tree = clone(fixture);
  tree.nodes[1].qid = 'q2';
  tree.edges = [{ child: 'q2', parent: 'Q1', property: 'P279' }, tree.edges[1]];
  assert.ok(treeViolations(tree).some((violation) => violation.startsWith('QID inválido: q2')));
});

test('rejects a relation that is not P279', () => {
  const tree = clone(fixture);
  tree.edges[0].property = 'P737';
  assert.ok(
    treeViolations(tree).some((violation) => violation.includes('propriedade inesperada: P737')),
  );
});

test('rejects a node without a parent on the previous hop', () => {
  const tree = clone(fixture);
  tree.edges = [tree.edges[0]];
  tree.nodes.push({ qid: 'Q4', labels: { pt: null, en: null }, sitelinks: 1, depth: 2 });
  assert.ok(treeViolations(tree).some((violation) => violation.startsWith('nó Q4 sem pai')));
});

test('rejects missing labels or sitelinks', () => {
  const tree = clone(fixture);
  delete tree.nodes[1].labels.en;
  tree.nodes[2].sitelinks = -1;
  const violations = treeViolations(tree);
  assert.ok(violations.includes('rótulos pt/en ausentes em Q2'));
  assert.ok(violations.includes('sitelinks inválido em Q3'));
});

const roots = {
  marxismo: 'Q7264',
  'social-democracia': 'Q121254',
  liberalismo: 'Q6216',
  anarquismo: 'Q6199',
};

for (const [name, root] of Object.entries(roots)) {
  test(`committed tree for ${name} is valid and rooted at ${root}`, () => {
    const tree = JSON.parse(readFileSync(new URL(`./tree/${name}.json`, import.meta.url), 'utf8'));
    assert.equal(tree.root, root);
    assert.deepEqual(treeViolations(tree), []);
  });
}
