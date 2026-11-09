import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import '../content/register-source-modules.mjs';
import {
  discoveryTradition,
  draftInput,
  iconKinds,
  loadRegistry,
  paletteNames,
  projectRoot,
  seedsFile,
  traditionRegistrySchema,
} from './registry.mjs';
import { traditionFor } from '../ingestion/wikimedia/traditions.mjs';

const { ideologyPaletteSchema } =
  await import('../../src/app/features/ideologies/models/ideology-page.schema.ts');

const valid = () => ({
  slug: 'teste',
  kind: 'tradicao',
  rootQid: 'Q1',
  titles: { pt: 'Teste', en: 'Test' },
  palette: 'atlas',
  scope: {
    classificationNote: 'Nota.',
    period: 'século XX',
    geography: 'Europa',
    includes: ['a'],
    excludes: ['b'],
  },
  seeds: [
    { url: 'https://pt.wikipedia.org/wiki/Um' },
    { url: 'https://pt.wikipedia.org/wiki/Dois' },
    { url: 'https://en.wikipedia.org/wiki/Three' },
  ],
  discovery: { founderQids: [], commonsCategory: 'Category:Teste' },
});

test('o registro da social-democracia é válido e deriva sementes e descoberta', async () => {
  const entry = await loadRegistry('social-democracia');
  assert.equal(entry.icon, 'ideology');
  const seeds = await readFile(
    join(projectRoot, 'scripts/ingestion/wiki-extract/seeds/social-democracia.json'),
    'utf8',
  );
  assert.deepEqual(JSON.parse(seeds), seedsFile(entry));
  assert.equal(draftInput(entry).atlasId, 'atlas-social-democracia');
  const { configuration, ...curated } = traditionFor('social-democracia');
  assert.ok(configuration);
  const { slug, ...derived } = { slug: entry.slug, ...discoveryTradition(entry) };
  assert.equal(slug, 'social-democracia');
  assert.deepEqual(curated, { slug: 'social-democracia', ...derived });
});

test('rejeita registro sem recorte, com semente fora da Wikipedia ou sem semente em pt', () => {
  assert.ok(traditionRegistrySchema.safeParse(valid()).success);
  const bad = (change) => traditionRegistrySchema.safeParse(change(valid())).success;
  assert.equal(
    bad((e) => ({ ...e, scope: { ...e.scope, excludes: [] } })),
    false,
  );
  assert.equal(
    bad((e) => ({ ...e, palette: 'neon' })),
    false,
  );
  assert.equal(
    bad((e) => ({ ...e, rootQid: 'social' })),
    false,
  );
  // Sementes são dicas opcionais: a descoberta parte da raiz Wikidata, não de escolha de pessoa.
  assert.equal(
    bad((e) => ({ ...e, seeds: [] })),
    true,
  );
  assert.equal(
    bad((e) => ({ ...e, discovery: { ...e.discovery, thresholds: { accept: 'alto' } } })),
    false,
  );
  assert.equal(
    bad((e) => ({ ...e, seeds: [{ url: 'https://example.com/wiki/Um' }, ...e.seeds.slice(1)] })),
    false,
  );
  assert.equal(
    bad((e) => ({
      ...e,
      seeds: e.seeds.map((seed) => ({ url: seed.url.replace('pt.wikipedia', 'en.wikipedia') })),
    })),
    false,
  );
  assert.equal(
    bad((e) => ({ ...e, seeds: [e.seeds[0], e.seeds[0], e.seeds[1]] })),
    false,
  );
});

test('a lente de pertencimento aceita QIDs e a ausência não inventa lista', () => {
  const entry = traditionRegistrySchema.parse(valid());
  assert.deepEqual(entry.belonging.qids, []);
  const withLens = traditionRegistrySchema.parse({
    ...valid(),
    belonging: { qids: ['Q2', 'Q3'], note: 'Aceitos na descoberta.' },
  });
  assert.deepEqual(withLens.belonging.qids, ['Q2', 'Q3']);
  assert.equal(
    traditionRegistrySchema.safeParse({ ...valid(), belonging: { qids: ['Q-1'] } }).success,
    false,
  );
});

test('paletas e ícones do registro acompanham o schema da leitura e o componente de ícone', async () => {
  assert.deepEqual([...paletteNames].sort(), [...ideologyPaletteSchema.options].sort());
  const source = await readFile(
    join(projectRoot, 'src/app/shared/ui/kind-icon/kind-icon.component.ts'),
    'utf8',
  );
  const union = source.match(/export type IconKind =([\s\S]*?);/)[1];
  const declared = [...union.matchAll(/'([a-z]+)'/g)]
    .map((match) => match[1])
    .filter((n) => n !== 'record');
  assert.deepEqual([...iconKinds].sort(), declared.sort());
});

test('traditions.mjs aceita uma tradição declarada só no registro', async () => {
  // O registro da social-democracia é igual à entrada curada; a mesclagem não a duplica.
  assert.equal(traditionFor('social-democracia').rootQid, 'Q121254');
  assert.throws(() => traditionFor('inexistente'), /Tradição desconhecida/);
});
