import { z } from 'zod';

const identifier = z.string().regex(/^[a-z][a-z0-9-]*$/, 'Use um identificador minúsculo com hífens.');
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use um slug minúsculo com hífens.');
const date = z.iso.date();

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

export const entitySchema = z.discriminatedUnion('kind', [personSchema, conceptSchema, eventSchema, articleSchema]);

export const sourceSchema = z.object({
  id: identifier,
  title: z.string().trim().min(1),
  url: z.url({ protocol: /^https?$/ }).nullable(),
  edition: z.string().trim().min(1),
  publicationDate: date.nullable(),
});

export const evidenceSchema = z.object({
  id: identifier,
  sourceId: identifier,
  locator: z.string().trim().min(1),
  accessedAt: date,
  note: z.string().trim().min(1).nullable(),
});

export const citationSchema = z.object({
  id: identifier,
  evidenceId: identifier,
  relation: z.enum(['supports', 'contests', 'contextualizes']),
});

export const claimClassificationSchema = z.enum([
  'documented-fact', 'attributed-thesis', 'interpretation', 'hypothesis', 'inference', 'contested-claim', 'unverified',
]);
export const editorialStatusSchema = z.enum(['draft', 'pending', 'verified', 'contested', 'needs-update']);

export const claimSchema = z.object({
  id: identifier,
  entityId: identifier,
  text: z.string().trim().min(1),
  classification: claimClassificationSchema,
  editorialStatus: editorialStatusSchema,
  citationIds: z.array(identifier).min(1, 'Toda afirmação precisa de evidência citada.'),
});

export const reviewSchema = z.object({
  id: identifier,
  claimId: identifier,
  status: editorialStatusSchema,
  reviewer: z.string().trim().min(1).nullable(),
  reviewedAt: date.nullable(),
  note: z.string().trim().min(1).nullable(),
}).superRefine((review, context) => {
  if (review.status !== 'draft' && review.status !== 'pending' && (!review.reviewer || !review.reviewedAt)) {
    context.addIssue({ code: 'custom', message: 'Revisão concluída exige identificação humana e data.', path: ['reviewer'] });
  }
  if ((review.reviewer === null) !== (review.reviewedAt === null)) {
    context.addIssue({ code: 'custom', message: 'Identificação e data da revisão devem aparecer juntas.', path: ['reviewedAt'] });
  }
});

export const assetLicenseSchema = z.object({
  id: identifier,
  assetPath: z.string().trim().min(1),
  creator: z.string().trim().min(1).nullable(),
  license: z.string().trim().min(1).nullable(),
  licenseUrl: z.url({ protocol: /^https?$/ }).nullable(),
  status: z.enum(['known', 'unknown']),
  reproduction: z.enum(['allowed', 'blocked']),
}).superRefine((asset, context) => {
  if (asset.status === 'unknown' && asset.reproduction !== 'blocked') {
    context.addIssue({ code: 'custom', message: 'Ativo com licença desconhecida deve bloquear reprodução.', path: ['reproduction'] });
  }
  if (asset.status === 'known' && (!asset.license || !asset.licenseUrl)) {
    context.addIssue({ code: 'custom', message: 'Licença conhecida exige nome e URL da licença.', path: ['license'] });
  }
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
  evidences: z.array(evidenceSchema),
  citations: z.array(citationSchema),
  claims: z.array(claimSchema),
  reviews: z.array(reviewSchema),
  assetLicenses: z.array(assetLicenseSchema),
  relationships: z.array(relationshipSchema),
  learningPaths: z.array(learningPathSchema),
}).superRefine((atlas, context) => {
  const collections = [
    ['entities', atlas.entities], ['sources', atlas.sources], ['evidences', atlas.evidences], ['citations', atlas.citations],
    ['claims', atlas.claims], ['reviews', atlas.reviews], ['assetLicenses', atlas.assetLicenses],
    ['relationships', atlas.relationships], ['learningPaths', atlas.learningPaths],
  ] as const;
  const ids = new Set<string>([atlas.id]);
  collections.forEach(([key, records]) => records.forEach((record, index) => {
    if (ids.has(record.id)) context.addIssue({ code: 'custom', message: `ID duplicado: ${record.id}`, path: [key, index, 'id'] });
    ids.add(record.id);
  }));

  const slugRecords = [atlas.slug, ...atlas.entities.map((entity) => entity.slug), ...atlas.learningPaths.map((path) => path.slug)];
  if (new Set(slugRecords).size !== slugRecords.length) context.addIssue({ code: 'custom', message: 'Slugs devem ser únicos no atlas.', path: ['entities'] });
  const assetPaths = atlas.assetLicenses.map((asset) => asset.assetPath);
  if (new Set(assetPaths).size !== assetPaths.length) context.addIssue({ code: 'custom', message: 'Cada caminho de ativo deve ter um único registro de licença.', path: ['assetLicenses'] });

  const entityIds = new Set(atlas.entities.map((record) => record.id));
  const sourceIds = new Set(atlas.sources.map((record) => record.id));
  const evidenceIds = new Set(atlas.evidences.map((record) => record.id));
  const citationIds = new Set(atlas.citations.map((record) => record.id));
  const claimIds = new Set(atlas.claims.map((record) => record.id));
  const validateRefs = (values: string[], available: Set<string>, path: (string | number)[]) => values.forEach((value) => {
    if (!available.has(value)) context.addIssue({ code: 'custom', message: `Referência inexistente: ${value}`, path });
  });
  const unique = (values: string[], path: (string | number)[]) => {
    if (new Set(values).size !== values.length) context.addIssue({ code: 'custom', message: 'Referências não podem se repetir.', path });
  };

  unique(atlas.entityIds, ['entityIds']);
  validateRefs(atlas.entityIds, entityIds, ['entityIds']);
  atlas.evidences.forEach((evidence, index) => validateRefs([evidence.sourceId], sourceIds, ['evidences', index, 'sourceId']));
  atlas.citations.forEach((citation, index) => validateRefs([citation.evidenceId], evidenceIds, ['citations', index, 'evidenceId']));
  atlas.claims.forEach((claim, index) => {
    unique(claim.citationIds, ['claims', index, 'citationIds']);
    validateRefs([claim.entityId], entityIds, ['claims', index, 'entityId']);
    validateRefs(claim.citationIds, citationIds, ['claims', index, 'citationIds']);
    const claimReviews = atlas.reviews.filter((review) => review.claimId === claim.id);
    if (claimReviews.length !== 1) context.addIssue({ code: 'custom', message: 'Cada afirmação deve ter exatamente um registro de revisão.', path: ['claims', index] });
    else if (claimReviews[0].status !== claim.editorialStatus) context.addIssue({ code: 'custom', message: 'Estado da afirmação deve corresponder ao estado da revisão.', path: ['claims', index, 'editorialStatus'] });
  });
  atlas.reviews.forEach((review, index) => validateRefs([review.claimId], claimIds, ['reviews', index, 'claimId']));
  atlas.relationships.forEach((relationship, index) => validateRefs([relationship.fromEntityId, relationship.toEntityId], entityIds, ['relationships', index]));
  atlas.learningPaths.forEach((path, index) => {
    unique(path.entityIds, ['learningPaths', index, 'entityIds']);
    validateRefs(path.entityIds, entityIds, ['learningPaths', index, 'entityIds']);
  });
});

export type Atlas = z.infer<typeof atlasSchema>;
export type Entity = z.infer<typeof entitySchema>;
export type Person = z.infer<typeof personSchema>;
export type Concept = z.infer<typeof conceptSchema>;
export type Event = z.infer<typeof eventSchema>;
export type Article = z.infer<typeof articleSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type Citation = z.infer<typeof citationSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type AssetLicense = z.infer<typeof assetLicenseSchema>;
export type Relationship = z.infer<typeof relationshipSchema>;
export type LearningPath = z.infer<typeof learningPathSchema>;
