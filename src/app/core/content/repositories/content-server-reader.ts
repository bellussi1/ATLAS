import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/** Imported exclusively by app.config.server; never bundled for the browser. */
export async function readContentAssetOnServer(path: string): Promise<string> {
  if (!/^\/content\/(?:manifest|[a-z0-9-]+\.[a-f0-9]{64})\.json$/.test(path))
    throw new Error('Asset de conteúdo inválido.');
  return readFile(resolve('generated/content', path.slice('/content/'.length)), 'utf8');
}
