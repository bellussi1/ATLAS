import { z } from 'zod';

export const explorationTimelineSchema = z.object({
  ticks: z.array(z.object({ year: z.number().int(), x: z.number().finite() })),
  markers: z.record(
    z.string(),
    z.object({
      x: z.number().finite(),
      width: z.number().nonnegative().finite(),
      partial: z.boolean(),
    }),
  ),
});
export const explorationLayoutSchema = z.object({
  networks: z.record(
    z.string(),
    z.object({
      height: z.number().positive(),
      nodes: z.record(z.string(), z.object({ x: z.number().finite(), y: z.number().finite() })),
      edges: z.record(z.string(), z.string()),
    }),
  ),
  timeline: explorationTimelineSchema,
});
export type ExplorationTimeline = z.infer<typeof explorationTimelineSchema>;
