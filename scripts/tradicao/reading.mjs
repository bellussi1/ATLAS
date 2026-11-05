#!/usr/bin/env node
/**
 * Estágio 8 automático: monta a leitura (dossiê de 12 capítulos) de uma ideologia só com o que já
 * está no grafo. Nada é redigido: cada capítulo reúne afirmações, seções e relações existentes,
 * sempre com a fonte e a passagem citada. O que o grafo não sustenta fica `pending` com o motivo
 * em `gap` e sem blocos. A prosa de ligação (pergunta e ponte) fica de fora de propósito.
 *
 * Uso:
 *   npm run tradicao:reading -- <slug> [--atlas <id>] [--dry-run]
 *   npm run tradicao:reading -- --all [--atlas atlas-ideologias-principais] [--dry-run]
 */
import '../content/register-source-modules.mjs';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { formatJson, readSourceGraph } from '../content/source-graph.mjs';
import { projectRoot } from './registry.mjs';

const { canonicalChapters } =
  await import('../../src/app/features/ideologies/models/ideology-chapters.ts');
const { readerProse } = await import('../../src/app/core/content/editorial/reader-voice.ts');
const { validateIdeologyDossier } =
  await import('../../src/app/features/ideologies/models/ideology-page.schema.ts');

/** Marca das leituras geradas: só elas podem ser regeradas; páginas escritas à mão nunca são tocadas. */
export const generatedSignature = 'Leitura montada do grafo';
export const defaultAtlasId = 'atlas-ideologias-principais';

const CLASSIFICATION = {
  'documented-fact': 'alegação empírica',
  'attributed-thesis': 'tese atribuída',
  interpretation: 'interpretação',
  'contested-claim': 'alegação empírica',
};
const POSITION = /^Posição política descrita na fonte:/;
const YEARS = /\s*\((-?\d{3,4})(?:\s*[–-]\s*(\d{3,4}))?\)\.?\s*$/;
const REF_KINDS = {
  person: 'pensadores',
  work: 'pensadores',
  ideology: 'vertentes',
  event: 'experiencias',
  party: 'experiencias',
  institution: 'experiencias',
  government: 'experiencias',
};

/**
 * O leitor lê "verbete", não "o artigo", e não vê frases que só descrevem o processo.
 * "Em artigo de 1979" (um texto publicado) continua como está.
 */
export function readerText(text) {
  const prose = readerProse(text);
  return prose
    ? prose.replace(/\b(o|do|no|ao|pelo|este|esse|neste|nesse)(\s+)artigo\b/gi, '$1$2verbete')
    : null;
}
const tokens = (text) =>
  new Set(
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3),
  );
function similar(a, b) {
  const x = tokens(a);
  const y = tokens(b);
  const shared = [...x].filter((word) => y.has(word)).length;
  return shared / Math.max(1, Math.min(x.size, y.size)) >= 0.6;
}
const minutesOf = (parts) =>
  Math.max(1, Math.ceil(parts.join(' ').split(/\s+/).filter(Boolean).length / 180));
const dedupe = (values) => [...new Set(values)];

/** Afirmações da entidade com a seção de origem, a passagem citada e a fonte. */
export function entityClaims(entity, atlas) {
  const evidences = new Map(atlas.evidences.map((e) => [e.id, e]));
  const citations = new Map(atlas.citations.map((c) => [c.id, c]));
  const sections = entity.sections.filter((s) => s.heading !== 'Resumo');
  return atlas.claims
    .filter((claim) => claim.entityId === entity.id)
    .flatMap((claim) => {
      const sourceIds = dedupe(
        claim.citationIds.flatMap((id) => {
          const evidence = evidences.get(citations.get(id)?.evidenceId);
          return evidence ? [evidence.sourceId] : [];
        }),
      );
      if (!sourceIds.length) return [];
      const section = sections.find((s) => s.paragraphs.includes(claim.text));
      const dated = YEARS.exec(claim.text);
      const text = readerText(claim.text.replace(YEARS, '').trim());
      if (!text) return [];
      return [
        {
          id: claim.id,
          raw: claim.text,
          text: /[.!?…]$/.test(text) ? text : `${text}.`,
          heading: section?.heading ?? null,
          classification: claim.classification,
          sourceIds,
          start: dated ? Number(dated[1]) : null,
          end: dated ? Number(dated[2] ?? dated[1]) : null,
        },
      ];
    });
}

const item = (id, title, kicker, claim, entityId) => ({
  id,
  title,
  kicker,
  summary: claim.text,
  paragraphs: [claim.text],
  sourceIds: claim.sourceIds,
  entityIds: [entityId],
  classification: CLASSIFICATION[claim.classification] ?? 'interpretação',
});

/** Capítulo de itens: um por afirmação, na ordem do grafo. */
function itemsOf(prefix, heading, kicker, claims, entityId) {
  return claims.map((claim, i) =>
    item(
      `${prefix}-${i + 1}`,
      claims.length > 1 ? `${heading} ${i + 1}` : heading,
      kicker,
      claim,
      entityId,
    ),
  );
}

const pending = (gap) => ({ pending: true, gap });

/**
 * Conteúdo de cada capítulo a partir do grafo. `related` agrupa os registros ligados à ideologia
 * por relação, já separados por capítulo.
 */
function chapterContents(entity, claims, related, source) {
  const by = (heading) => claims.filter((c) => c.heading === heading);
  const make = {};
  const narrativeOf = (list) => list.map((c) => c.text);
  const section = (list, prefix, heading, kicker, mode = 'principles') => ({
    claims: list,
    narrative: narrativeOf(list),
    blocks: [
      { type: 'explorations', mode, items: itemsOf(prefix, heading, kicker, list, entity.id) },
    ],
  });

  // O que é?
  const summary = (entity.sections.find((s) => s.heading === 'Resumo')?.paragraphs ?? [])
    .map(readerText)
    .filter(Boolean);
  make.introducao = summary.length
    ? { narrative: summary, blocks: [], claims: [], sourceIds: [source] }
    : pending('O grafo não traz resumo desta ideologia.');

  const origem = by('Origem');
  make.origens = origem.length
    ? section(origem, 'origem', 'Origem', 'Origens e formação')
    : pending('Nenhuma passagem do grafo trata da origem desta ideologia.');

  const ideias = by('Ideias centrais');
  make.principios = ideias.length
    ? section(ideias, 'ideia', 'Ideia central', 'Pilares e princípios')
    : pending('Nenhuma passagem do grafo descreve as ideias centrais desta ideologia.');

  const aliases = (entity.aliases ?? []).filter(Boolean);
  make.conceitos = aliases.length
    ? {
        partial: 'Só há nomes alternativos; termos do glossário ainda sem passagem verificada.',
        narrative: [`Também chamada de ${aliases.join(', ')}.`],
        claims: [],
        sourceIds: [source],
        blocks: [
          {
            type: 'entities',
            mode: 'concepts',
            entityIds: [entity.id],
            notes: { [entity.id]: `Nomes alternativos: ${aliases.join(', ')}.` },
          },
        ],
      }
    : pending('O grafo não registra nomes alternativos nem termos-chave desta ideologia.');

  const dated = claims.filter((c) => c.start != null && c.end != null && c.end >= c.start);
  const contexto = by('Contexto').filter(
    (c) => !dated.includes(c) && !dated.some((d) => similar(d.text, c.text)),
  );
  const epochClaims = [...dated].sort((a, b) => a.start - b.start);
  const epochItems = [
    ...epochClaims.map((claim, i) =>
      item(
        `marco-${i + 1}`,
        claim.start === claim.end ? `${claim.start}` : `${claim.start}–${claim.end}`,
        'Marco datado',
        claim,
        entity.id,
      ),
    ),
    ...itemsOf('contexto', 'Contexto', 'Situação histórica', contexto, entity.id),
  ];
  if (epochItems.length) {
    const blocks = [{ type: 'explorations', mode: 'principles', items: epochItems }];
    if (epochClaims.length)
      blocks.push({
        type: 'chronology',
        epochs: epochClaims.map((c, i) => ({
          itemId: `marco-${i + 1}`,
          start: c.start,
          end: c.end,
        })),
        entityIds: [entity.id],
        markerIds: [],
      });
    const all = [...epochClaims, ...contexto];
    make.epocas = {
      ...(epochClaims.length
        ? {}
        : {
            partial: 'Há contexto histórico, mas nenhuma data verificada para montar a cronologia.',
          }),
      claims: all,
      narrative: narrativeOf(all),
      blocks,
    };
  } else make.epocas = pending('Nenhuma passagem do grafo traz datas ou contexto histórico.');

  const entitiesBlock = (ids, mode, notes) => ({
    type: 'entities',
    mode,
    entityIds: ids,
    notes,
  });
  const relatedChapter = (id, gap, label) => {
    const records = related[id] ?? [];
    if (!records.length) return pending(gap);
    const blocks = [];
    const people = records.filter((r) => r.kind !== 'work');
    const works = records.filter((r) => r.kind === 'work');
    const notes = (list) =>
      Object.fromEntries(list.flatMap((r) => (r.note ? [[r.entity.id, r.note]] : [])));
    if (id === 'pensadores') {
      if (people.length)
        blocks.push(
          entitiesBlock(
            people.map((r) => r.entity.id),
            'thinkers',
            notes(people),
          ),
        );
      if (works.length)
        blocks.push(
          entitiesBlock(
            works.map((r) => r.entity.id),
            'documents',
            notes(works),
          ),
        );
    } else
      blocks.push(
        entitiesBlock(
          records.map((r) => r.entity.id),
          'concepts',
          notes(records),
        ),
      );
    return {
      claims: [],
      sourceIds: dedupe(records.flatMap((r) => r.sourceIds)),
      narrative: [label(records.map((r) => r.entity.title))],
      blocks,
    };
  };
  make.pensadores = relatedChapter(
    'pensadores',
    'Nenhuma pessoa ou obra ligada a esta ideologia consta no grafo.',
    (titles) => `Registros ligados à ideologia: ${titles.join(', ')}.`,
  );
  make.vertentes = relatedChapter(
    'vertentes',
    'Nenhuma corrente ou vertente ligada a esta ideologia consta no grafo.',
    (titles) => `Correntes relacionadas: ${titles.join(', ')}.`,
  );
  make.experiencias = relatedChapter(
    'experiencias',
    'Nenhum acontecimento, partido ou instituição ligado a esta ideologia consta no grafo.',
    (titles) => `Registros ligados à ideologia: ${titles.join(', ')}.`,
  );

  // Críticas: seção de controvérsias e alegações contestadas que não repetem a seção.
  const controversias = by('Controvérsias');
  const contested = claims.filter(
    (c) =>
      c.classification === 'contested-claim' &&
      !c.heading &&
      !controversias.some((s) => similar(s.text, c.text)),
  );
  const unique = [];
  for (const claim of [...controversias, ...contested])
    if (!unique.some((u) => similar(u.text, claim.text))) unique.push(claim);
  make.debates = unique.length
    ? {
        ...section(unique, 'critica', 'Crítica ou controvérsia', 'Argumentos e críticas'),
        partial:
          'Só há críticas e alegações contestadas; defesa e resposta ainda não têm passagem no grafo.',
      }
    : pending('Nenhuma controvérsia ou crítica consta no grafo para esta ideologia.');

  make.conexoes = relatedChapter(
    'conexoes',
    'Nenhuma ligação com outras tradições consta no grafo.',
    (titles) => `Registros ligados à ideologia: ${titles.join(', ')}.`,
  );

  const bibliografia = by('Bibliografia');
  make.leituras = bibliografia.length
    ? {
        ...section(bibliografia, 'leitura', 'Leitura citada', 'Roteiro de leitura', 'principles'),
        partial:
          'A bibliografia citada não traz edição nem nível de leitura; o roteiro estruturado fica pendente.',
      }
    : pending('Nenhuma obra citada como leitura consta no grafo.');

  make.fontes = {
    claims: [],
    sourceIds: [source],
    narrative: [
      `Reúne ${claims.length} ${claims.length === 1 ? 'afirmação' : 'afirmações'} de uma fonte enciclopédica, cada uma ligada à passagem original. Inclui síntese por IA · revisão humana não registrada.`,
    ],
    blocks: [{ type: 'sources', sourceIds: [source] }],
  };
  return make;
}

const sourcesOf = (content) =>
  content.sourceIds ?? dedupe((content.claims ?? []).flatMap((c) => c.sourceIds));

/**
 * Leitura de uma ideologia. `entityIndex` resolve os registros ligados por relação em qualquer
 * coleção; `relations` traz as relações do grafo inteiro que tocam a ideologia.
 */
export function buildReading({ entity, atlas, entityIndex, relations, today }) {
  const claims = entityClaims(entity, atlas);
  const source =
    claims[0]?.sourceIds[0] ?? atlas.sources.find((s) => s.id === `src-${entity.id}`)?.id;
  if (!source) throw new Error(`Sem fonte citada para ${entity.id}.`);
  const evidenceOf = (relation) =>
    atlas.evidences.filter((e) => relation.evidenceIds.includes(e.id)).map((e) => e.sourceId);
  const related = {};
  for (const relation of relations) {
    const otherId =
      relation.fromEntityId === entity.id ? relation.toEntityId : relation.fromEntityId;
    const other = entityIndex.get(otherId);
    if (!other || other.id === entity.id) continue;
    const chapter = REF_KINDS[other.kind] ?? 'conexoes';
    related[chapter] ??= [];
    const bucket = related[chapter];
    if (bucket.some((r) => r.entity.id === other.id)) continue;
    bucket.push({
      entity: other,
      kind: other.kind,
      note: readerText(relation.context),
      sourceIds: evidenceOf(relation),
    });
  }
  const position = atlas.claims
    .filter((c) => c.entityId === entity.id && POSITION.test(c.text))
    .map((c) => c.text.replace(/^Posição política descrita na fonte:\s*/, '').replace(/\.$/, ''));
  const content = chapterContents(entity, claims, related, source);
  if (position.length && content.introducao.narrative)
    content.introducao.narrative.push(`Posição política descrita na fonte: ${position[0]}.`);

  const chapters = canonicalChapters.map((chapter) => {
    const c = content[chapter.id];
    const base = {
      id: chapter.id,
      anchor: chapter.id,
      title: chapter.label,
      kicker: chapter.label,
      question: null,
      bridge: null,
      layout:
        chapter.id === 'introducao'
          ? 'introduction'
          : ({
              conceitos: 'concepts',
              principios: 'concepts',
              epocas: 'timeline',
              pensadores: 'thinkers',
              debates: 'debate',
              fontes: 'sources',
              conexoes: 'graph',
            }[chapter.id] ?? 'documents'),
    };
    if (c.pending)
      return {
        ...base,
        minutes: 1,
        narrative: ['Capítulo sem conteúdo verificado.'],
        sourceIds: [],
        gap: c.gap,
        coverage: 'pending',
        blocks: [],
      };
    const narrative = c.narrative;
    return {
      ...base,
      minutes: minutesOf(narrative),
      narrative,
      sourceIds: sourcesOf(c),
      gap: c.partial ?? null,
      coverage: c.partial ? 'partial' : 'complete',
      blocks: c.blocks,
    };
  });
  return {
    schemaVersion: 1,
    id: `ideology-page-${entity.slug}`,
    slug: entity.slug,
    kind: 'ideologia',
    classificationNote:
      'Recorte e classificação seguem o texto da fonte citada, sem revisão editorial. A posição política, quando aparece, é a descrita pela fonte.',
    title: entity.title,
    kicker: 'Ideologia política',
    summary: content.introducao.narrative?.[0] ?? `${entity.title}: leitura sem resumo verificado.`,
    published: false,
    atlasId: atlas.id,
    review: { status: 'rascunho', reviewer: null, updatedAt: today },
    identity: {
      accent: 'teal',
      signature: generatedSignature,
      keyVisualization: 'timeline',
    },
    portrait: null,
    chapters,
  };
}

/** Capítulos completos, parciais e pendentes de uma leitura, com o motivo de cada lacuna. */
export function readingReport(page) {
  const count = (coverage) => page.chapters.filter((c) => c.coverage === coverage);
  return {
    slug: page.slug,
    title: page.title,
    complete: count('complete').map((c) => c.id),
    partial: count('partial').map((c) => c.id),
    pending: count('pending').map((c) => c.id),
    gaps: Object.fromEntries(page.chapters.filter((c) => c.gap).map((c) => [c.id, c.gap])),
  };
}

export function reportMarkdown(atlasId, reports) {
  const lines = [
    `# Leituras geradas de ${atlasId}`,
    '',
    '| Leitura | Completos | Parciais | Pendentes | Pendentes (ids) |',
    '| --- | ---: | ---: | ---: | --- |',
    ...reports.map(
      (r) =>
        `| ${r.title} (\`${r.slug}\`) | ${r.complete.length} | ${r.partial.length} | ${r.pending.length} | ${r.pending.join(', ') || '—'} |`,
    ),
  ];
  const total = (key) => reports.reduce((sum, r) => sum + r[key].length, 0);
  lines.push(
    '',
    `Total: ${reports.length} leituras, ${total('complete')} capítulos completos, ${total('partial')} parciais, ${total('pending')} pendentes.`,
  );
  return `${lines.join('\n')}\n`;
}

const readJsonOr = (path, fallback) =>
  readFile(path, 'utf8').then(JSON.parse, (error) => {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  });

/**
 * Gera as leituras de uma coleção. `slugs` restringe a lista; `write: false` só valida e relata.
 * Páginas existentes que não levam a assinatura de geração são preservadas e listadas em `kept`.
 */
export async function generateReadings({
  root = projectRoot,
  atlasId = defaultAtlasId,
  slugs = null,
  write = true,
  today = new Date().toISOString().slice(0, 10),
} = {}) {
  const graph = await readSourceGraph(join(root, 'content/knowledge'));
  const atlas = graph.atlases.find((a) => a.id === atlasId);
  if (!atlas) throw new Error(`Coleção inexistente: ${atlasId}.`);
  const entityIndex = new Map(graph.atlases.flatMap((a) => a.entities.map((e) => [e.id, e])));
  const allRelations = graph.atlases.flatMap((a) => a.relations);
  const ideologies = atlas.entities.filter((e) => e.kind === 'ideology');
  const missing = (slugs ?? []).filter((s) => !ideologies.some((e) => e.slug === s));
  if (missing.length) throw new Error(`Sem ideologia em ${atlasId}: ${missing.join(', ')}.`);
  const supplement = { sources: [], edges: [], positions: [] };
  const written = [];
  const kept = [];
  const reports = [];
  for (const entity of ideologies.filter((e) => !slugs || slugs.includes(e.slug))) {
    const path = join(root, 'content/ideologies', entity.slug, 'page.json');
    const existing = await readJsonOr(path, null);
    if (existing && existing.identity?.signature !== generatedSignature) {
      kept.push(entity.slug);
      continue;
    }
    const page = buildReading({
      entity,
      atlas,
      entityIndex,
      relations: allRelations.filter(
        (r) => r.fromEntityId === entity.id || r.toEntityId === entity.id,
      ),
      today,
    });
    const { page: valid } = validateIdeologyDossier(page, supplement, graph);
    reports.push(readingReport(valid));
    if (write) {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, await formatJson(valid));
      const graphPath = join(root, 'content/graph', `${entity.slug}.json`);
      if ((await readJsonOr(graphPath, null)) === null) {
        await mkdir(dirname(graphPath), { recursive: true });
        await writeFile(graphPath, await formatJson({ sources: [], edges: [] }));
      }
    }
    written.push(entity.slug);
  }
  return { written, kept, reports, atlasId };
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      all: { type: 'boolean' },
      atlas: { type: 'string' },
      'dry-run': { type: 'boolean' },
    },
  });
  if (!values.all && !positionals.length)
    throw new Error(
      'Uso: npm run tradicao:reading -- <slug>... | --all [--atlas <id>] [--dry-run]',
    );
  const dry = Boolean(values['dry-run']);
  const result = await generateReadings({
    atlasId: values.atlas ?? defaultAtlasId,
    slugs: values.all ? null : positionals,
    write: !dry,
  });
  const markdown = reportMarkdown(result.atlasId, result.reports);
  if (!dry) {
    const out = join(projectRoot, 'generated/readings');
    await mkdir(out, { recursive: true });
    await writeFile(join(out, `${result.atlasId}.json`), await formatJson(result.reports));
    await writeFile(join(out, `${result.atlasId}.md`), markdown);
  }
  console.log(markdown);
  console.log(
    `${dry ? 'Simulação (nada gravado)' : 'Gravadas'}: ${result.written.length} leituras. Preservadas (escritas à mão): ${result.kept.join(', ') || 'nenhuma'}.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
