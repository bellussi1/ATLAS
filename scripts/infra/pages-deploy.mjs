#!/usr/bin/env node
// Publica o build estático no Cloudflare Pages. O diretório já contém `_headers`, `_redirects` e
// `404.html`, então o contrato de cache, segurança e rotas desconhecidas não muda em relação ao
// Vercel. O R2 continua sendo a origem do conteúdo; o Pages serve apenas o app e as mídias locais.
//   npm run build
//   node scripts/infra/pages-deploy.mjs --dry-run
//   node scripts/infra/pages-deploy.mjs
import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../dist/atlas/browser/', import.meta.url));
const project =
  process.argv.find((arg) => arg.startsWith('--project='))?.slice('--project='.length) ??
  process.env.CLOUDFLARE_PAGES_PROJECT ??
  'atlas-bellussi';
const branch =
  process.argv.find((arg) => arg.startsWith('--branch='))?.slice('--branch='.length) ??
  process.env.CLOUDFLARE_PAGES_BRANCH ??
  'master';
const dryRun = process.argv.includes('--dry-run');

// Limites do plano gratuito do Pages em 06/11/2026: 20.000 arquivos e 25 MiB por arquivo.
const MAX_FILES = 20_000;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

async function measure(directory) {
  let files = 0;
  let bytes = 0;
  let largest = { path: '', size: 0 };
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await measure(path);
      files += nested.files;
      bytes += nested.bytes;
      if (nested.largest.size > largest.size) largest = nested.largest;
      continue;
    }
    const size = (await stat(path)).size;
    files += 1;
    bytes += size;
    if (size > largest.size) largest = { path, size };
  }
  return { files, bytes, largest };
}

for (const file of ['index.html', '404.html', '_headers', '_redirects'])
  await stat(join(root, file)).catch(() => {
    throw new Error(`Build incompleto: falta ${file}. Rode npm run build antes de publicar.`);
  });

const { files, bytes, largest } = await measure(root);
if (files > MAX_FILES)
  throw new Error(`O build tem ${files} arquivos; o Pages aceita ${MAX_FILES}.`);
if (largest.size > MAX_FILE_BYTES)
  throw new Error(
    `${relative(root, largest.path)} tem ${(largest.size / 1024 / 1024).toFixed(1)} MiB; ` +
      `o Pages aceita até 25 MiB por arquivo.`,
  );

console.log(
  `Build: ${files} arquivos, ${(bytes / 1024 / 1024).toFixed(1)} MB; ` +
    `maior arquivo ${relative(root, largest.path)} (${(largest.size / 1024 / 1024).toFixed(2)} MB).`,
);
const command = [
  '--yes',
  'wrangler@latest',
  'pages',
  'deploy',
  root,
  '--project-name',
  project,
  '--branch',
  branch,
];
if (dryRun) {
  console.log(`Plano apenas: npx ${command.join(' ')}`);
  process.exitCode = 0;
} else {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  // Windows cannot spawn a .cmd without a shell; quote arguments so paths with spaces survive.
  const quote = (value) => (/[\s"&|<>^]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value);
  const result =
    process.platform === 'win32'
      ? spawnSync(`${npx} ${command.map(quote).join(' ')}`, { stdio: 'inherit', shell: true })
      : spawnSync(npx, command, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
}
