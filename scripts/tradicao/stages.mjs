/**
 * Os 13 estágios do pipeline de tradições (0 a 12). Cada estágio declara:
 * - contrato: o que consome (`needs`) e o que entrega (`produces`);
 * - `inputs`/`outputs`: caminhos cujo hash decide se o estágio precisa ser refeito;
 * - `commands`: o que o orquestrador executa (vazio nos estágios de agente e humanos);
 * - `gate`: a porta de saída, uma lista de verificações determinísticas sem rede nem custo.
 * Nenhum estágio publica: o orquestrador não executa `content:publish`, `publish-drafts` nem
 * `ingest:publish-raw`. Publicar é sempre decisão humana explícita (estágio 12).
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import '../content/register-source-modules.mjs';
import { readSourceGraph } from '../content/source-graph.mjs';
import { createIdeologyDraft } from '../content/new-ideology.mjs';
import { articleText } from '../ingestion/wiki-extract/article.mjs';
import {
  extractionSchema,
  maxInputChars,
  verifyQuotes,
} from '../ingestion/wiki-extract/extraction.mjs';
import { captureSchema } from '../ingestion/wiki-extract/raw.mjs';
import { traditionFor } from '../ingestion/wikimedia/traditions.mjs';
import { checkFloor, loadFloor, measureTradition, measure, flatten } from './coverage.mjs';
import { chosenOptions, loadRecords, planRun } from './extract.mjs';
import { richSourceText } from './prompts.mjs';
import { generateReadings } from './reading.mjs';
import { buildGlossary, modelChoiceSchema, richGaps, unverifiedQuotes } from './rich.mjs';
import { defaults, isGenericTitle, maxRing } from './scoring.mjs';
import {
  atlasIdOf,
  draftInput,
  exists,
  iconKinds,
  loadRegistry,
  seedsFile,
  seedsPath,
} from './registry.mjs';
import { loadState, writeFormattedJson, writeJsonAtomic } from './state.mjs';

const { validateIdeologyDossier } =
  await import('../../src/app/features/ideologies/models/ideology-page.schema.ts');

export const check = (name, ok, detail = '') => ({ name, ok: Boolean(ok), detail });
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const readJsonOr = (path, fallback) =>
  readJson(path).catch((error) => {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  });
const listJson = async (directory) =>
  (await readdir(directory).catch(() => []))
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.slice(0, -5))
    .sort();

/** Same id derivation as `scripts/wiki-extract.mjs` for accepted candidates. */
const slugOf = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
export const candidateId = (candidate) => `topic-${slugOf(candidate.title)}`;

export function paths({ root, slug }) {
  const work = join(root, 'generated/wiki-extract', slug);
  return {
    registry: join(root, 'content/traditions', `${slug}.json`),
    seeds: seedsPath(root, slug),
    candidates: join(root, 'scripts/ingestion/wiki-extract/candidates', `${slug}.json`),
    rawDirectory: join(root, 'scripts/ingestion/wiki-extract/raw', slug),
    work,
    articles: join(work, 'articles'),
    extracts: join(work, 'extracts'),
    page: join(root, 'content/ideologies', slug, 'page.json'),
    graph: join(root, 'content/graph', `${slug}.json`),
    manifest: join(root, 'content/knowledge/manifest.json'),
    coverage: join(root, 'generated/pipeline', slug, 'coverage.json'),
    glossary: join(root, 'generated/pipeline', slug, 'glossary.json'),
  };
}

async function acceptedCandidates(p) {
  const file = await readJsonOr(p.candidates, null);
  return file ? file.candidates.filter((candidate) => candidate.decision === 'accept') : null;
}

/** Catalogue-like types that must never be accepted without a named human or AI decision. */
const unreviewedTypes = new Set(['outro', 'sem-item']);

/** Where a reading must be listed once it is public (stage 10); `needle` is searched in the file. */
export const registrationPoints = (slug) => [
  ['src/app/features/ideologies/data/published-ideologies.ts', `'${slug}'`, `${slug}:`],
  ['src/app/features/ideologies/data/ideology-readings.ts', `slug: '${slug}'`],
  ['src/app/core/content/editorial/public-readings.ts', `slug: '${slug}'`],
  ['e2e/pages.spec.ts', `'/${slug}'`],
  ['e2e/knowledge-explorer.spec.ts', `'/${slug}'`],
  ['src/app/features/exploration/pages/record/record.component.ts', `'/${slug}'`],
];

export async function registrationGaps(root, slug) {
  const gaps = [];
  for (const [file, ...needles] of registrationPoints(slug)) {
    const source = await readFile(join(root, file), 'utf8').catch(() => '');
    if (!needles.some((needle) => source.includes(needle))) gaps.push(file);
  }
  return gaps;
}

const placeholder = /Capítulo reservado|Pesquisa pendente|Ainda não há roteiro|Texto pendente/;

async function dossier(ctx) {
  const p = paths(ctx);
  const graph = await readSourceGraph(join(ctx.root, 'content/knowledge'));
  return validateIdeologyDossier(
    await readJson(p.page),
    await readJsonOr(p.graph, { sources: [], edges: [] }),
    graph,
  );
}

/**
 * Ideologias que o estágio 8 monta: a raiz de uma família (pelo QID do registro) ou, num
 * programa, todas as da coleção. Leituras escritas à mão não são tocadas por `generateReadings`.
 */
async function readingSlugs(ctx, registry) {
  if (registry.kind === 'programa') return null;
  const graph = await readSourceGraph(join(ctx.root, 'content/knowledge'));
  const atlas = graph.atlases.find((a) => a.id === atlasIdOf(registry));
  const root = atlas?.entities.find(
    (e) => e.kind === 'ideology' && e.externalIds?.wikidata === registry.rootQid,
  );
  return root ? [root.slug] : [];
}

const command = (label, argv, extra = {}) => ({ label, argv, ...extra });

export const stages = [
  {
    n: 0,
    id: 'regua',
    alwaysRun: true,
    title: 'Régua de cobertura',
    kind: 'auto',
    cost: 'grátis',
    contract: {
      needs: 'snapshots de leitura de referência (marxismo, liberalismo)',
      produces: 'coverage.json da tradição e piso validado contra as referências',
    },
    inputs: (c) => [
      paths(c).page,
      paths(c).graph,
      paths(c).manifest,
      join(c.root, 'scripts/tradicao/coverage-floor.json'),
    ],
    outputs: (c) => [paths(c).coverage],
    commands: () => [],
    async run(ctx) {
      const metrics = await measureTradition(ctx.slug, ctx.root).catch(() => null);
      if (!metrics) return;
      await writeJsonAtomic(paths(ctx).coverage, {
        metrics,
        gaps: checkFloor(metrics, await loadFloor(ctx.root)),
      });
    },
    async gate(ctx) {
      const floor = await loadFloor(ctx.root);
      const out = [
        check(
          'piso definido',
          Object.keys(floor.minimum).length >= 10,
          `${Object.keys(floor.minimum).length} métricas`,
        ),
      ];
      for (const slug of ['marxismo', 'liberalismo']) {
        const gaps = checkFloor(await measureTradition(slug, ctx.root), floor);
        out.push(
          check(
            `referência ${slug} cumpre o piso`,
            gaps.length === 0,
            gaps.map((g) => g.metric).join(', '),
          ),
        );
      }
      return out;
    },
  },
  {
    n: 1,
    id: 'registro',
    title: 'Registro declarativo',
    kind: 'auto',
    cost: 'grátis',
    contract: {
      needs: 'content/traditions/<slug>.json (única entrada humana)',
      produces: 'sementes da extração e esqueleto não publicado da leitura, derivados do registro',
    },
    inputs: (c) => [paths(c).registry],
    outputs: (c) => [paths(c).seeds, paths(c).page, paths(c).graph],
    commands: () => [],
    async run(ctx) {
      const entry = await loadRegistry(ctx.slug, ctx.root);
      const p = paths(ctx);
      await writeFormattedJson(p.seeds, seedsFile(entry));
      if (!(await exists(p.page)))
        return void (await createIdeologyDraft(draftInput(entry), ctx.root));
      // A reading released before `identity.palette` existed keeps its content; only the palette it
      // already resolves to (see `paletteOf`) is written down, so the registry and the page agree.
      const raw = await readFile(p.page, 'utf8');
      const page = JSON.parse(raw);
      if (!page.identity.palette) {
        // Insert the single property in place so the file keeps its layout and the diff stays one line.
        const patched = raw.replace(
          /("identity": \{[^}]*?)(\n)(\s*)\}/,
          (_, body, newline, indent) =>
            `${body},${newline}${indent}  "palette": ${JSON.stringify(entry.palette)}${newline}${indent}}`,
        );
        if (JSON.parse(patched).identity.palette === entry.palette)
          await writeFile(p.page, patched);
        else {
          page.identity.palette = entry.palette;
          await writeFormattedJson(p.page, page);
        }
      }
    },
    async gate(ctx) {
      const p = paths(ctx);
      let entry;
      try {
        entry = await loadRegistry(ctx.slug, ctx.root);
      } catch (error) {
        return [check('registro válido', false, error.message.split('\n')[0])];
      }
      const out = [
        check('registro válido', true, `${entry.seeds.length} sementes, paleta ${entry.palette}`),
      ];
      const seeds = await readJsonOr(p.seeds, null);
      out.push(
        check(
          'sementes derivadas do registro',
          JSON.stringify(seeds) === JSON.stringify(seedsFile(entry)),
          JSON.stringify(seeds) === JSON.stringify(seedsFile(entry))
            ? `${entry.seeds.length} sementes`
            : 'diverge do registro: rode o estágio 1',
        ),
      );
      let known = null;
      try {
        known = traditionFor(ctx.slug);
      } catch {
        // unknown to discovery: reported below
      }
      out.push(
        check(
          'descoberta Wikimedia conhece a tradição',
          known && known.rootQid === entry.rootQid,
          known ? `QID ${known.rootQid}` : 'sem entrada em traditions.mjs',
        ),
      );
      const page = await readJsonOr(p.page, null);
      out.push(
        check(
          'esqueleto da leitura existe',
          page,
          page ? `content/ideologies/${ctx.slug}/page.json` : 'ausente: rode o estágio 1',
        ),
      );
      if (page) {
        out.push(
          check(
            'atlasId e paleta batem com o registro',
            page.atlasId === atlasIdOf(entry) && page.identity.palette === entry.palette,
            `${page.atlasId} / ${page.identity.palette}`,
          ),
        );
        out.push(
          check(
            'classificação e recorte batem com o registro',
            page.classificationNote === entry.scope.classificationNote && page.kind === entry.kind,
          ),
        );
      }
      out.push(check('ícone conhecido', iconKinds.includes(entry.icon), entry.icon));
      const tiles = await readFile(
        join(ctx.root, 'src/app/shared/ui/geometric-mosaic/mosaic-tiles.ts'),
        'utf8',
      );
      out.push(
        check(
          'paleta existe no mosaico',
          new RegExp(`['"]?${entry.palette}['"]?\\s*:\\s*\\[`).test(tiles),
          entry.palette,
        ),
      );
      return out;
    },
  },
  {
    n: 2,
    id: 'descoberta',
    title: 'Descoberta por expansão e pontuação',
    kind: 'auto',
    cost: 'rede (Wikidata e Wikipedia, grátis)',
    contract: {
      needs: 'raiz Wikidata e lente do registro (sem sementes escolhidas por pessoa)',
      produces:
        'candidates/<slug>.json com anel, pontuação, faixa (aceita, revisa, descarta) e motivo; QID único',
    },
    inputs: (c) => [paths(c).registry],
    outputs: (c) => [paths(c).candidates],
    commands: (c) => [
      command('expandir a partir da raiz', ['node', 'scripts/tradicao/discover.mjs', c.slug], {
        network: true,
      }),
    ],
    async gate(ctx) {
      const file = await readJsonOr(paths(ctx).candidates, null);
      if (!file) return [check('candidatos descobertos', false, 'rode o estágio 2')];
      // A faixa do descarte é auditoria: fica no arquivo e não precisa passar pelas regras dos aceitos.
      const accepted = file.candidates.filter((c) => c.decision === 'accept');
      const scored = file.candidates.some((c) => c.score != null);
      const entry = await loadRegistry(ctx.slug, ctx.root).catch(() => null);
      const caps = { ...defaults.ringCaps, ...entry?.discovery.ringCaps };
      const thresholds = { ...defaults.thresholds, ...entry?.discovery.thresholds };
      const out = [
        check('aceitos suficientes', accepted.length >= 8, `${accepted.length} (mínimo 8)`),
        check(
          'sem lista, desambiguação ou ano genérico aceito',
          !accepted.some((c) => isGenericTitle(c.title)),
          accepted
            .filter((c) => isGenericTitle(c.title))
            .map((c) => c.title)
            .join(', '),
        ),
        check(
          'sem duplicata (mesmo QID no mesmo idioma)',
          new Set(accepted.map((c) => `${c.qid ?? c.title}:${c.lang}`)).size === accepted.length,
        ),
      ];
      if (scored) {
        const perRing = (ring) => accepted.filter((c) => c.ring === ring).length;
        out.push(
          check(
            'todo candidato com anel de 1 a 3',
            file.candidates.every((c) => c.ring >= 1 && c.ring <= maxRing),
          ),
          check(
            'teto por anel respeitado',
            [1, 2, 3].every((ring) => perRing(ring) <= caps[ring]),
            [1, 2, 3].map((ring) => `anel ${ring}: ${perRing(ring)}/${caps[ring]}`).join(', '),
          ),
          check(
            'aceito automático só acima do limite (ou regional, ou decisão nomeada)',
            accepted.every((c) => c.score >= thresholds.accept || c.regional || c.decidedBy),
          ),
          check(
            'faixa do meio é lista curta (≤ 30)',
            file.candidates.filter((c) => c.decision === 'review').length <= 30,
            `${file.candidates.filter((c) => c.decision === 'review').length} para decidir`,
          ),
        );
      } else {
        const types = new Set(
          accepted.filter((c) => c.decidedBy !== 'seed' && c.type).map((c) => c.type),
        );
        out.push(
          check(
            'legado: aceitos por decisão registrada, sem pontuação',
            accepted.every((c) => c.decidedBy),
            `decisores: ${[...new Set(accepted.map((c) => c.decidedBy))].join(', ')}; refaça com npm run tradicao:discover`,
          ),
          check(
            'sem catálogo ou registro de autoridade aceito sem decisor nomeado',
            !accepted.some(
              (c) =>
                unreviewedTypes.has(c.type) && (!c.decidedBy || c.decidedBy.startsWith('rule:')),
            ),
          ),
          check(
            'aceitos de ao menos 3 tipos além das sementes',
            types.size >= 3,
            [...types].join(', '),
          ),
        );
      }
      return out;
    },
  },
  {
    n: 3,
    id: 'captura',
    title: 'Captura reproduzível (raw)',
    kind: 'auto',
    cost: 'rede (Wikipedia, grátis)',
    contract: {
      needs: 'candidatos aceitos',
      produces: 'artigos locais e manifestos de captura com SHA-256 por resposta',
    },
    inputs: (c) => [paths(c).candidates],
    outputs: (c) => [paths(c).articles, paths(c).rawDirectory],
    commands: (c) => [
      command(
        'baixar aceitos',
        ['node', 'scripts/wiki-extract.mjs', 'fetch', c.slug, '--candidates'],
        { network: true },
      ),
    ],
    async gate(ctx) {
      const p = paths(ctx);
      const accepted = (await acceptedCandidates(p)) ?? [];
      const have = new Set(await listJson(p.articles));
      const missing = accepted.map(candidateId).filter((id) => !have.has(id));
      const captures = (await readdir(p.rawDirectory).catch(() => [])).sort();
      let bad = 0;
      for (const name of captures) {
        const manifest = await readJsonOr(join(p.rawDirectory, name, 'manifest.json'), null);
        if (!manifest || !captureSchema.safeParse(manifest).success) bad += 1;
      }
      return [
        check(
          'todo aceito tem artigo local',
          accepted.length > 0 && missing.length === 0,
          missing.length
            ? `faltam ${missing.length}: ${missing.slice(0, 3).join(', ')}`
            : `${accepted.length} artigos`,
        ),
        check('há captura com manifesto', captures.length > 0, `${captures.length} capturas`),
        check(
          'manifestos válidos (URL, tipo, SHA-256, licença)',
          captures.length > 0 && bad === 0,
          `${bad} inválidos`,
        ),
      ];
    },
  },
  {
    n: 4,
    id: 'calibracao',
    title: 'Avaliação de modelo',
    kind: 'human',
    cost: 'API Anthropic (amostra de ~20 artigos, Haiku 5.5 low e medium, centavos); a execução é aprovada por pessoa',
    manual:
      'chamada paga e conferência humana: npm run tradicao:eval -- run --from <tradições> --sample 20 --dry-run; sem --dry-run para rodar; depois report, a conferência em revisao.json e score',
    contract: {
      needs: 'artigos locais com links e alvos (amostra) e conferência humana',
      produces:
        'model-choice.json: erro restante por configuração e modelo fixado; Haiku fica abaixo de 5%, senão só relações sobe',
    },
    inputs: (c) => [paths(c).articles],
    outputs: (c) => [join(c.root, 'scripts/tradicao/model-choice.json')],
    commands: () => [],
    async gate(ctx) {
      const file = join(ctx.root, 'scripts/tradicao/model-choice.json');
      const raw = await readJsonOr(file, null);
      if (!raw)
        return [
          check(
            'model-choice.json existe',
            false,
            'sem medição: rode npm run tradicao:eval (ver FLUXO-DE-POPULACAO.md)',
          ),
        ];
      const parsed = modelChoiceSchema.safeParse(raw);
      if (!parsed.success)
        return [
          check(
            'escolha de modelo válida',
            false,
            parsed.error.issues
              .map((i) => i.message)
              .slice(0, 2)
              .join('; '),
          ),
        ];
      const chosen = Object.keys(parsed.data.chosen);
      return [
        check(
          'escolha de modelo válida (Haiku low e medium medidos)',
          true,
          `${parsed.data.candidates.length} configurações`,
        ),
        check('extração com modelo fixado', chosen.includes('extracao'), chosen.join(', ')),
      ];
    },
  },
  {
    n: 5,
    id: 'extracao',
    title: 'Extração rica por entidade',
    kind: 'auto',
    cost: 'API Anthropic (lote, com teto de gasto); estimativa por --dry-run',
    contract: {
      needs: 'artigos locais',
      produces:
        'extracts/<id>.json: linha de hover, resumo, seções, glossário pt/en, relações em frase e afirmações, tudo com citação literal, revisão `assistant`',
    },
    inputs: (c) => [paths(c).articles],
    outputs: (c) => [paths(c).extracts],
    commands: (c) => [
      command(
        'extrair em lote, com teto',
        ['node', 'scripts/tradicao/extract.mjs', c.slug, '--max-usd', '1'],
        { api: true },
      ),
    ],
    async estimate(ctx) {
      const p = paths(ctx);
      const { model, effort, relationModel } = chosenOptions(
        await readJsonOr(join(ctx.root, 'scripts/tradicao/model-choice.json'), null),
      );
      const plan = planRun({
        records: await loadRecords(p.articles),
        state: await loadState(ctx.root, ctx.slug),
        model,
        effort,
        relationModel,
      });
      return {
        articles: plan.prepared.length,
        inputTokens: plan.extract.inputTokens + plan.verify.inputTokens,
        outputTokens: plan.extract.expectedOutputTokens + plan.verify.expectedOutputTokens,
        usd: plan.extract.expectedUsd + plan.verify.expectedUsd + plan.verifytext.expectedUsd,
        worstCaseUsd: plan.worstCaseUsd,
        basis: `${model} ${effort}, em lote; pior caso US$ ${plan.worstCaseUsd.toFixed(3)}`,
      };
    },
    async gate(ctx) {
      const p = paths(ctx);
      const articles = await listJson(p.articles);
      const extracts = await listJson(p.extracts);
      if (!articles.length) return [check('artigos locais presentes', false, 'rode o estágio 3')];
      const out = [
        check(
          'todo artigo tem rascunho extraído',
          articles.every((id) => extracts.includes(id)),
          `${extracts.length}/${articles.length}`,
        ),
      ];
      let rejected = 0;
      let unreviewed = 0;
      let uncovered = 0;
      let skipped = 0;
      let schemaErrors = 0;
      for (const id of extracts) {
        const draft = await readJson(join(p.extracts, `${id}.json`));
        const record = await readJsonOr(join(p.articles, `${id}.json`), null);
        if (draft.review?.by !== 'assistant' || draft.review?.status !== 'draft') unreviewed += 1;
        if (!draft.source?.coverage) uncovered += 1;
        else skipped += draft.source.coverage.skipped?.length ?? 0;
        // Rich drafts carry their own contract; below, the rich checks read them.
        if (draft.contract) continue;
        const parsed = extractionSchema.safeParse({
          summary: draft.summary,
          dates: draft.dates,
          relations: draft.relations,
          claims: draft.claims,
        });
        if (!parsed.success) {
          schemaErrors += 1;
          continue;
        }
        if (record)
          rejected += verifyQuotes(parsed.data, articleText(record.article, maxInputChars).text)
            .rejected.length;
      }
      out.push(
        check(
          'contrato do rascunho válido',
          extracts.length > 0 && schemaErrors === 0,
          `${schemaErrors} inválidos`,
        ),
        check(
          'citações literais reverificadas: 0 rejeitadas',
          extracts.length > 0 && rejected === 0,
          `${rejected} rejeitadas`,
        ),
        check(
          'revisão marcada como IA (`assistant`, rascunho)',
          extracts.length > 0 && unreviewed === 0,
          `${unreviewed} fora do padrão`,
        ),
        check(
          'cobertura do artigo registrada',
          extracts.length > 0 && uncovered === 0,
          `${skipped} seções não lidas no total`,
        ),
      );
      let lean = 0;
      let richRejected = 0;
      let unconfirmed = 0;
      for (const id of extracts) {
        const draft = await readJson(join(p.extracts, `${id}.json`));
        if (richGaps(draft).length) {
          lean += 1;
          continue;
        }
        unconfirmed += (draft.relations ?? []).filter((r) => r.verified !== true).length;
        const record = await readJsonOr(join(p.articles, `${id}.json`), null);
        if (record)
          richRejected += unverifiedQuotes(draft, richSourceText(record.article).text).length;
      }
      out.push(
        check(
          'conteúdo rico (linha, resumo, seções, glossário, relações em frase)',
          extracts.length > 0 && lean === 0,
          `${lean} de ${extracts.length} rascunhos ainda enxutos`,
        ),
        check(
          'citações de seções e relações literais no artigo',
          extracts.length > 0 && lean === 0 && richRejected === 0,
          `${richRejected} rejeitadas`,
        ),
        check(
          'toda relação confirmada pela segunda passada',
          extracts.length > 0 && unconfirmed === 0,
          `${unconfirmed} sem confirmação`,
        ),
      );
      return out;
    },
  },
  {
    n: 6,
    id: 'consolidacao',
    title: 'Consolidação no grafo',
    kind: 'auto',
    cost: 'grátis',
    contract: {
      needs: 'rascunhos extraídos',
      produces:
        'coleção atlas-<slug> no manifesto, com entidades, evidências, afirmações e relações tipadas',
    },
    inputs: (c) => [paths(c).extracts],
    outputs: (c) => [paths(c).manifest],
    commands: () => [
      command('converter rascunhos', ['node', 'scripts/content/wiki-drafts-to-collections.mjs']),
    ],
    async gate(ctx) {
      const p = paths(ctx);
      const atlasId = `atlas-${ctx.slug}`;
      const graph = await readSourceGraph(join(ctx.root, 'content/knowledge')).catch(
        (error) => error,
      );
      if (graph instanceof Error)
        return [check('grafo válido (hashes e referências)', false, graph.message)];
      const atlas = graph.atlases.find((a) => a.id === atlasId);
      if (!atlas)
        return [
          check('grafo válido', true),
          check(`coleção ${atlasId} no manifesto`, false, 'rode o estágio 6'),
        ];
      const ids = new Set(graph.atlases.flatMap((a) => a.entities.map((e) => e.id)));
      const qids = new Set(
        graph.atlases.flatMap((a) =>
          a.entities.flatMap((e) => (e.externalIds ? [e.externalIds.wikidata] : [])),
        ),
      );
      const accepted = (await acceptedCandidates(p)) ?? [];
      const missing = accepted.filter(
        (c) => !ids.has(`wiki-${candidateId(c)}`) && !(c.qid && qids.has(c.qid)),
      );
      const ownRelations = atlas.relations.length;
      const pendingReviews = atlas.reviews.filter(
        (r) => r.status === 'pending' || r.status === 'draft',
      ).length;
      return [
        check('grafo válido (hashes e referências)', true),
        check(`coleção ${atlasId} no manifesto`, true, `${atlas.entities.length} entidades`),
        check(
          'todo aceito virou entidade (ou foi unido por QID)',
          missing.length === 0,
          missing
            .map((c) => c.title)
            .slice(0, 4)
            .join(', '),
        ),
        check(
          'nenhuma revisão humana inventada',
          atlas.reviews.every((r) => r.status === 'pending' || r.status === 'draft' || r.reviewer),
          '',
        ),
        check(
          'afirmações com revisão pendente registradas',
          atlas.claims.length === 0 || pendingReviews > 0,
          `${pendingReviews} pendentes`,
        ),
        check(
          'relações tipadas no grafo (≥ 1)',
          ownRelations > 0,
          `${ownRelations} arestas; pendências no relatório do conversor`,
        ),
      ];
    },
  },
  {
    n: 7,
    id: 'glossario',
    title: 'Glossário e hovers',
    kind: 'auto',
    cost: 'grátis',
    contract: {
      needs: 'entidades consolidadas com conteúdo rico',
      produces:
        'glossary.json: termos pt/en ligados a uma entidade, ambíguos separados, e linha e resumo por entidade para hover e folha',
    },
    inputs: (c) => [paths(c).extracts, paths(c).manifest],
    outputs: (c) => [paths(c).glossary],
    commands: () => [],
    async run(ctx) {
      const p = paths(ctx);
      const entities = [];
      for (const id of await listJson(p.extracts)) {
        const draft = await readJson(join(p.extracts, `${id}.json`));
        if (!draft.oneLine) continue;
        entities.push({
          id: `wiki-${draft.entity.id}`,
          oneLine: draft.oneLine,
          summary: draft.summary,
          glossary: draft.glossary ?? [],
        });
      }
      await writeJsonAtomic(p.glossary, {
        ...buildGlossary(entities),
        hovers: Object.fromEntries(
          entities.map((e) => [e.id, { oneLine: e.oneLine, summary: e.summary }]),
        ),
      });
    },
    async gate(ctx) {
      const p = paths(ctx);
      const glossary = await readJsonOr(p.glossary, null);
      if (!glossary)
        return [
          check(
            'glossário gerado',
            false,
            'sem conteúdo rico para gerar: rode o estágio 5 com o extrator rico',
          ),
        ];
      const graph = await readSourceGraph(join(ctx.root, 'content/knowledge'));
      const atlas = graph.atlases.find((a) => a.id === `atlas-${ctx.slug}`);
      const ids = new Set((atlas?.entities ?? []).map((e) => e.id));
      const hovers = Object.entries(glossary.hovers);
      const covered = [...ids].filter((id) => glossary.hovers[id]).length;
      return [
        check(
          'toda entidade com linha de hover (≤ 140) e resumo (≤ 600)',
          hovers.length > 0 &&
            hovers.every(([, h]) => h.oneLine.length <= 140 && h.summary.length <= 600),
          `${hovers.length} hovers`,
        ),
        check(
          'hover cobre ao menos 90% das entidades da tradição',
          ids.size > 0 && covered / ids.size >= 0.9,
          `${covered} de ${ids.size}`,
        ),
        check(
          'todo termo ligado aponta para entidade existente',
          glossary.links.every((l) => ids.has(l.entityId)),
          `${glossary.links.length} termos`,
        ),
        check(
          'termos ambíguos não são ligados sozinhos',
          glossary.ambiguous.every((a) => !glossary.links.some((l) => l.term === a.term)),
          `${glossary.ambiguous.length} ambíguos`,
        ),
      ];
    },
  },
  {
    n: 8,
    id: 'redacao',
    title: 'Leitura montada do grafo',
    kind: 'auto',
    cost: 'grátis',
    contract: {
      needs: 'coleção consolidada no grafo',
      produces:
        'page.json por ideologia com capítulos montados só de passagens citadas; `pending` com motivo onde o grafo não sustenta; sem pergunta nem ponte (estágio 9)',
    },
    inputs: (c) => [paths(c).manifest, paths(c).registry],
    outputs: (c) => [paths(c).page, paths(c).graph],
    commands: () => [],
    async run(ctx) {
      const registry = await loadRegistry(ctx.slug, ctx.root);
      await generateReadings({
        root: ctx.root,
        atlasId: atlasIdOf(registry),
        slugs: await readingSlugs(ctx, registry),
      });
    },
    async gate(ctx) {
      const registry = await loadRegistry(ctx.slug, ctx.root);
      let result;
      try {
        result = await generateReadings({
          root: ctx.root,
          atlasId: atlasIdOf(registry),
          slugs: await readingSlugs(ctx, registry),
          write: false,
        });
      } catch (error) {
        return [
          check(
            'leituras válidas (schema e referências)',
            false,
            String(error.message).split('\n')[0],
          ),
        ];
      }
      return [
        check('leituras válidas (schema e referências)', true, `${result.written.length} leituras`),
        check(
          'cada leitura gerada tem algum capítulo completo',
          result.reports.every((r) => r.complete.length >= 1),
          `${result.reports.filter((r) => r.complete.length < 1).length} sem capítulo completo`,
        ),
        check(
          'capítulo pendente ou parcial tem motivo',
          result.reports.every((r) => [...r.pending, ...r.partial].every((id) => r.gaps[id])),
        ),
        check(
          '12 capítulos canônicos por leitura',
          result.reports.every(
            (r) => r.complete.length + r.partial.length + r.pending.length === 12,
          ),
        ),
      ];
    },
  },
  {
    n: 9,
    id: 'edicao',
    title: 'Edição de texto',
    kind: 'agent',
    cost: 'API Anthropic (Haiku 5.5, effort low)',
    agent: {
      skill: 'atlas-editorial-geometrico',
      model: 'claude-haiku-5-5',
      effort: 'low',
      does: 'revisa tom, pergunta e ponte de cada capítulo, sem acrescentar afirmação sem fonte',
    },
    contract: {
      needs: 'capítulos redigidos',
      produces: 'texto sem marcador de rascunho, com pergunta e ponte nos capítulos preenchidos',
    },
    inputs: (c) => [paths(c).page],
    outputs: (c) => [paths(c).page],
    commands: () => [],
    async gate(ctx) {
      const page = await readJsonOr(paths(ctx).page, null);
      if (!page) return [check('leitura existe', false)];
      const filled = page.chapters.filter((c) => c.coverage !== 'pending');
      const last = page.chapters.at(-1)?.id;
      const text = (c) => c.narrative.join(' ');
      return [
        check(
          'sem texto de reserva nos capítulos preenchidos',
          !filled.some((c) => placeholder.test(text(c))),
          filled
            .filter((c) => placeholder.test(text(c)))
            .map((c) => c.id)
            .join(', '),
        ),
        check(
          'pergunta do iniciante em cada capítulo preenchido',
          filled.every((c) => c.question),
          filled
            .filter((c) => !c.question)
            .map((c) => c.id)
            .join(', '),
        ),
        check(
          'ponte para o capítulo seguinte',
          filled.every((c) => c.bridge || c.id === last),
          filled
            .filter((c) => !c.bridge && c.id !== last)
            .map((c) => c.id)
            .join(', '),
        ),
        check(
          'parágrafos curtos (≤ 900 caracteres)',
          filled.every((c) => c.narrative.every((n) => n.length <= 900)),
        ),
      ];
    },
  },
  {
    n: 10,
    id: 'identidade',
    title: 'Ícones e identidade',
    kind: 'auto',
    cost: 'grátis',
    contract: {
      needs: 'registro e leitura',
      produces: 'paleta do mosaico, acento, assinatura e ícone resolvido para todo tipo do escopo',
    },
    inputs: (c) => [paths(c).page, paths(c).registry],
    outputs: (c) => [paths(c).page],
    commands: () => [],
    async gate(ctx) {
      const page = await readJsonOr(paths(ctx).page, null);
      if (!page) return [check('leitura existe', false)];
      const graph = await readSourceGraph(join(ctx.root, 'content/knowledge'));
      const atlas = graph.atlases.find((a) => a.id === page.atlasId);
      const known = new Set([
        'person',
        'ideology',
        'concept',
        'work',
        'event',
        'historical-polity',
        'place',
        'party',
        'institution',
        'government',
        'country',
        'regime',
        'policy',
        'article',
      ]);
      const kinds = new Set((atlas?.entities ?? []).map((e) => e.kind));
      const entry = await loadRegistry(ctx.slug, ctx.root).catch(() => null);
      return [
        check(
          'paleta declarada na leitura',
          Boolean(page.identity.palette),
          page.identity.palette ?? 'ausente',
        ),
        check(
          'acento e assinatura definidos',
          Boolean(page.identity.accent && page.identity.signature) &&
            page.identity.signature !== 'Rascunho estrutural',
          page.identity.signature,
        ),
        check(
          'todo tipo do escopo tem ícone próprio',
          [...kinds].every((k) => known.has(k)),
          [...kinds].filter((k) => !known.has(k)).join(', '),
        ),
        check(
          'paleta da leitura igual à do registro',
          !entry || entry.palette === page.identity.palette,
        ),
      ];
    },
  },
  {
    n: 11,
    id: 'imagens',
    title: 'Imagens de referência',
    kind: 'auto',
    cost: 'rede (Commons, grátis)',
    contract: {
      needs: 'entidades do escopo',
      produces: 'ativos com licença por arquivo, miniatura remota e cada imagem uma só vez',
    },
    inputs: (c) => [paths(c).extracts],
    outputs: (c) => [paths(c).manifest, join(paths(c).work, 'images.json')],
    commands: (c) => [
      command('conferir licença por arquivo', ['node', 'scripts/tradicao/images.mjs', c.slug], {
        network: true,
      }),
      command('gravar ativos no grafo', ['node', 'scripts/content/wiki-drafts-to-collections.mjs']),
    ],
    async gate(ctx) {
      const page = await readJsonOr(paths(ctx).page, null);
      if (!page) return [check('leitura existe', false)];
      const graph = await readSourceGraph(join(ctx.root, 'content/knowledge'));
      const atlas = graph.atlases.find((a) => a.id === page.atlasId);
      const assets = atlas?.assetLicenses ?? [];
      const bad = assets.filter(
        (a) =>
          a.status !== 'known' ||
          a.reproduction !== 'allowed' ||
          !a.license ||
          !a.licenseUrl ||
          !a.creator ||
          !a.filePageUrl ||
          !a.attribution ||
          !/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(a.assetPath),
      );
      const urls = assets.map((a) => a.assetPath);
      const floor = await loadFloor(ctx.root);
      const metrics = await measureTradition(ctx.slug, ctx.root);
      const flat = flatten(metrics);
      return [
        check(
          'toda imagem com licença, autor, atribuição e página do arquivo',
          bad.length === 0,
          bad
            .map((a) => a.id)
            .slice(0, 3)
            .join(', '),
        ),
        check('cada imagem uma só vez', new Set(urls).size === urls.length),
        check(
          'imagens suficientes (piso)',
          flat['images.licenciadas'] >= floor.minimum['images.licenciadas'],
          `${flat['images.licenciadas']} de ${floor.minimum['images.licenciadas']}`,
        ),
      ];
    },
  },
  {
    n: 12,
    id: 'montagem',
    title: 'Montagem e registro da leitura',
    kind: 'auto',
    cost: 'grátis',
    contract: {
      needs: 'leitura validada',
      produces: 'registro nos seis pontos da aplicação, somente após aprovação',
    },
    inputs: (c) => [paths(c).page],
    outputs: (c) => [paths(c).page],
    commands: () => [],
    manual:
      'ainda sem automação: a escrita nos seis pontos é manual e só após aprovação (o gate apenas verifica)',
    async gate(ctx) {
      const page = await readJsonOr(paths(ctx).page, null);
      if (!page) return [check('leitura existe', false)];
      const gaps = await registrationGaps(ctx.root, ctx.slug);
      return page.published
        ? [
            check(
              'registrada nos seis pontos (rotas, leituras, e2e, busca)',
              gaps.length === 0,
              gaps.join('; '),
            ),
          ]
        : [
            check(
              'não publicada e ainda não registrada (nada entra antes da aprovação)',
              gaps.length === registrationPoints(ctx.slug).length,
              `${gaps.length} pontos a registrar na publicação`,
            ),
          ];
    },
  },
  {
    n: 13,
    id: 'verificacao',
    title: 'Verificação',
    kind: 'auto',
    cost: 'grátis',
    contract: {
      needs: 'leitura montada',
      produces: 'piso de cobertura atingido, dossiê válido, build de conteúdo e testes verdes',
    },
    inputs: (c) => [paths(c).page, paths(c).graph, paths(c).manifest],
    outputs: (c) => [paths(c).coverage],
    commands: (c) => [
      command('build de conteúdo', ['npm', 'run', 'content:build']),
      ...(c.full
        ? [
            command('testes de conteúdo e tradição', ['npm', 'run', 'test:content']),
            command('lint', ['npm', 'run', 'lint']),
            command('typecheck', ['npm', 'run', 'typecheck']),
            command('testes unitários', ['npm', 'test']),
          ]
        : []),
    ],
    async gate(ctx) {
      const metrics = await measureTradition(ctx.slug, ctx.root);
      const gaps = checkFloor(metrics, await loadFloor(ctx.root));
      let valid = true;
      let detail = '';
      try {
        await dossier(ctx);
      } catch (error) {
        valid = false;
        detail = String(error.message).split('\n')[0];
      }
      return [
        check('dossiê válido', valid, detail),
        check(
          'piso de cobertura atingido',
          gaps.length === 0,
          gaps
            .map(
              (g) =>
                `${g.metric} ${g.actual}${g.minimum === undefined ? '>' + g.maximum : '<' + g.minimum}`,
            )
            .join('; '),
        ),
      ];
    },
  },
  {
    n: 14,
    id: 'publicacao',
    title: 'Publicação (aprovação humana)',
    kind: 'human',
    cost: 'R2 (nunca executado pelo orquestrador)',
    contract: {
      needs: 'revisão humana identificada e aprovação explícita',
      produces: 'leitura publicada; `content:publish` é rodado por pessoa',
    },
    inputs: (c) => [paths(c).page],
    outputs: (c) => [paths(c).page],
    commands: () => [],
    async gate(ctx) {
      const page = await readJsonOr(paths(ctx).page, null);
      if (!page) return [check('leitura existe', false)];
      return [
        check(
          'revisão humana com pessoa e data',
          page.review.status === 'revisado' && Boolean(page.review.reviewer),
          `${page.review.status}${page.review.reviewer ? ` por ${page.review.reviewer}` : ''}`,
        ),
        check('marcada para publicação', page.published === true, `published=${page.published}`),
      ];
    },
  },
];

export const stageByNumber = (n) => stages.find((stage) => stage.n === n);
export { measure };
