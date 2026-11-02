import assert from 'node:assert/strict';
import { test } from 'node:test';

import { remoteMediaOwners } from './transform.mjs';

const record = (id, kind, file) => ({
  entity: { id, kind },
  item: { claims: file ? { P18: [{ mainsnak: { datavalue: { value: file } } }] } : {} },
});

test('a file shared by several entities belongs to the person, not to the concept that cites it', () => {
  const owners = remoteMediaOwners([
    record('ideology-marxism', 'ideology', 'Karl Marx.jpg'),
    record('concept-scientific-socialism', 'concept', 'Karl Marx.jpg'),
    record('person-karl-marx', 'person', 'Karl Marx.jpg'),
  ]);
  assert.equal(owners.get('Karl Marx.jpg'), 'person-karl-marx');
});

test('the owner does not depend on the order of the records', () => {
  const forward = remoteMediaOwners([
    record('concept-a', 'concept', 'x.jpg'),
    record('person-b', 'person', 'x.jpg'),
  ]);
  const backward = remoteMediaOwners([
    record('person-b', 'person', 'x.jpg'),
    record('concept-a', 'concept', 'x.jpg'),
  ]);
  assert.equal(forward.get('x.jpg'), 'person-b');
  assert.equal(backward.get('x.jpg'), 'person-b');
});

test('distinct files keep their own owners and records without images are ignored', () => {
  const owners = remoteMediaOwners([
    record('person-a', 'person', 'a.jpg'),
    record('person-b', 'person', 'b.jpg'),
    record('work-c', 'work', null),
  ]);
  assert.equal(owners.get('a.jpg'), 'person-a');
  assert.equal(owners.get('b.jpg'), 'person-b');
  assert.equal(owners.size, 2);
});
