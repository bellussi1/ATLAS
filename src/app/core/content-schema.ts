import { z } from 'zod';

const identifier = z.string().regex(/^[a-z][a-z0-9-]*$/, 'Use um identificador minúsculo com hífens.');
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use um slug minúsculo com hífens.');
const date = z.iso.date();
const uncertaintySchema = z.enum(['low', 'moderate', 'high', 'unknown']);

export const temporalExtentSchema = z.object({
  startYear: z.number().int().nullable(),
  endYear: z.number().int().nullable(),
  precision: z.enum(['year', 'approximate', 'range', 'unknown']),
  label: z.string().trim().min(1).nullable(),
}).superRefine((extent, context) => {
  if (extent.startYear !== null && extent.endYear !== null && extent.endYear < extent.startYear) {
    context.addIssue({ code: 'custom', message: 'O fim do período não pode anteceder o início.', path: ['endYear'] });
  }
  if (extent.precision === 'unknown' && (extent.startYear !== null || extent.endYear !== null)) {
    context.addIssue({ code: 'custom', message: 'Um período desconhecido não pode declarar anos.', path: ['precision'] });
  }
});

const editorialSectionSchema = z.object({
  heading: z.string().trim().min(1),
  paragraphs: z.array(z.string().trim().min(1)).min(1),
});

const entityBaseSchema = z.object({
  id: identifier,
  slug,
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  aliases: z.array(z.string().trim().min(1)),
  context: z.string().trim().min(1),
  temporalExtent: temporalExtentSchema.nullable(),
  uncertainty: uncertaintySchema,
  revision: z.number().int().positive(),
  sections: z.array(editorialSectionSchema).min(1),
});

export const personSchema = entityBaseSchema.extend({ kind: z.literal('person') });
export const ideologySchema = entityBaseSchema.extend({ kind: z.literal('ideology') });
export const conceptSchema = entityBaseSchema.extend({ kind: z.literal('concept') });
export const workSchema = entityBaseSchema.extend({ kind: z.literal('work') });
export const eventSchema = entityBaseSchema.extend({ kind: z.literal('event') });
export const historicalPolitySchema = entityBaseSchema.extend({ kind: z.literal('historical-polity') });
export const placeSchema = entityBaseSchema.extend({ kind: z.literal('place') });
export const partySchema = entityBaseSchema.extend({ kind: z.literal('party') });
export const institutionSchema = entityBaseSchema.extend({ kind: z.literal('institution') });
export const governmentSchema = entityBaseSchema.extend({ kind: z.literal('government') });
export const policySchema = entityBaseSchema.extend({ kind: z.literal('policy') });
export const articleSchema = entityBaseSchema.extend({ kind: z.literal('article') });

export const entitySchema = z.discriminatedUnion('kind', [
  personSchema, ideologySchema, conceptSchema, workSchema, eventSchema, historicalPolitySchema,
  placeSchema, partySchema, institutionSchema, governmentSchema, policySchema, articleSchema,
]);

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

export const relationSchema = z.object({
  id: identifier,
  fromEntityId: identifier,
  toEntityId: identifier,
  type: z.enum(['editorial-link', 'documented-association', 'influence', 'causal-claim']),
  label: z.string().trim().min(1),
  reverseLabel: z.string().trim().min(1),
  context: z.string().trim().min(1),
  temporalExtent: temporalExtentSchema.nullable(),
  uncertainty: uncertaintySchema,
  evidenceIds: z.array(identifier),
}).superRefine((relation, context) => {
  if (relation.fromEntityId === relation.toEntityId) {
    context.addIssue({ code: 'custom', message: 'Uma relação não pode ligar a entidade a si mesma.', path: ['toEntityId'] });
  }
  if (relation.type !== 'editorial-link' && relation.evidenceIds.length === 0) {
    context.addIssue({ code: 'custom', message: 'Relações históricas exigem evidência identificada.', path: ['evidenceIds'] });
  }
  if (new Set(relation.evidenceIds).size !== relation.evidenceIds.length) {
    context.addIssue({ code: 'custom', message: 'Evidências da relação não podem se repetir.', path: ['evidenceIds'] });
  }
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
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Use versão semântica major.minor.patch.'),
  updatedAt: date,
  entityIds: z.array(identifier),
  entities: z.array(entitySchema).min(1),
  sources: z.array(sourceSchema),
  evidences: z.array(evidenceSchema),
  citations: z.array(citationSchema),
  claims: z.array(claimSchema),
  reviews: z.array(reviewSchema),
  assetLicenses: z.array(assetLicenseSchema),
  relations: z.array(relationSchema),
  learningPaths: z.array(learningPathSchema),
}).superRefine((atlas, context) => {
  const collections = [
    ['entities', atlas.entities], ['sources', atlas.sources], ['evidences', atlas.evidences], ['citations', atlas.citations],
    ['claims', atlas.claims], ['reviews', atlas.reviews], ['assetLicenses', atlas.assetLicenses],
    ['relations', atlas.relations], ['learningPaths', atlas.learningPaths],
  ] as const;
  const ids = new Set<string>([atlas.id]);
  collections.forEach(([key, records]) => records.forEach((record, index) => {
    if (ids.has(record.id)) context.addIssue({ code: 'custom', message: `ID duplicado: ${record.id}`, path: [key, index, 'id'] });
    ids.add(record.id);
  }));
  const slugs = [atlas.slug, ...atlas.entities.map((entity) => entity.slug), ...atlas.learningPaths.map((path) => path.slug)];
  if (new Set(slugs).size !== slugs.length) context.addIssue({ code: 'custom', message: 'Slugs devem ser únicos no atlas.', path: ['entities'] });
  const assetPaths = atlas.assetLicenses.map((asset) => asset.assetPath);
  if (new Set(assetPaths).size !== assetPaths.length) context.addIssue({ code: 'custom', message: 'Cada caminho de ativo deve ter um único registro de licença.', path: ['assetLicenses'] });
  const entityIds = new Set(atlas.entities.map((entity) => entity.id));
  const sourceIds = new Set(atlas.sources.map((source) => source.id));
  const evidenceIds = new Set(atlas.evidences.map((evidence) => evidence.id));
  const citationIds = new Set(atlas.citations.map((citation) => citation.id));
  const claimIds = new Set(atlas.claims.map((claim) => claim.id));
  const validateRefs = (values: string[], available: Set<string>, path: (string | number)[]) => values.forEach((value) => {
    if (!available.has(value)) context.addIssue({ code: 'custom', message: `Referência inexistente: ${value}`, path });
  });
  const unique = (values: string[], path: (string | number)[]) => {
    if (new Set(values).size !== values.length) context.addIssue({ code: 'custom', message: 'Referências não podem se repetir.', path });
  };
  unique(atlas.entityIds, ['entityIds']);
  validateRefs(atlas.entityIds, entityIds, ['entityIds']);
  atlas.evidences.forEach((item, index) => validateRefs([item.sourceId], sourceIds, ['evidences', index, 'sourceId']));
  atlas.citations.forEach((item, index) => validateRefs([item.evidenceId], evidenceIds, ['citations', index, 'evidenceId']));
  atlas.claims.forEach((claim, index) => {
    unique(claim.citationIds, ['claims', index, 'citationIds']);
    validateRefs([claim.entityId], entityIds, ['claims', index, 'entityId']);
    validateRefs(claim.citationIds, citationIds, ['claims', index, 'citationIds']);
    const matchingReviews = atlas.reviews.filter((review) => review.claimId === claim.id);
    if (matchingReviews.length !== 1) context.addIssue({ code: 'custom', message: 'Cada afirmação deve ter exatamente um registro de revisão.', path: ['claims', index] });
    else if (matchingReviews[0].status !== claim.editorialStatus) context.addIssue({ code: 'custom', message: 'Estado da afirmação deve corresponder ao estado da revisão.', path: ['claims', index, 'editorialStatus'] });
  });
  atlas.reviews.forEach((review, index) => validateRefs([review.claimId], claimIds, ['reviews', index, 'claimId']));
  atlas.learningPaths.forEach((path, index) => {
    unique(path.entityIds, ['learningPaths', index, 'entityIds']);
    validateRefs(path.entityIds, entityIds, ['learningPaths', index, 'entityIds']);
  });
});

export const knowledgeGraphSchema = z.object({
  id: identifier,
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Use versão semântica major.minor.patch.'),
  updatedAt: date,
  atlases: z.array(atlasSchema).min(1),
}).superRefine((graph, context) => {
  const records = graph.atlases.flatMap((atlas) => [
    { id: atlas.id, path: ['atlases'] as (string | number)[] },
    ...atlas.entities.map((item) => ({ id: item.id, path: ['atlases', atlas.id, 'entities'] as (string | number)[] })),
    ...atlas.sources.map((item) => ({ id: item.id, path: ['atlases', atlas.id, 'sources'] as (string | number)[] })),
    ...atlas.evidences.map((item) => ({ id: item.id, path: ['atlases', atlas.id, 'evidences'] as (string | number)[] })),
    ...atlas.citations.map((item) => ({ id: item.id, path: ['atlases', atlas.id, 'citations'] as (string | number)[] })),
    ...atlas.claims.map((item) => ({ id: item.id, path: ['atlases', atlas.id, 'claims'] as (string | number)[] })),
    ...atlas.reviews.map((item) => ({ id: item.id, path: ['atlases', atlas.id, 'reviews'] as (string | number)[] })),
    ...atlas.assetLicenses.map((item) => ({ id: item.id, path: ['atlases', atlas.id, 'assetLicenses'] as (string | number)[] })),
    ...atlas.relations.map((item) => ({ id: item.id, path: ['atlases', atlas.id, 'relations'] as (string | number)[] })),
    ...atlas.learningPaths.map((item) => ({ id: item.id, path: ['atlases', atlas.id, 'learningPaths'] as (string | number)[] })),
  ]);
  const ids = new Set<string>([graph.id]);
  records.forEach((record) => {
    if (ids.has(record.id)) context.addIssue({ code: 'custom', message: `ID duplicado no grafo: ${record.id}`, path: record.path });
    ids.add(record.id);
  });
  const all = <T extends { id: string }>(select: (atlas: Atlas) => T[]) => graph.atlases.flatMap(select);
  const entityIds = new Set(all((atlas) => atlas.entities).map((item) => item.id));
  const sourceIds = new Set(all((atlas) => atlas.sources).map((item) => item.id));
  const evidenceIds = new Set(all((atlas) => atlas.evidences).map((item) => item.id));
  const citationIds = new Set(all((atlas) => atlas.citations).map((item) => item.id));
  const claimIds = new Set(all((atlas) => atlas.claims).map((item) => item.id));
  const assetPaths = all((atlas) => atlas.assetLicenses).map((item) => item.assetPath);
  if (new Set(assetPaths).size !== assetPaths.length) context.addIssue({ code: 'custom', message: 'Caminhos de ativos devem ser únicos no grafo.', path: ['atlases'] });
  const slugs = graph.atlases.flatMap((atlas) => [atlas.slug, ...atlas.entities.map((entity) => entity.slug)]);
  if (new Set(slugs).size !== slugs.length) context.addIssue({ code: 'custom', message: 'Slugs devem ser únicos no grafo para manter rotas não ambíguas.', path: ['atlases'] });
  graph.atlases.forEach((atlas, atlasIndex) => {
    atlas.evidences.forEach((item, index) => {
      if (!sourceIds.has(item.sourceId)) context.addIssue({ code: 'custom', message: `Fonte inexistente: ${item.sourceId}`, path: ['atlases', atlasIndex, 'evidences', index, 'sourceId'] });
    });
    atlas.citations.forEach((item, index) => {
      if (!evidenceIds.has(item.evidenceId)) context.addIssue({ code: 'custom', message: `Evidência inexistente: ${item.evidenceId}`, path: ['atlases', atlasIndex, 'citations', index, 'evidenceId'] });
    });
    atlas.claims.forEach((item, index) => {
      if (!entityIds.has(item.entityId)) context.addIssue({ code: 'custom', message: `Entidade inexistente: ${item.entityId}`, path: ['atlases', atlasIndex, 'claims', index, 'entityId'] });
      item.citationIds.forEach((id) => { if (!citationIds.has(id)) context.addIssue({ code: 'custom', message: `Citação inexistente: ${id}`, path: ['atlases', atlasIndex, 'claims', index, 'citationIds'] }); });
    });
    atlas.reviews.forEach((item, index) => {
      if (!claimIds.has(item.claimId)) context.addIssue({ code: 'custom', message: `Afirmação inexistente: ${item.claimId}`, path: ['atlases', atlasIndex, 'reviews', index, 'claimId'] });
    });
    atlas.relations.forEach((item, index) => {
      if (!entityIds.has(item.fromEntityId) || !entityIds.has(item.toEntityId)) context.addIssue({ code: 'custom', message: 'Entidade de relação inexistente no grafo.', path: ['atlases', atlasIndex, 'relations', index] });
      item.evidenceIds.forEach((id) => { if (!evidenceIds.has(id)) context.addIssue({ code: 'custom', message: `Evidência inexistente: ${id}`, path: ['atlases', atlasIndex, 'relations', index, 'evidenceIds'] }); });
    });
  });
});

export type Atlas = z.infer<typeof atlasSchema>;
export type KnowledgeGraph = z.infer<typeof knowledgeGraphSchema>;
export type Entity = z.infer<typeof entitySchema>;
export type EntityKind = Entity['kind'];
export type Person = z.infer<typeof personSchema>;
export type Ideology = z.infer<typeof ideologySchema>;
export type Concept = z.infer<typeof conceptSchema>;
export type Work = z.infer<typeof workSchema>;
export type Event = z.infer<typeof eventSchema>;
export type HistoricalPolity = z.infer<typeof historicalPolitySchema>;
export type Place = z.infer<typeof placeSchema>;
export type Party = z.infer<typeof partySchema>;
export type Institution = z.infer<typeof institutionSchema>;
export type Government = z.infer<typeof governmentSchema>;
export type Policy = z.infer<typeof policySchema>;
export type Article = z.infer<typeof articleSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type Citation = z.infer<typeof citationSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type AssetLicense = z.infer<typeof assetLicenseSchema>;
export type Relation = z.infer<typeof relationSchema>;
export type Relationship = Relation;
export type LearningPath = z.infer<typeof learningPathSchema>;
