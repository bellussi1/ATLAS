import assert from 'node:assert/strict';
import test from 'node:test';
import { createHttp } from './http.mjs';
import { classifyQids } from './targets.mjs';

const entity = (parent) => ({
  claims: parent ? { P31: [{ mainsnak: { datavalue: { value: { id: parent } } } }] } : {},
});

test('a classe lida uma vez serve a todos os artigos da mesma execução', async () => {
  const requested = [];
  const http = createHttp(async (url) => {
    const ids = new URL(url).searchParams.get('ids').split('|');
    requested.push(...ids);
    const entities = Object.fromEntries(ids.map((id) => [id, entity(id === 'Q5' ? null : 'Q5')]));
    return { bytes: Buffer.from(JSON.stringify({ entities })), contentType: 'application/json' };
  });
  const first = await classifyQids(['Q1', 'Q2'], http);
  const second = await classifyQids(['Q2', 'Q3'], http);
  assert.equal(first.get('Q1').type, 'pessoa');
  assert.equal(second.get('Q3').type, 'pessoa');
  assert.equal(requested.filter((id) => id === 'Q5').length, 1, 'Q5 não é lida de novo');
  assert.equal(requested.filter((id) => id === 'Q2').length, 1, 'Q2 não é lida de novo');
});
