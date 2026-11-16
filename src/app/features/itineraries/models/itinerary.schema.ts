import type { KnowledgeGraph } from '@core/content/models/content-schema';
import { explorerCatalogues } from '@core/content/queries/explorer-catalogues';
import * as z from 'zod';

// The public CSP forbids eval and Zod's JIT compiles validators with `new Function`.
z.config({ jitless: true });

export const itineraryKinds = ['historico', 'comparativo', 'conceitual', 'institucional'] as const;
export type ItineraryKind = (typeof itineraryKinds)[number];

export const itineraryKindLabels: Record<ItineraryKind, string> = {
  historico: 'Itinerário histórico',
  comparativo: 'Itinerário comparativo',
  conceitual: 'Itinerário conceitual',
  institucional: 'Itinerário institucional',
};

export const itineraryStatusSchema = z.enum(['draft', 'pending', 'reviewed-ai', 'verified']);
export const itineraryCoverageSchema = z.enum(['complete', 'partial', 'pending']);

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const id = z.string().regex(/^[a-z][a-z0-9-]*$/);
const nonEmpty = z.string().trim().min(1);

export const itineraryDestinationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('leitura'), slug, anchor: nonEmpty.optional() }),
  z.object({ type: z.literal('verbete'), slug, anchor: nonEmpty.optional() }),
  z.object({ type: z.literal('grafo'), nodeId: id.optional() }),
  z.object({ type: z.literal('catalogo'), path: nonEmpty, query: nonEmpty.optional() }),
  z.object({ type: z.literal('roteiro'), slug }),
]);

export type ItineraryDestination = z.infer<typeof itineraryDestinationSchema>;

export const itineraryStopSchema = z.object({
  id,
  title: nonEmpty,
  reason: nonEmpty,
  question: nonEmpty,
  destination: itineraryDestinationSchema,
  justification: nonEmpty.optional(),
  contextEntityId: id.optional(),
  sourceIds: z.array(id).optional(),
  coverage: itineraryCoverageSchema.optional(),
  gap: nonEmpty.optional(),
});

export const itineraryBranchSchema = z
  .object({
    id,
    fromStop: id,
    title: nonEmpty,
    reason: nonEmpty,
    question: nonEmpty,
    destination: itineraryDestinationSchema,
    justification: nonEmpty.optional(),
    convergesAt: id.optional(),
    exit: nonEmpty.optional(),
  })
  .refine((branch) => Boolean(branch.convergesAt || branch.exit), {
    message: 'Ramo precisa declarar convergência (`convergesAt`) ou saída explícita (`exit`).',
  });

export const itineraryReviewSchema = z.object({
  status: z.enum(['assistant', 'human']),
  reviewer: nonEmpty.optional(),
  reviewedAt: z.iso.date().optional(),
  notes: nonEmpty.optional(),
});

export const itinerarySchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().regex(/^itinerary-[a-z0-9]+(?:-[a-z0-9]+)*$/),
    slug,
    kind: z.enum(itineraryKinds),
    title: nonEmpty,
    question: nonEmpty,
    deck: nonEmpty,
    summary: nonEmpty,
    status: itineraryStatusSchema,
    coverage: itineraryCoverageSchema,
    coverageNote: nonEmpty.optional(),
    review: itineraryReviewSchema,
    stops: z.array(itineraryStopSchema).min(4, 'Um itinerário exige ao menos 4 paradas centrais.'),
    branches: z.array(itineraryBranchSchema),
    connections: z
      .array(z.object({ destination: itineraryDestinationSchema, reason: nonEmpty }))
      .max(3),
    sources: z.array(z.object({ id, title: nonEmpty, url: z.url().optional() })),
    updatedAt: z.iso.date(),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
  })
  .superRefine((itinerary, ctx) => {
    const stopIndex = new Map<string, number>();
    itinerary.stops.forEach((stop, index) => {
      if (stopIndex.has(stop.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['stops', index, 'id'],
          message: `Parada duplicada: ${stop.id}.`,
        });
      }
      stopIndex.set(stop.id, index);
    });

    const branchIds = new Set<string>();
    for (const [index, branch] of itinerary.branches.entries()) {
      if (branchIds.has(branch.id) || stopIndex.has(branch.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['branches', index, 'id'],
          message: `Identificador de ramo duplicado: ${branch.id}.`,
        });
      }
      branchIds.add(branch.id);
      const from = stopIndex.get(branch.fromStop);
      if (from === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['branches', index, 'fromStop'],
          message: `Parada de origem desconhecida no ramo: ${branch.fromStop}.`,
        });
        continue;
      }
      if (branch.convergesAt) {
        const target = stopIndex.get(branch.convergesAt);
        if (target === undefined) {
          ctx.addIssue({
            code: 'custom',
            path: ['branches', index, 'convergesAt'],
            message: `Convergência desconhecida: ${branch.convergesAt}.`,
          });
        } else if (target <= from) {
          ctx.addIssue({
            code: 'custom',
            path: ['branches', index, 'convergesAt'],
            message: `Ramo ${branch.id} não pode convergir para a própria parada ou anterior (evita ciclo).`,
          });
        }
      }
    }

    const seenDestinations = new Set<string>();
    const destinationTypes = new Set<string>();
    const checkDestination = (
      destination: ItineraryDestination,
      justification: string | undefined,
      path: (string | number)[],
    ) => {
      destinationTypes.add(destination.type);
      const key = destinationKey(destination);
      if (seenDestinations.has(key) && !justification) {
        ctx.addIssue({
          code: 'custom',
          path,
          message: `Destino repetido (${key}) exige justificativa editorial.`,
        });
      }
      seenDestinations.add(key);
    };

    itinerary.stops.forEach((stop, index) => {
      checkDestination(stop.destination, stop.justification, ['stops', index, 'destination']);
    });
    itinerary.branches.forEach((branch, index) => {
      checkDestination(branch.destination, branch.justification, [
        'branches',
        index,
        'destination',
      ]);
    });

    if (destinationTypes.size < 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['stops'],
        message: 'O itinerário precisa combinar ao menos dois tipos de conteúdo.',
      });
    }

    if (itinerary.coverage !== 'complete' && !itinerary.coverageNote) {
      ctx.addIssue({
        code: 'custom',
        path: ['coverageNote'],
        message: 'Cobertura parcial ou pendente exige `coverageNote`.',
      });
    }

    if (
      itinerary.status === 'verified' &&
      (itinerary.review.status !== 'human' ||
        !itinerary.review.reviewer ||
        !itinerary.review.reviewedAt)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['review'],
        message: 'Estado `verified` exige revisão humana com revisor e data.',
      });
    }
    if (
      itinerary.status === 'reviewed-ai' &&
      (itinerary.review.status !== 'assistant' ||
        !itinerary.review.notes?.includes('[conferência de IA]'))
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['review'],
        message:
          'Estado `reviewed-ai` exige `review.status: "assistant"` e marcador `[conferência de IA]`.',
      });
    }
  });

export type Itinerary = z.infer<typeof itinerarySchema>;

export function destinationKey(destination: ItineraryDestination): string {
  switch (destination.type) {
    case 'leitura':
    case 'verbete':
      return `${destination.type}:${destination.slug}${destination.anchor ? `#${destination.anchor}` : ''}`;
    case 'grafo':
      return `grafo:${destination.nodeId ?? '*'}`;
    case 'catalogo':
      return `catalogo:${destination.path}${destination.query ? `?${destination.query}` : ''}`;
    case 'roteiro':
      return `roteiro:${destination.slug}`;
  }
}

export interface ItineraryValidationContext {
  graph: Pick<KnowledgeGraph, 'atlases'>;
  /** Published reading slugs mapped to whether they are listed (`true`) or unlisted drafts (`false`). */
  readings: ReadonlyMap<string, { listed: boolean; pendingChapters?: readonly string[] }>;
  cataloguePaths?: ReadonlySet<string>;
}

const defaultCatalogues = new Set(explorerCatalogues.map((c) => c.path));

/**
 * Validates an itinerary both structurally and against the current graph and published readings.
 * Rejects missing destinations, draft/unlisted targets in a `verified` itinerary, and missing contexts.
 */
export function validateItinerary(
  raw: unknown,
  context: ItineraryValidationContext,
): { ok: true; value: Itinerary } | { ok: false; errors: string[] } {
  const parsed = itinerarySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`,
      ),
    };
  }
  const itinerary = parsed.data;
  const errors: string[] = [];
  const entities = context.graph.atlases.flatMap((atlas) => atlas.entities);
  const bySlug = new Map(entities.map((entity) => [entity.slug, entity]));
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  const catalogues = context.cataloguePaths ?? defaultCatalogues;
  const isPublic = itinerary.status === 'verified' || itinerary.status === 'reviewed-ai';

  const checkDest = (dest: ItineraryDestination, label: string) => {
    if (dest.type === 'leitura' || dest.type === 'roteiro') {
      const reading = context.readings.get(dest.slug);
      if (!reading) errors.push(`${label}: leitura inexistente (${dest.slug}).`);
      else if (isPublic && !reading.listed)
        errors.push(
          `${label}: leitura em rascunho/não listada (${dest.slug}) em itinerário público.`,
        );
    } else if (dest.type === 'verbete') {
      const entity = bySlug.get(dest.slug);
      if (!entity) errors.push(`${label}: verbete inexistente (${dest.slug}).`);
      else if (isPublic && entity.editorialStatus === 'draft')
        errors.push(`${label}: verbete em rascunho (${dest.slug}) em itinerário público.`);
    } else if (dest.type === 'grafo') {
      if (dest.nodeId && !byId.has(dest.nodeId))
        errors.push(`${label}: nó do grafo inexistente (${dest.nodeId}).`);
    } else if (dest.type === 'catalogo') {
      const normalized = dest.path.replace(/^\/?acervo\/?/, '') || 'acervo';
      if (!catalogues.has(normalized))
        errors.push(`${label}: catálogo inexistente (${dest.path}).`);
    }
  };

  itinerary.stops.forEach((stop) => {
    checkDest(stop.destination, `parada ${stop.id}`);
    if (stop.contextEntityId && !byId.has(stop.contextEntityId)) {
      errors.push(`parada ${stop.id}: entidade de contexto inexistente (${stop.contextEntityId}).`);
    }
  });
  itinerary.branches.forEach((branch) => {
    checkDest(branch.destination, `ramo ${branch.id}`);
  });
  itinerary.connections.forEach((conn, index) => {
    checkDest(conn.destination, `conexão ${index}`);
  });

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: itinerary };
}
