import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve('dist/atlas/browser');
async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? collect(join(directory, entry.name)) : entry.name.endsWith('.html') ? [join(directory, entry.name)] : []))).flat();
}
const hashes = new Set();
for (const file of await collect(root)) {
  const html = await readFile(file, 'utf8');
  if (html.includes('onload="this.media=\'all\'"')) {
    hashes.add(`'sha256-${createHash('sha256').update("this.media='all'").digest('base64')}'`);
  }
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=|type\s*=\s*["']application\/json/i.test(match[1]) || !match[2].trim()) continue;
    hashes.add(`'sha256-${createHash('sha256').update(match[2]).digest('base64')}'`);
  }
}
const target = join(root, '_headers');
const template = await readFile(target, 'utf8');
if (!template.includes("script-src 'self'")) throw new Error('Diretiva script-src ausente em _headers.');
await writeFile(target, template.replace("script-src 'self'", `script-src 'self' 'unsafe-hashes' ${[...hashes].sort().join(' ')}`));
console.log(`CSP: ${hashes.size} hashes para scripts inline gerados pelo prerender.`);
