// Troca o endereço público do conteúdo (r2.dev -> domínio próprio) em um único passo:
// constante do app, ponteiro local e CSP. Exige que o novo endereço já sirva o pointer.json.
//   node scripts/infra/switch-content-domain.mjs https://cdn.atlas.exemplo.org [--apply]
// Depois: npm run content:publish (republica o pointer.json com o baseUrl novo).
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function swapOrigin(text, from, to) {
  return text.split(from).join(to);
}

export function currentOrigin(source) {
  const match = source.match(/DEFAULT_CONTENT_BASE_URL = '(https:\/\/[^']+)'/);
  if (!match) throw new Error('DEFAULT_CONTENT_BASE_URL não encontrado.');
  return match[1];
}

async function main() {
  const target = process.argv[2]?.replace(/\/+$/, '');
  const apply = process.argv.includes('--apply');
  if (!target || !/^https:\/\/[^/\s]+$/.test(target))
    throw new Error('Informe a origem https do novo domínio, sem caminho.');
  const files = [
    'src/app/core/content/models/content-pointer.ts',
    'content/content-pointer.json',
    'public/_headers',
  ];
  const from = currentOrigin(await readFile(new URL(`../../${files[0]}`, import.meta.url), 'utf8'));
  if (from === target) return console.log('Já usa esse domínio.');
  const probe = await fetch(`${target}/pointer.json`, { cache: 'no-store' });
  if (!probe.ok) throw new Error(`${target}/pointer.json respondeu HTTP ${probe.status}.`);
  for (const file of files) {
    const url = new URL(`../../${file}`, import.meta.url);
    const before = await readFile(url, 'utf8');
    const after = swapOrigin(before, from, target);
    console.log(`${file}: ${before === after ? 'sem mudança' : 'atualizado'}`);
    if (apply) await writeFile(url, after);
  }
  console.log(
    apply ? 'Pronto. Rode content:publish, testes e build.' : 'Plano apenas; use --apply.',
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
