import * as z from 'zod';

import { type KnowledgeGraph, relationSchema, temporalExtentSchema } from './content-schema';
import { contentTranslationSchema } from './content-translation';
import { explorationLayoutSchema } from './exploration-layout';

const resourceSchema = z.object({
  file: z.string().regex(/^[a-z0-9-]+\.[a-f0-9]{64}\.json$/),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  bytes: z.number().int().nonnegative(),
});
export const contentManifestSchema = z.object({
  schemaVersion: z.literal(1),
  release: z.string().regex(/^[a-f0-9]{64}$/),
  graph: z.object({ id: z.string(), version: z.string(), updatedAt: z.iso.date() }),
  collections: z.array(resourceSchema.extend({ id: z.string() })).min(1),
  ideologies: z.array(resourceSchema.extend({ id: z.string() })),
  search: resourceSchema,
  adjacency: resourceSchema,
  layouts: resourceSchema,
});
/** A published reading: its page and the sourced relations it cites, released as one object. */
export const ideologyBundleSchema = z.object({ page: z.unknown(), supplement: z.unknown() });
export type IdeologyBundle = z.infer<typeof ideologyBundleSchema>;
export const searchIndexSchema = z.array(
  z.object({
    sourceLocale: z.string().optional(),
    translations: z.array(contentTranslationSchema).optional(),
    id: z.string(),
    title: z.string(),
    summary: z.string(),
    aliases: z.array(z.string()),
    kind: z.string(),
    kindLabel: z.string(),
    state: z.string(),
    stateLabel: z.string(),
    path: z.string(),
    fragment: z.string().optional(),
    context: z.string(),
    searchText: z.string(),
    backlinks: z.array(
      z.object({
        id: z.string(),
        path: z.string(),
        title: z.string(),
        label: z.string(),
        context: z.string(),
        relationType: z.string(),
      }),
    ),
  }),
);
export const adjacencySchema = z.record(
  z.string(),
  z.array(
    z.object({
      atlasId: z.string(),
      relationId: z.string(),
      relationType: relationSchema.shape.type,
      direction: z.enum(['outgoing', 'incoming']),
      relatedEntityId: z.string(),
      label: z.string(),
      context: z.string(),
      uncertainty: relationSchema.shape.uncertainty,
      temporalExtent: temporalExtentSchema.nullable(),
      evidenceIds: z.array(z.string()),
    }),
  ),
);
const point = z.object({ x: z.number().finite(), y: z.number().finite() });
const graphLayout = z.object({
  nodes: z.array(point.extend({ id: z.string() })),
  height: z.number().positive(),
  paths: z.array(z.string()),
});
const timelineLayout = z
  .object({
    ticks: z.array(z.object({ year: z.number(), x: z.number() })),
    markers: z.array(z.object({ id: z.string(), year: z.number(), x: z.number() })),
  })
  .nullable();
export const layoutsSchema = z.object({
  network: z
    .object({
      width: z.number().positive(),
      height: z.number().positive(),
      positions: z.record(z.string(), point),
      regions: z.array(
        z.object({
          id: z.string(),
          x: z.number(),
          y: z.number(),
          radius: z.number().nonnegative(),
          count: z.number().int().nonnegative(),
        }),
      ),
    })
    .optional(),
  exploration: explorationLayoutSchema,
  atlases: z.object({
    center: point,
    order: z.record(z.string(), z.number().int().nonnegative()),
    slots: z.array(point),
  }),
  editorial: z.record(
    z.string(),
    z.object({
      graphs: z.record(z.string(), graphLayout),
      timelines: z.record(z.string(), timelineLayout),
    }),
  ),
});
export type ContentManifest = z.infer<typeof contentManifestSchema>;
export type ContentLayouts = z.infer<typeof layoutsSchema>;
export type ContentAdjacency = z.infer<typeof adjacencySchema>;
export interface ContentPackage {
  graph: KnowledgeGraph;
  search: z.infer<typeof searchIndexSchema>;
  adjacency: ContentAdjacency;
  layouts: ContentLayouts;
}
