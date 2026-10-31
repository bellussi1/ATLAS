import { z } from 'zod';

const identifier = z.string().regex(/^[a-z][a-z0-9-]*$/, 'Use um identificador minúsculo com hífens.');
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use um slug minúsculo com hífens.');

const editorialSectionSchema = z.object({
  heading: z.string().trim().min(1),
  paragraphs: z.array(z.string().trim().min(1)).min(1),
});

const entityBaseSchema = z.object({
  id: identifier,
  slug,
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  sections: z.array(editorialSectionSchema).min(1),
});

export const personSchema = entityBaseSchema.extend({ kind: z.literal('person') });
export const conceptSchema = entityBaseSchema.extend({ kind: z.literal('concept') });
export const eventSchema = entityBaseSchema.extend({ kind: z.literal('event') });
export const articleSchema = entityBaseSchema.extend({ kind: z.literal('article') });

export const entitySchema = z.discriminatedUnion('kind', [
  personSchema,
  conceptSchema,
  eventSchema,
  articleSchema,
]);

export const sourceSchema = z.object({
  id: identifier,
  title: z.string().trim().min(1),
  reference: z.string().trim().min(1),
});

export const claimSchema = z.object({
  id: identifier,
  entityId: identifier,
  text: z.string().trim().min(1),
  sourceIds: z.array(identifier).min(1),
});

export const relationshipSchema = z.object({
  id: identifier,
  fromEntityId: identifier,
  toEntityId: identifier,
  label: z.string().trim().min(1),
});

export const learningPathSchema = z.object({
  id: identifier,
  slug,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  entityIds: z.array(identifier),
});

export const atlasSchema = z.object({
  id: identifier,
  slug,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  entityIds: z.array(identifier),
  entities: z.array(entitySchema).min(1),
  sources: z.array(sourceSchema),
  claims: z.array(claimSchema),
  relationships: z.array(relationshipSchema),
  learningPaths: z.array(learningPathSchema),
}).superRefine((atlas, context) => {
  const records = [
    { id: atlas.id, path: ['id'] },
    ...atlas.entities.map((record, index) => ({ id: record.id, path: ['entities', index, 'id'] })),
    ...atlas.sources.map((record, index) => ({ id: record.id, path: ['sources', index, 'id'] })),
    ...atlas.claims.map((record, index) => ({ id: record.id, path: ['claims', index, 'id'] })),
    ...atlas.relationships.map((record, index) => ({ id: record.id, path: ['relationships', index, 'id'] })),
    ...atlas.learningPaths.map((record, index) => ({ id: record.id, path: ['learningPaths', index, 'id'] })),
  ];
  const ids = new Set<string>();
  for (const record of records) {
    if (ids.has(record.id)) {
      context.addIssue({ code: 'custom', message: `ID duplicado: ${record.id}`, path: record.path });
    }
    ids.add(record.id);
  }

  const slugRecords = [atlas.slug, ...atlas.entities.map((entity) => entity.slug), ...atlas.learningPaths.map((path) => path.slug)];
  if (new Set(slugRecords).size !== slugRecords.length) {
    context.addIssue({ code: 'custom', message: 'Slugs devem ser únicos no atlas.', path: ['entities'] });
  }

  const entityIds = new Set(atlas.entities.map((entity) => entity.id));
  const sourceIds = new Set(atlas.sources.map((source) => source.id));
  const validateReferences = (values: string[], available: Set<string>, path: (string | number)[]) => {
    for (const value of values) {
      if (!available.has(value)) {
        context.addIssue({ code: 'custom', message: `Referência inexistente: ${value}`, path });
      }
    }
  };
  const validateUniqueReferences = (values: string[], path: (string | number)[]) => {
    if (new Set(values).size !== values.length) {
      context.addIssue({ code: 'custom', message: 'Referências não podem se repetir.', path });
    }
  };

  validateUniqueReferences(atlas.entityIds, ['entityIds']);
  validateReferences(atlas.entityIds, entityIds, ['entityIds']);
  atlas.claims.forEach((claim, index) => {
    validateUniqueReferences(claim.sourceIds, ['claims', index, 'sourceIds']);
    validateReferences([claim.entityId], entityIds, ['claims', index, 'entityId']);
    validateReferences(claim.sourceIds, sourceIds, ['claims', index, 'sourceIds']);
  });
  atlas.relationships.forEach((relationship, index) => {
    validateReferences([relationship.fromEntityId, relationship.toEntityId], entityIds, ['relationships', index]);
  });
  atlas.learningPaths.forEach((path, index) => {
    validateUniqueReferences(path.entityIds, ['learningPaths', index, 'entityIds']);
    validateReferences(path.entityIds, entityIds, ['learningPaths', index, 'entityIds']);
  });
});

export type Atlas = z.infer<typeof atlasSchema>;
export type Entity = z.infer<typeof entitySchema>;
export type Person = z.infer<typeof personSchema>;
export type Concept = z.infer<typeof conceptSchema>;
export type Event = z.infer<typeof eventSchema>;
export type Article = z.infer<typeof articleSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type Relationship = z.infer<typeof relationshipSchema>;
export type LearningPath = z.infer<typeof learningPathSchema>;
