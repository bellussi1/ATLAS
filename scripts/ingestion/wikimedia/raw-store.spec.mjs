import assert from 'node:assert/strict';
import test from 'node:test';
import { gzipSync } from 'node:zlib';

import { decodeRawBody } from './raw-store.mjs';

test('raw capture bodies are decoded when the transport returns gzip', () => {
  const json = Buffer.from('{"batchcomplete":true,"query":{}}');
  assert.deepEqual(decodeRawBody(gzipSync(json)), json);
  assert.deepEqual(decodeRawBody(json), json);
  assert.deepEqual(decodeRawBody(Buffer.from([0x1f])), Buffer.from([0x1f]));
});
