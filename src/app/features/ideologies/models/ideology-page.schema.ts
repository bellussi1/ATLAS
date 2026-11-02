import { type KnowledgeGraph, sourceSchema } from '@core/content/models/content-schema';
import { z } from 'zod';

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
]);
export const ideologyPageSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    slug: id,
    kind: z.enum(['ideologia', 'corrente', 'tradicao', 'movimento', 'programa']),
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
      signature: z.string().min(1),
      keyVisualization: z.enum(['graph', 'timeline', 'comparison']),
    }),
    portrait: z.object({ entityId: id, assetId: id }).nullable().default(null),
    chapters: z.array(
      z.object({
        id,
        anchor: id,
        title: z.string().min(1),
        kicker: z.string().min(1),
        minutes: z.number().int().positive(),
        narrative: z.array(z.string().min(1)).min(1),
        sourceIds: z.array(id),
        gap: z.string().min(1).nullable(),
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
  });
export const ideologyGraphSchema = z.object({
  sources: z.array(sourceSchema),
  edges: z.array(ideologyEdgeSchema),
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
  for (const edge of supplement.edges) {
    requireIds([edge.from, edge.to], entities);
    requireIds(edge.sources, sources);
  }
  const itemIds = new Set(
    page.chapters.flatMap((c) =>
      c.blocks.flatMap((b) => (b.type === 'explorations' ? b.items.map((i) => i.id) : [])),
    ),
  );
  for (const chapter of page.chapters) {
    requireIds(chapter.sourceIds, sources);
    for (const block of chapter.blocks) {
      if ('entityIds' in block) requireIds(block.entityIds, entities);
      if ('edgeIds' in block) requireIds(block.edgeIds, edges);
      if ('sourceIds' in block) requireIds(block.sourceIds, sources);
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
