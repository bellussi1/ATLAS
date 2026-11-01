import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadArchive } from './ingestion/wikimedia/archive.mjs';
import { runIngestion } from './ingestion/wikimedia/pipeline.mjs';

const root = fileURLToPath(new URL('./ingestion/wikimedia/raw/', import.meta.url));
const directory = await mkdtemp(join(tmpdir(), 'atlas-offline-verification-'));
let count = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = () => {
  throw Error('NETWORK FORBIDDEN during offline verification');
};
try {
  for (const collection of await readdir(root, { withFileTypes: true })) {
    if (!collection.isDirectory()) continue;
    for (const version of await readdir(join(root, collection.name), { withFileTypes: true })) {
      if (!version.isDirectory()) continue;
      const archiveDir = join(root, collection.name, version.name);
      const { manifest } = await loadArchive(archiveDir);
      const options = {
        collectionKey: manifest.collectionKey,
        mode: 'offline',
        archiveDir,
        mediaRoot: join(directory, 'public'),
        fetchResource: () => {
          throw Error('NETWORK FORBIDDEN');
        },
      };
      const outputPath = join(directory, `${collection.name}-${version.name}-first.json`);
      const secondPath = join(directory, `${collection.name}-${version.name}-second.json`);
      const first = await runIngestion({ ...options, outputPath });
      const second = await runIngestion({ ...options, outputPath: secondPath });
      assert.equal(first.snapshotHash, second.snapshotHash);
      assert.deepEqual(await readFile(outputPath), await readFile(secondPath));
      console.log(
        `${collection.name}/${version.name}: replay offline idêntico, SHA-256 ${first.snapshotHash}`,
      );
      count += 1;
    }
  }
  assert.ok(count > 0, 'Nenhuma captura versionada foi verificada.');
  console.log(`${count} capturas reproduzidas duas vezes sem acesso à rede.`);
} finally {
  globalThis.fetch = originalFetch;
  if (
    dirname(directory) === tmpdir() &&
    basename(directory).startsWith('atlas-offline-verification-')
  )
    await rm(directory, { recursive: true, force: true });
}
