import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('a regra de ciclo de vida cobre raw/ por 90 dias', async () => {
  const config = JSON.parse(
    await readFile(new URL('./raw-lifecycle.json', import.meta.url), 'utf8'),
  );
  const rule = config.rules.find((item) => item.id === 'expire-raw-captures');
  assert.ok(rule);
  assert.equal(rule.enabled, true);
  assert.equal(rule.conditions.prefix, 'raw/');
  assert.deepEqual(rule.deleteObjectsTransition.condition, {
    type: 'Age',
    maxAge: 90 * 24 * 60 * 60,
  });
});
