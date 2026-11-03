import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/** Imported exclusively by app.config.server; never bundled for the browser. */
export async function readContentAssetOnServer(key: string): Promise<string> {
  if (!/^(?:pointer\.json|c\/[a-f0-9]{64}\.json)$/.test(key))
    throw new Error('Asset de conteúdo inválido.');
  // Filled and digest-checked by scripts/content/fetch-content.mjs before the prerender runs.
  return readFile(resolve('generated/content-cache', key), 'utf8');
}
