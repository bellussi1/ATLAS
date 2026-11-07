import { type KnowledgeGraph, sourceSchema } from '@core/content/models/content-schema';
import * as z from 'zod';

import { canonicalChapters } from './ideology-chapters';
import { positionAxisIds } from './position-axes';

const id = z.string().regex(/^[a-z][a-z0-9-]*$/);
export const ideologyEdgeSchema = z
  .object({
    id,
    from: id,
    to: id,
    type: z.enum([
      'influencia-documentada',
      'divergencia-ou-critica',
      'continuidade',
      'desenvolvimento',
      'associacao-tematica',
      'descoberta-enciclopedica',
    ]),
    label: z.string().min(1),
    context: z.string().min(1),
    sources: z.array(id),
    certainty: z.enum(['estabelecida', 'debatida', 'incerta']),
  })
  .refine(
    (edge) => edge.type === 'descoberta-enciclopedica' || edge.sources.length > 0,
    'Relação histórica exige fonte.',
  );

export const explorationItemSchema = z.object({
  id,
  title: z.string().min(1),
  kicker: z.string().min(1),
  summary: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(1),
  sourceIds: z.array(id).min(1),
  entityIds: z.array(id),
  classification: z.enum([
    'tese atribuída',
    'interpretação',
    'hipótese',
    'normativa',
    'alegação empírica',
    'limitação editorial',
  ]),
});
/** A short end-of-chapter reflection, written for the chapter instead of generated from relations. */
export const chapterReviewSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  /** What kind of reasoning the question asks for, shown before the answer. */
  rationale: z.string().min(1),
  sourceIds: z.array(id).min(1),
  /** Earlier records that gain a new meaning here, each with the connection to perceive. */
  revisit: z
    .array(z.object({ entityId: id, why: z.string().min(1) }))
    .max(3)
    .default([]),
});
export type ChapterReviewData = z.infer<typeof chapterReviewSchema>;
export const pageBlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('explorations'),
    mode: z.enum(['principles', 'schools']),
    items: z.array(explorationItemSchema).min(1),
  }),
  z.object({
    type: z.literal('debate'),
    topics: z
      .array(
        z.object({
          id,
          title: z.string().min(1),
          scope: z.string().min(1),
          defence: explorationItemSchema,
          criticism: explorationItemSchema,
          response: explorationItemSchema,
          limits: explorationItemSchema,
        }),
      )
      .min(1),
  }),
  z.object({
    type: z.literal('entities'),
    entityIds: z.array(id),
    mode: z.enum(['documents', 'thinkers', 'concepts']),
    /** Why each record appears at this point of the reading. */
    notes: z.record(z.string(), z.string().min(1)).default({}),
  }),
  z.object({ type: z.literal('atlas'), rootEntityId: id }),
  z.object({
    type: z.literal('reading-path'),
    works: z
      .array(
        z.object({
          title: z.string().min(1),
          author: z.string().min(1),
          year: z.string().regex(/^\d{4}(?:[–-]\d{4})?$/),
          edition: z.string().min(1),
          level: z.enum(['introdutório', 'intermediário', 'avançado']),
          theme: z.string().min(1),
          why: z.string().min(1),
          /** Primary text of the tradition, introduction, scholarly study or external critique. */
          kind: z.enum(['primária', 'introdução', 'estudo', 'crítica']).nullable().default(null),
          entityId: id.nullable().default(null),
        }),
      )
      .min(3),
  }),
  z.object({ type: z.literal('timeline'), entityIds: z.array(id) }),
  z.object({
    type: z.literal('chronology'),
    epochs: z
      .array(z.object({ itemId: id, start: z.number().int(), end: z.number().int() }))
      .min(1),
    entityIds: z.array(id),
    markerIds: z.array(id),
  }),
  z.object({ type: z.literal('graph'), edgeIds: z.array(id) }),
  z.object({ type: z.literal('argument'), topic: z.literal('smith-marx') }),
  z.object({ type: z.literal('sources'), sourceIds: z.array(id) }),
  z.object({ type: z.literal('positions'), entityIds: z.array(id).min(1) }),
]);
/** One attributed statement that places an entity on one analytic axis. */
export const positionClaimSchema = z.object({
  id,
  entityId: id,
  axisId: z.enum(positionAxisIds),
  value: z.number().min(-1).max(1),
  confidence: z.enum(['alta', 'média', 'baixa']),
  classification: z.enum(['tese atribuída', 'interpretação', 'hipótese']),
  statement: z.string().min(1),
  sourceIds: z.array(id).min(1),
  editorialStatus: z.literal('pending'),
});
export type PositionClaim = z.infer<typeof positionClaimSchema>;
/** One picture chosen for the opening: the record, the existing asset and why it belongs there. */
export const posterFigureSchema = z.object({
  entityId: id,
  assetId: id,
  /** Short identification under the picture; defaults to the record title. */
  label: z.string().min(1).optional(),
  /** Editorial reason shown in the credits and kept with the record. */
  note: z.string().min(1),
  frame: z.enum(['disc', 'arch', 'quarter', 'square']).optional(),
});
export type PosterFigure = z.infer<typeof posterFigureSchema>;
/** Page identity; keep in step with `MosaicPalette`, which the page component type-checks. */
export const ideologyPaletteSchema = z.enum([
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
]);
export const ideologyPageSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    slug: id,
    kind: z.enum([
      'ideologia',
      'corrente',
      'tradicao',
      'movimento',
      'programa',
      'pessoa',
      'acontecimento',
      'instituicao',
      'periodo',
      'conceito',
    ]),
    classificationNote: z.string().min(1),
    title: z.string().min(1),
    kicker: z.string().min(1),
    summary: z.string().min(1),
    published: z.boolean(),
    atlasId: id,
    review: z
      .object({
        status: z.enum(['rascunho', 'com-fontes', 'revisado']),
        reviewer: z.string().min(1).nullable(),
        updatedAt: z.iso.date(),
      })
      .refine(
        (review) => review.status !== 'revisado' || !!review.reviewer,
        'Revisão exige pessoa identificada.',
      ),
    identity: z.object({
      accent: z.enum(['indigo', 'teal', 'ochre']),
      palette: ideologyPaletteSchema.optional(),
      signature: z.string().min(1),
      keyVisualization: z.enum(['graph', 'timeline', 'comparison']),
    }),
    portrait: z.object({ entityId: id, assetId: id }).nullable().default(null),
    /** Explicit editorial selection for the opening images; empty means the safe automatic fallback. */
    poster: z
      .object({ figures: z.array(posterFigureSchema).max(4).default([]) })
      .default({ figures: [] }),
    chapters: z.array(
      z.object({
        id,
        anchor: id,
        title: z.string().min(1),
        kicker: z.string().min(1),
        minutes: z.number().int().positive(),
        narrative: z.array(z.string().min(1)).min(1),
        /** Guiding question shown under the chapter title. */
        question: z.string().min(1).nullable().default(null),
        /** One-sentence link from this chapter to the next. */
        bridge: z.string().min(1).nullable().default(null),
        sourceIds: z.array(id),
        /** Editorial review, present only when a question is worth asking. */
        review: chapterReviewSchema.nullable().default(null),
        gap: z.string().min(1).nullable(),
        /** `pending`: the chapter is kept in place but has no verified content yet. */
        coverage: z.enum(['complete', 'partial', 'pending']).default('complete'),
        layout: z.enum([
          'introduction',
          'documents',
          'concepts',
          'thinkers',
          'timeline',
          'graph',
          'debate',
          'sources',
        ]),
        blocks: z.array(pageBlockSchema),
      }),
    ),
  })
  .superRefine((page, ctx) => {
    if (new Set(page.chapters.map((c) => c.anchor)).size !== page.chapters.length)
      ctx.addIssue({ code: 'custom', message: 'Âncoras devem ser únicas.', path: ['chapters'] });
    if (page.published && !page.chapters.length)
      ctx.addIssue({
        code: 'custom',
        message: 'Página publicada precisa de capítulos.',
        path: ['chapters'],
      });
    const expected = canonicalChapters.map((c) => c.id).join(',');
    if (page.published && page.chapters.map((c) => c.id).join(',') !== expected)
      ctx.addIssue({
        code: 'custom',
        message: `Capítulos devem seguir o contrato canônico: ${expected}.`,
        path: ['chapters'],
      });
    page.chapters.forEach((chapter, index) => {
      if (page.published && chapter.anchor !== chapter.id)
        ctx.addIssue({
          code: 'custom',
          message: 'Âncora deve coincidir com o id do capítulo.',
          path: ['chapters', index, 'anchor'],
        });
      if (chapter.coverage !== 'complete' && !chapter.gap)
        ctx.addIssue({
          code: 'custom',
          message: 'Cobertura parcial ou pendente exige motivo editorial em `gap`.',
          path: ['chapters', index, 'gap'],
        });
      if (chapter.coverage === 'pending' && chapter.blocks.length)
        ctx.addIssue({
          code: 'custom',
          message: 'Capítulo pendente não pode ter blocos.',
          path: ['chapters', index, 'blocks'],
        });
    });
  });
export const ideologyGraphSchema = z.object({
  sources: z.array(sourceSchema),
  edges: z.array(ideologyEdgeSchema),
  positions: z.array(positionClaimSchema).default([]),
});
export type IdeologyPage = z.infer<typeof ideologyPageSchema>;
export type PageBlock = z.infer<typeof pageBlockSchema>;
export type ExplorationItem = z.infer<typeof explorationItemSchema>;
export type IdeologyEdge = z.infer<typeof ideologyEdgeSchema>;
export type IdeologyGraph = z.infer<typeof ideologyGraphSchema>;
export interface IdeologyDossier {
  page: IdeologyPage;
  supplement: IdeologyGraph;
}

export function validateIdeologyDossier(
  pageData: unknown,
  graphData: unknown,
  graph: KnowledgeGraph,
): IdeologyDossier {
  const page = ideologyPageSchema.parse(pageData);
  const supplement = ideologyGraphSchema.parse(graphData);
  const entities = new Set(graph.atlases.flatMap((a) => a.entities.map((e) => e.id)));
  const sources = new Set([
    ...graph.atlases.flatMap((a) => a.sources.map((s) => s.id)),
    ...supplement.sources.map((s) => s.id),
  ]);
  const edges = new Set(supplement.edges.map((e) => e.id));
  const requireIds = (ids: string[], known: Set<string>) => {
    if (ids.some((value) => !known.has(value)))
      throw new Error('Referência editorial inexistente.');
  };
  if (!graph.atlases.some((a) => a.id === page.atlasId)) throw new Error('Atlas inexistente.');
  if (page.portrait) {
    requireIds([page.portrait.entityId], entities);
    const asset = graph.atlases
      .find((a) => a.id === page.atlasId)
      ?.assetLicenses.find((a) => a.id === page.portrait!.assetId);
    if (asset?.reproduction !== 'allowed' || !asset.licenseUrl || !asset.creator)
      throw new Error('Retrato sem licença e autoria.');
  }
  const pageEntityIds = new Set<string>();
  const addEntityIds = (ids: readonly string[] | undefined) => {
    for (const value of ids ?? []) pageEntityIds.add(value);
  };
  if (page.portrait) pageEntityIds.add(page.portrait.entityId);
  for (const chapter of page.chapters)
    for (const block of chapter.blocks) {
      if ('entityIds' in block) addEntityIds(block.entityIds);
      if (block.type === 'atlas') addEntityIds([block.rootEntityId]);
      if (block.type === 'reading-path')
        addEntityIds(block.works.flatMap((work) => (work.entityId ? [work.entityId] : [])));
      if (block.type === 'chronology') addEntityIds(block.markerIds);
      const items =
        block.type === 'explorations'
          ? block.items
          : block.type === 'debate'
            ? block.topics.flatMap((topic) => [
                topic.defence,
                topic.criticism,
                topic.response,
                topic.limits,
              ])
            : [];
      for (const item of items) addEntityIds(item.entityIds);
    }
  const assets = new Map(
    graph.atlases.flatMap((atlas) =>
      atlas.assetLicenses.map((asset) => [asset.id, asset] as const),
    ),
  );
  const posterAssets = new Set<string>();
  for (const figure of page.poster.figures) {
    requireIds([figure.entityId], entities);
    if (!pageEntityIds.has(figure.entityId))
      throw new Error('Imagem de abertura sem vínculo com a leitura.');
    const asset = assets.get(figure.assetId);
    if (!asset || asset.entityId !== figure.entityId)
      throw new Error('Imagem de abertura não corresponde ao registro.');
    if (
      asset.status !== 'known' ||
      asset.reproduction !== 'allowed' ||
      !asset.license ||
      !asset.licenseUrl ||
      !asset.attribution ||
      !asset.filePageUrl
    )
      throw new Error('Imagem de abertura sem licença, crédito ou link verificável.');
    if (posterAssets.has(asset.assetPath)) throw new Error('Imagem de abertura repetida.');
    posterAssets.add(asset.assetPath);
  }
  for (const edge of supplement.edges) {
    requireIds([edge.from, edge.to], entities);
    requireIds(edge.sources, sources);
  }
  for (const claim of supplement.positions) {
    requireIds([claim.entityId], entities);
    requireIds(claim.sourceIds, sources);
  }
  const itemIds = new Set(
    page.chapters.flatMap((c) =>
      c.blocks.flatMap((b) => (b.type === 'explorations' ? b.items.map((i) => i.id) : [])),
    ),
  );
  const reviewQuestions = new Set<string>();
  for (const chapter of page.chapters) {
    requireIds(chapter.sourceIds, sources);
    if (chapter.review) {
      requireIds(chapter.review.sourceIds, sources);
      if (chapter.review.sourceIds.some((sourceId) => !chapter.sourceIds.includes(sourceId)))
        throw new Error('Revisão cita fonte fora dos capítulos.');
      const revisitIds = chapter.review.revisit.map((item) => item.entityId);
      requireIds(revisitIds, entities);
      if (new Set(revisitIds).size !== revisitIds.length)
        throw new Error('Revisão repete um registro revisitado.');
      const question = chapter.review.question.trim().toLocaleLowerCase('pt-BR');
      if (reviewQuestions.has(question)) throw new Error('Pergunta de revisão repetida.');
      reviewQuestions.add(question);
    }
    for (const block of chapter.blocks) {
      if ('entityIds' in block) requireIds(block.entityIds, entities);
      if ('edgeIds' in block) requireIds(block.edgeIds, edges);
      if ('sourceIds' in block) requireIds(block.sourceIds, sources);
      if (block.type === 'atlas') requireIds([block.rootEntityId], entities);
      if (block.type === 'reading-path')
        requireIds(
          block.works.flatMap((w) => (w.entityId ? [w.entityId] : [])),
          entities,
        );
      if (
        block.type === 'entities' &&
        Object.keys(block.notes).some((k) => !block.entityIds.includes(k))
      )
        throw new Error('Nota editorial para registro ausente do bloco.');
      if (block.type === 'chronology') {
        requireIds(block.markerIds, entities);
        requireIds(
          block.epochs.map((e) => e.itemId),
          itemIds,
        );
        if (block.epochs.some((e) => e.end < e.start))
          throw new Error('Época com datas invertidas.');
      }
      const items =
        block.type === 'explorations'
          ? block.items
          : block.type === 'debate'
            ? block.topics.flatMap((t) => [t.defence, t.criticism, t.response, t.limits])
            : [];
      for (const item of items) {
        requireIds(item.sourceIds, sources);
        requireIds(item.entityIds, entities);
      }
    }
  }
  return { page, supplement };
}
