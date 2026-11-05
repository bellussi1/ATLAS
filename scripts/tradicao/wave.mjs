#!/usr/bin/env node
/**
 * Onda de expansão: escolhe, só com o que já está em disco, os itens que os artigos locais mais
 * citam e que o grafo ainda não tem, e os soma aos candidatos de `verbetes-citados`. Sem rede e
 * sem custo; a captura e a extração seguem os comandos de sempre. Cada onda amplia o conjunto de
 * artigos locais, então a seguinte enxerga mais citações.
 *
 *   npm run tradicao:onda -- [--min 6] [--min-place 8] [--types a,b] [--limit 500] [--write]
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const waveSlug = 'verbetes-citados';

/** Tipos que entram por padrão. Lugar e conceito são citados por tudo e exigem limite maior. */
export const defaultTypes = [
  'pessoa',
  'organização',
  'partido',
  'movimento',
  'obra',
  'acontecimento',
  'ideologia',
  'lugar',
  'conceito',
];
export const broadTypes = new Set(['lugar', 'conceito']);

/** Temas gerais demais para um verbete de leitura. */
export const stopTitles = new Set([
  'Política',
  'História',
  'Ciência',
  'Educação',
  'Ideologia',
  'Revolução',
  'Ditadura',
  'Guerra',
  'Estado',
  'Governo',
  'Poder executivo',
  'Poder legislativo',
  'Poder judiciário',
  'Partido político',
  'Propriedade privada',
  'Golpe de Estado',
  'República',
  'Democracia',
  'Cristianismo',
  'Língua',
  'Cidade',
  'País',
  'Século XX',
  'Século XIX',
  'Século XXI',
]);

const titleLooksGeneric = (title) =>
  stopTitles.has(title) ||
  /^(lista|anexo|categoria|século|ano)\b/i.test(title) ||
  /^\d{1,4}$/.test(title);

/**
 * Conta, por QID, em quantos artigos cada item aparece como alvo de link. Puro: recebe os artigos
 * já lidos. `known` são os QIDs que já têm verbete ou já foram escolhidos.
 */
export function rankCited(
  articles,
  { known = new Set(), types = defaultTypes, min = 6, minBroad = min + 2 } = {},
) {
  const counts = new Map();
  for (const article of articles) {
    const seen = new Set();
    for (const target of article.targets ?? []) {
      if (!target.qid || seen.has(target.qid)) continue;
      seen.add(target.qid);
      if (target.missing || known.has(target.qid) || !types.includes(target.type)) continue;
      if (titleLooksGeneric(target.title)) continue;
      const entry = counts.get(target.qid) ?? {
        qid: target.qid,
        title: target.title,
        type: target.type,
        n: 0,
      };
      entry.n += 1;
      counts.set(target.qid, entry);
    }
  }
  return [...counts.values()]
    .filter((entry) => entry.n >= (broadTypes.has(entry.type) ? minBroad : min))
    .sort((a, b) => b.n - a.n || a.title.localeCompare(b.title, 'pt'));
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

function localArticles(root) {
  const base = join(root, 'generated/wiki-extract');
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const directory = join(base, entry.name, 'articles');
      return existsSync(directory)
        ? readdirSync(directory)
            .filter((name) => name.endsWith('.json'))
            .map((name) => readJson(join(directory, name)).article)
        : [];
    });
}

function graphQids(root) {
  const manifest = readJson(join(root, 'content/knowledge/manifest.json'));
  const qids = new Set();
  for (const collection of manifest.collections) {
    const atlas = readJson(join(root, 'content/knowledge', collection.file));
    for (const entity of atlas.entities ?? []) {
      const qid = entity.externalIds?.wikidata;
      if (qid) qids.add(qid);
    }
  }
  return qids;
}

export function mergeCandidates(existing, ranked) {
  const have = new Set(existing.map((candidate) => candidate.qid));
  const added = ranked
    .filter((entry) => !have.has(entry.qid))
    .map((entry) => ({
      lang: 'pt',
      title: entry.title,
      qid: entry.qid,
      type: entry.type,
      sharedByCount: entry.n,
      linkedFrom: [],
      ring: 2,
      score: null,
      decision: 'accept',
      decidedBy: 'citação',
      reason: `citado por ${entry.n} artigos da coleção`,
    }));
  return { candidates: [...existing, ...added], added };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({
    options: {
      min: { type: 'string', default: '6' },
      'min-place': { type: 'string' },
      types: { type: 'string' },
      limit: { type: 'string', default: '500' },
      write: { type: 'boolean', default: false },
    },
  });
  const min = Number(values.min);
  const minBroad = values['min-place'] ? Number(values['min-place']) : min + 2;
  const types = values.types ? values.types.split(',') : defaultTypes;
  const path = join(projectRoot, 'scripts/ingestion/wiki-extract/candidates', `${waveSlug}.json`);
  const file = existsSync(path)
    ? readJson(path)
    : { tradition: waveSlug, rootQid: 'Q7257', seeds: [], candidates: [] };
  const known = graphQids(projectRoot);
  for (const candidate of file.candidates) known.add(candidate.qid);
  const ranked = rankCited(localArticles(projectRoot), { known, types, min, minBroad }).slice(
    0,
    Number(values.limit),
  );
  const { candidates, added } = mergeCandidates(file.candidates, ranked);
  const by = {};
  for (const entry of added) by[entry.type] = (by[entry.type] ?? 0) + 1;
  console.log(
    `onda: ${added.length} novos (limite ${min}, lugar/conceito ${minBroad}) ${JSON.stringify(by)}`,
  );
  console.log(
    added
      .slice(0, 25)
      .map((entry) => `${entry.title} (${entry.type}, ${entry.n})`)
      .join('; '),
  );
  if (values.write) {
    writeFileSync(
      path,
      `${JSON.stringify({ ...file, generatedAt: new Date().toISOString(), candidates }, null, 2)}\n`,
    );
    console.log(`gravado: ${candidates.length} candidatos em ${waveSlug}`);
  } else console.log('Sem --write: nada gravado.');
}
