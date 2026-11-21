#!/usr/bin/env node
// Mirrors local, unapproved model artifacts (experiments/rag/eval/queues and runs) into the
// private atlas-drafts bucket. Incremental by SHA-256; never touches atlas-public.
//   npm run infra:backup-drafts -- --dry-run          lists what would be uploaded
//   npm run infra:backup-drafts                       uploads the new objects and the indexes
//   npm run infra:backup-drafts -- --set queues       a single set
//   npm run infra:backup-drafts -- --restore queues --to experiments/rag/eval/queues
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { draftsBucket, listR2Objects, loadR2DraftsConfig, r2 } from '../content/r2-content.mjs';
import { backupPrefix, backupSet, defaultSets, restoreSet } from './drafts-backup.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

function r2Storage(config) {
  return {
    async existing() {
      return new Set((await listR2Objects(config, `${backupPrefix}/objects/`)).map((o) => o.key));
    },
    async put(key, body, contentType, cacheControl) {
      const response = await r2(config, 'PUT', key, { body, contentType, cacheControl });
      if (!response.ok) throw new Error(`Falha ao enviar ${key}: HTTP ${response.status}`);
    },
    async get(key) {
      const response = await r2(config, 'GET', key);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Falha ao baixar ${key}: HTTP ${response.status}`);
      return Buffer.from(await response.arrayBuffer());
    },
  };
}

async function main() {
  const config = await loadR2DraftsConfig().catch((error) => {
    if (!dryRun) throw error;
    console.log(`[dry-run] sem credenciais (${error.message}); bucket tratado como vazio.`);
    return null;
  });
  if (config && config.bucket !== draftsBucket) throw new Error('Bucket de rascunhos inesperado.');
  const storage = config ? r2Storage(config) : { existing: async () => new Set() };

  const restoreName = option('--restore');
  if (restoreName) {
    const to = option('--to');
    if (!to) throw new Error('--restore exige --to <diretório>.');
    if (!defaultSets[restoreName]) throw new Error(`Conjunto desconhecido: ${restoreName}`);
    await restoreSet({ set: restoreName, destination: join(root, to), storage, log: console.log });
    return;
  }
  const only = option('--set');
  if (only && !defaultSets[only]) throw new Error(`Conjunto desconhecido: ${only}`);
  for (const [set, path] of Object.entries(defaultSets)) {
    if (only && only !== set) continue;
    await backupSet({ set, directory: join(root, path), storage, dryRun, log: console.log });
  }
  if (!dryRun) console.log(`backup concluído em ${draftsBucket}/${backupPrefix}/`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
