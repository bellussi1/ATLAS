/**
 * Registro declarativo de uma tradição (estágio 1): um arquivo `content/traditions/<slug>.json`
 * é a única entrada humana do pipeline. Daqui saem as sementes da extração, a configuração de
 * descoberta Wikimedia e o esqueleto da leitura; nada aqui é conteúdo editorial publicado.
 */
import { access, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as z from 'zod';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Mantidos em sincronia com `ideologyPaletteSchema` e `IconKind` por `registry.spec.mjs`. */
export const paletteNames = [
  'atlas',
  'marx',
  'liberal',
  'anarquismo',
  'social-democracia',
  'conservadorismo',
  'fascismo',
  'libertarianismo',
  'nacionalismo',
  'ecologismo',
  'feminismo',
];
export const iconKinds = [
  'person',
  'activist',
  'politician',
  'work',
  'event',
  'concept',
  'thesis',
  'ideology',
  'party',
  'institution',
  'place',
  'polity',
];

const slug = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
const wikipediaUrl = z
  .url({ protocol: /^https$/ })
  .refine((value) => /^https:\/\/(pt|en)\.wikipedia\.org\/wiki\/[^/?#]+$/.test(value), {
    message: 'Use a URL de um artigo de pt.wikipedia.org ou en.wikipedia.org.',
  });
const text = z.string().trim().min(1);

export const traditionRegistrySchema = z
  .object({
    slug,
    kind: z.enum(['ideologia', 'corrente', 'tradicao', 'movimento', 'programa']),
    /** Item do Wikidata da tradição; identifica o artigo e ancora a descoberta. */
    rootQid: z.string().regex(/^Q\d+$/),
    titles: z.object({ pt: text, en: text }),
    palette: z.enum(paletteNames),
    icon: z.enum(iconKinds).default('ideology'),
    /** Recorte editorial: o que a leitura cobre e o que deixa de fora, antes de qualquer pesquisa. */
    scope: z.object({
      classificationNote: text,
      period: text,
      geography: text,
      includes: z.array(text).min(1),
      excludes: z.array(text).min(1),
    }),
    /** Dicas opcionais. A descoberta parte da raiz Wikidata; semente nunca é pré-requisito. */
    seeds: z.array(z.object({ url: wikipediaUrl, note: text.optional() })).default([]),
    /**
     * Lente de pertencimento: QIDs aceitos na descoberta e consolidados no grafo. A tradição não
     * move nem duplica entidades; cobertura, leitura e glossário selecionam o que já existe. A
     * raiz (`rootQid`) entra sempre na lente, mesmo que não esteja listada aqui.
     */
    belonging: z
      .object({
        qids: z.array(z.string().regex(/^Q\d+$/)).default([]),
        note: text.optional(),
      })
      .default({ qids: [] }),
    discovery: z.object({
      founderQids: z.array(z.string().regex(/^Q\d+$/)).default([]),
      /** Categoria do Commons onde as imagens da tradição são procuradas (licença por arquivo). */
      commonsCategory: z.string().regex(/^Category:.+/),
      /** Sobrescrevem os padrões da expansão por pontuação (scoring.mjs). */
      thresholds: z
        .object({ accept: z.number(), review: z.number(), regionalReview: z.number() })
        .partial()
        .optional(),
      ringCaps: z
        .object({ 1: z.number().int(), 2: z.number().int(), 3: z.number().int() })
        .partial()
        .optional(),
    }),
  })
  .superRefine((entry, context) => {
    const urls = entry.seeds.map((seed) => seed.url);
    if (new Set(urls).size !== urls.length)
      context.addIssue({ code: 'custom', message: 'Sementes repetidas.', path: ['seeds'] });
    if (
      entry.seeds.length &&
      !entry.seeds.some((seed) => seed.url.startsWith('https://pt.wikipedia.org/'))
    )
      context.addIssue({
        code: 'custom',
        message: 'Ao menos uma semente em pt.wikipedia.org: o texto da leitura é em pt-BR.',
        path: ['seeds'],
      });
  });

export const registryPath = (root, slugValue) =>
  join(root, 'content/traditions', `${slugValue}.json`);
export const seedsPath = (root, slugValue) =>
  join(root, 'scripts/ingestion/wiki-extract/seeds', `${slugValue}.json`);

export async function loadRegistry(slugValue, root = projectRoot) {
  const path = registryPath(root, slugValue);
  let raw;
  try {
    raw = await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT')
      throw new Error(`Sem registro: crie content/traditions/${slugValue}.json (estágio 1).`);
    throw error;
  }
  const entry = traditionRegistrySchema.parse(JSON.parse(raw));
  if (entry.slug !== slugValue)
    throw new Error(`O registro declara "${entry.slug}", mas o arquivo é de "${slugValue}".`);
  return entry;
}

export const atlasIdOf = (entry) => `atlas-${entry.slug}`;

/** Seeds file the extraction CLI reads (`scripts/ingestion/wiki-extract/seeds/<slug>.json`). */
export const seedsFile = (entry) => ({ topics: entry.seeds.map(({ url }) => ({ url })) });

/** Entry in the shape of `scripts/ingestion/wikimedia/traditions.mjs`. */
export const discoveryTradition = (entry) => ({
  rootQid: entry.rootQid,
  founderQids: entry.discovery.founderQids,
  commonsCategory: entry.discovery.commonsCategory,
  ptTitle: entry.titles.pt,
});

/** Input of `createIdeologyDraft` (the reading skeleton). */
export const draftInput = (entry) => ({
  slug: entry.slug,
  title: entry.titles.pt,
  kind: entry.kind,
  atlasId: atlasIdOf(entry),
  palette: entry.palette,
  classificationNote: entry.scope.classificationNote,
});

export const exists = (path) =>
  access(path).then(
    () => true,
    () => false,
  );
