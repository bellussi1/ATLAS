import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { sha256Hex } from '../content/r2-content.mjs';
import { backupSet, objectKey, restoreSet, scanDirectory } from './drafts-backup.mjs';

function memoryStorage() {
  const objects = new Map();
  return {
    objects,
    puts: [],
    async existing() {
      return new Set(objects.keys());
    },
    async put(key, body) {
      this.puts.push(key);
      objects.set(key, Buffer.from(body));
    },
    async get(key) {
      return objects.get(key) ?? null;
    },
  };
}

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'drafts-'));
  await mkdir(join(directory, 'nested'));
  await writeFile(join(directory, 'a.json'), '{"a":1}');
  await writeFile(join(directory, 'nested', 'b.json'), '{"b":2}');
  await writeFile(join(directory, 'copy.json'), '{"a":1}');
  return directory;
}

test('o backup é incremental e sobe cada hash uma vez', async () => {
  const directory = await fixture();
  const storage = memoryStorage();
  const first = await backupSet({ set: 'queues', directory, storage });
  assert.deepEqual([first.files, first.uploaded], [3, 2]);
  storage.puts.length = 0;
  const second = await backupSet({ set: 'queues', directory, storage });
  assert.equal(second.uploaded, 0);
  assert.deepEqual(storage.puts, ['backup/queues/index.json']);
});

test('o dry-run não grava nada', async () => {
  const directory = await fixture();
  const storage = memoryStorage();
  const result = await backupSet({ set: 'queues', directory, storage, dryRun: true });
  assert.equal(result.uploaded, 2);
  assert.equal(storage.puts.length, 0);
});

test('a restauração devolve os arquivos e rejeita objeto adulterado', async () => {
  const directory = await fixture();
  const storage = memoryStorage();
  await backupSet({ set: 'queues', directory, storage });
  const destination = await mkdtemp(join(tmpdir(), 'restore-'));
  await restoreSet({ set: 'queues', destination, storage });
  assert.equal(await readFile(join(destination, 'nested', 'b.json'), 'utf8'), '{"b":2}');
  storage.objects.set(objectKey(sha256Hex(Buffer.from('{"b":2}'))), Buffer.from('tampered'));
  await assert.rejects(() => restoreSet({ set: 'queues', destination, storage }), /integridade/);
});

test('um diretório ausente produz conjunto vazio', async () => {
  assert.deepEqual(await scanDirectory(join(tmpdir(), 'nao-existe-atlas')), []);
});
