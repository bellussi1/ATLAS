#!/usr/bin/env node
/**
 * Cobertura de imagem por verbete: quantas entidades do grafo têm imagem com licença conferida e
 * quais ficam só com o ícone do tipo. Não inventa imagem: sem licença clara o verbete mostra o ícone.
 *   npm run tradicao:imagens-relatorio -- [prefixo-da-coleção] [--lista]
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Puro: por coleção, as entidades com e sem imagem licenciada. */
export function imageCoverage(atlases) {
  return atlases.map((atlas) => {
    const withImage = new Set((atlas.assetLicenses ?? []).map((asset) => asset.entityId));
    const entities = atlas.entities ?? [];
    return {
      id: atlas.id,
      total: entities.length,
      withImage: entities.filter((entity) => withImage.has(entity.id)).length,
      without: entities.filter((entity) => !withImage.has(entity.id)).map((entity) => entity.title),
    };
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const prefix = process.argv.slice(2).find((arg) => !arg.startsWith('--')) ?? '';
  const list = process.argv.includes('--lista');
  const manifest = JSON.parse(readFileSync(join(root, 'content/knowledge/manifest.json'), 'utf8'));
  const atlases = manifest.collections
    .filter((collection) => collection.id.includes(prefix))
    .map((collection) =>
      JSON.parse(readFileSync(join(root, 'content/knowledge', collection.file), 'utf8')),
    );
  let total = 0;
  let withImage = 0;
  for (const row of imageCoverage(atlases)) {
    total += row.total;
    withImage += row.withImage;
    console.log(`${row.id}: ${row.withImage}/${row.total} com imagem licenciada`);
    if (list && row.without.length) console.log(`  só ícone: ${row.without.join('; ')}`);
  }
  console.log(
    `total: ${withImage}/${total} (${Math.round((100 * withImage) / Math.max(total, 1))}%)`,
  );
}
