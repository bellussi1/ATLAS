import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  callApi,
  candidateRecord,
  classify,
  claimYear,
  fetchEntities,
  searchIds,
} from './discovery.mjs';
import { selectCandidates, toConfigEntities } from './selection.mjs';

const claim = (value) => [{ mainsnak: { datavalue: { value } } }];

test('search follows continuation until the last page and removes duplicates', async () => {
  const pages = [
    { query: { search: [{ title: 'Q1' }, { title: 'Q2' }] }, continue: { sroffset: 50 } },
    { query: { search: [{ title: 'Q2' }, { title: 'Q3' }] } },
  ];
  const offsets = [];
  const fakeFetch = async (url) => {
    offsets.push(new URL(url).searchParams.get('sroffset'));
    return pages.shift();
  };
  assert.deepEqual(await searchIds('haswbstatement:P1142=Q7264', fakeFetch), ['Q1', 'Q2', 'Q3']);
  assert.deepEqual(offsets, ['0', '50']);
});

test('transient API overload is retried and a permanent error is reported', async () => {
  let calls = 0;
  const flaky = async () => {
    calls += 1;
    return calls < 3 ? { error: { code: 'cirrussearch-too-busy-error' } } : { ok: true };
  };
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => originalSetTimeout(fn, 0);
  try {
    assert.deepEqual(await callApi('https://www.wikidata.org/w/api.php?x', flaky), { ok: true });
    assert.equal(calls, 3);
    await assert.rejects(
      callApi('https://www.wikidata.org/w/api.php?y', async () => ({
        error: { code: 'badvalue' },
      })),
      /recusou/,
    );
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

test('entities are fetched in batches and missing entries are skipped', async () => {
  const ids = Array.from({ length: 51 }, (_, i) => `Q${i + 1}`);
  const batches = [];
  const fakeFetch = async (url) => {
    const requested = new URL(url).searchParams.get('ids').split('|');
    batches.push(requested.length);
    return {
      entities: Object.fromEntries(
        requested.map((id) => [id, id === 'Q2' ? { id: 'Q2', missing: '' } : { id }]),
      ),
    };
  };
  const entities = await fetchEntities(ids, fakeFetch);
  assert.deepEqual(batches, [50, 1]);
  assert.equal(entities.has('Q2'), false);
  assert.equal(entities.size, 50);
});

test('instance-of decides the kind and claims give years', () => {
  const person = {
    claims: { P31: claim({ id: 'Q5' }), P569: claim({ time: '+1818-05-05T00:00:00Z' }) },
  };
  const ideology = { claims: { P279: claim({ id: 'Q7264' }) } };
  const unknown = { claims: { P31: claim({ id: 'Q999' }) } };
  assert.equal(classify(person), 'person');
  assert.equal(classify(ideology), 'ideology');
  assert.equal(classify(unknown), 'other');
  assert.equal(claimYear(person, 'P569'), 1818);
  assert.equal(claimYear(person, 'P570'), null);
  assert.equal(
    claimYear({ claims: { P569: claim({ time: '-0044-03-15T00:00:00Z' }) } }, 'P569'),
    -44,
  );
});

test('candidate records keep labels, sitelinks and the roles that found them', () => {
  const record = candidateRecord(
    {
      id: 'Q9061',
      labels: { pt: { value: 'Karl Marx' } },
      descriptions: { pt: { value: 'filósofo' } },
      sitelinks: { ptwiki: { title: 'Karl Marx' }, enwiki: { title: 'Karl Marx' } },
      claims: { P31: claim({ id: 'Q5' }), P18: claim('Karl Marx 001.jpg') },
    },
    new Set(['political-ideology', 'main-subject']),
  );
  assert.equal(record.kind, 'person');
  assert.deepEqual(record.labels, { pt: 'Karl Marx', en: null });
  assert.deepEqual(record.sitelinks, { ptwiki: true, enwiki: true, count: 2 });
  assert.equal(record.image, 'Karl Marx 001.jpg');
  assert.deepEqual(record.roles, ['main-subject', 'political-ideology']);
});

test('selection applies rules, honours exclusions and adds forced inclusions with a reason', () => {
  const candidates = [
    {
      qid: 'Q1',
      kind: 'person',
      roles: ['political-ideology'],
      born: 1800,
      labels: { pt: 'Um', en: 'One' },
      sitelinks: { count: 40, ptwiki: true, enwiki: true },
    },
    {
      qid: 'Q2',
      kind: 'person',
      roles: ['political-ideology'],
      born: 1800,
      labels: { en: 'Two' },
      sitelinks: { count: 40 },
    },
    {
      qid: 'Q3',
      kind: 'work',
      roles: ['main-subject'],
      born: null,
      labels: { en: 'Three' },
      sitelinks: { count: 25 },
    },
    {
      qid: 'Q4',
      kind: 'person',
      roles: ['influenced-by-marx'],
      born: 1900,
      labels: { en: 'Four' },
      sitelinks: { count: 90 },
    },
  ];
  const { included, excluded } = selectCandidates(candidates, {
    include: [{ qid: 'Q4', reason: 'revisão editorial' }],
    exclude: { Q2: 'fora do recorte' },
  });
  assert.deepEqual(
    included.map((c) => c.qid),
    ['Q1', 'Q3', 'Q4'],
  );
  assert.deepEqual(excluded, [{ qid: 'Q2', label: 'Two', reason: 'fora do recorte' }]);
  assert.equal(included.find((c) => c.qid === 'Q4').reason, 'revisão editorial');
});

test('configuration tuples are unique, skip existing QIDs and use stable slugs', () => {
  const rows = toConfigEntities(
    [
      { qid: 'Q1', kind: 'person', labels: { pt: 'Pensador Ç', en: 'Thinker Ç' } },
      { qid: 'Q1', kind: 'person', labels: { pt: 'Pensador Ç', en: 'Thinker Ç' } },
      { qid: 'Q2', kind: 'ideology', labels: { en: 'Doctrine' } },
      { qid: 'Q9', kind: 'other', labels: { en: 'Ignored' } },
    ],
    new Set(['Q2']),
  );
  assert.deepEqual(rows, [['person-thinker-c', 'Pensador Ç', 'Thinker Ç', 'person', 'Q1']]);
});
