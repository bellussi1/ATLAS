import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { listJsonResponses } from './raw-store.mjs';
import { isRetired, readRetirement } from './retired.mjs';

const sha = 'a'.repeat(64);

async function capture(root, version, retired) {
  const directory = join(root, 'liberalism', version);
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, 'manifest.json'),
    JSON.stringify({
      requests: [{ url: `https://example.invalid/${version}`, kind: 'json', sha256: sha }],
    }),
  );
  if (retired)
    await writeFile(
      join(directory, 'retired.json'),
      JSON.stringify({ retiredAt: '2026-11-07', issue: 46, reason: 'teste' }),
    );
}

test('a capture without a retirement marker stays active', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'atlas-retired-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  await capture(root, 'active', false);
  assert.equal(await readRetirement(join(root, 'liberalism', 'active')), null);
  assert.equal(await isRetired(join(root, 'liberalism', 'active')), false);
});

test('a retired capture reports its marker and is skipped by the raw cache', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'atlas-retired-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  await capture(root, 'active', false);
  await capture(root, 'old', true);
  const retirement = await readRetirement(join(root, 'liberalism', 'old'));
  assert.equal(retirement.issue, 46);
  assert.equal(await isRetired(join(root, 'liberalism', 'old')), true);
  const responses = await listJsonResponses([root]);
  assert.deepEqual(
    [...responses.values()].map((response) => response.url),
    ['https://example.invalid/active'],
  );
});
