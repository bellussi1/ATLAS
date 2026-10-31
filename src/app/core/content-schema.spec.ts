import { assetLicenseSchema, atlasSchema, articleSchema, eventSchema, learningPathSchema, personSchema } from './content-schema';

const validAtlas = {
  id: 'atlas-methodology',
  slug: 'methodology-atlas',
  title: 'Metodologia do ATLAS',
  description: 'Como o projeto estrutura seu conteúdo.',
  entityIds: ['concept-methodology'],
  entities: [
    {
      id: 'concept-methodology',
      slug: 'metodologia-do-atlas',
      kind: 'concept',
      title: 'Metodologia do ATLAS',
      summary: 'Critérios editoriais do projeto.',
      sections: [{ heading: 'Contexto', paragraphs: ['Conteúdo de método.'] }],
    },
  ],
  sources: [{ id: 'source-guidelines', title: 'Regras editoriais', url: null, edition: 'AGENTS.md — seção Design e conteúdo', publicationDate: null }],
  evidences: [{ id: 'evidence-guidelines', sourceId: 'source-guidelines', locator: 'seção Conteúdo', accessedAt: '2026-10-31', note: null }],
  citations: [{ id: 'citation-guidelines', evidenceId: 'evidence-guidelines', relation: 'supports' }],
  claims: [
    {
      id: 'claim-context',
      entityId: 'concept-methodology',
      text: 'Afirmações históricas recebem contexto.',
      classification: 'documented-fact',
      editorialStatus: 'pending',
      citationIds: ['citation-guidelines'],
    },
  ],
  reviews: [{ id: 'review-context', claimId: 'claim-context', status: 'pending', reviewer: null, reviewedAt: null, note: null }],
  assetLicenses: [{ id: 'license-logo', assetPath: '/brand/atlas-logo.svg', creator: 'ATLAS', license: null, licenseUrl: null, status: 'unknown', reproduction: 'blocked' }],
  relationships: [],
  learningPaths: [],
};

describe('atlasSchema', () => {
  it('accepts a complete methodology atlas with valid references', () => {
    expect(atlasSchema.parse(validAtlas)).toEqual(validAtlas);
  });

  it('rejects malformed identifiers and slugs', () => {
    const result = atlasSchema.safeParse({
      ...validAtlas,
      entities: [{ ...validAtlas.entities[0], slug: 'Metodologia do ATLAS' }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects duplicate IDs and dangling relationship or source references', () => {
    const duplicateId = atlasSchema.safeParse({
      ...validAtlas,
      sources: [...validAtlas.sources, { ...validAtlas.sources[0], id: 'claim-context' }],
    });
    const missingSource = atlasSchema.safeParse({
      ...validAtlas,
      claims: [{ ...validAtlas.claims[0], citationIds: ['citation-missing'] }],
    });
    const danglingRelationship = atlasSchema.safeParse({
      ...validAtlas,
      relationships: [{ id: 'relation-1', fromEntityId: 'concept-methodology', toEntityId: 'entity-missing', label: 'relaciona' }],
    });
    const missingSourceReference = atlasSchema.safeParse({
      ...validAtlas,
      sources: [{ id: 'source-guidelines', title: 'Regras editoriais' }],
    });

    expect(duplicateId.success).toBe(false);
    expect(missingSource.success).toBe(false);
    expect(danglingRelationship.success).toBe(false);
    expect(missingSourceReference.success).toBe(false);
  });

  it('rejects duplicate slugs and repeated entity references', () => {
    const duplicateSlug = atlasSchema.safeParse({
      ...validAtlas,
      entities: [{ ...validAtlas.entities[0], slug: validAtlas.slug }],
    });
    const duplicateEntityReference = atlasSchema.safeParse({
      ...validAtlas,
      entityIds: ['concept-methodology', 'concept-methodology'],
    });

    expect(duplicateSlug.success).toBe(false);
    expect(duplicateEntityReference.success).toBe(false);
  });

  it('models people, events, articles, and learning paths with linked entities', () => {
    const base = {
      id: 'record-example',
      slug: 'registro-exemplo',
      title: 'Registro de exemplo',
      summary: 'Descrição usada no modelo.',
      sections: [{ heading: 'Contexto', paragraphs: ['Texto de contexto.'] }],
    };
    const path = {
      id: 'path-methodology',
      slug: 'trilha-metodologia',
      title: 'Trilha de metodologia',
      description: 'Percurso ligado a conteúdos existentes.',
      entityIds: ['concept-methodology'],
    };

    expect(personSchema.safeParse({ ...base, kind: 'person' }).success).toBe(true);
    expect(eventSchema.safeParse({ ...base, kind: 'event' }).success).toBe(true);
    expect(articleSchema.safeParse({ ...base, kind: 'article' }).success).toBe(true);
    expect(learningPathSchema.safeParse(path).success).toBe(true);
    expect(atlasSchema.safeParse({ ...validAtlas, learningPaths: [path] }).success).toBe(true);
    expect(atlasSchema.safeParse({
      ...validAtlas,
      learningPaths: [{ ...path, entityIds: ['entity-missing'] }],
    }).success).toBe(false);
  });

  it('requires every claim to have a source locator and a matching review record', () => {
    expect(atlasSchema.safeParse({ ...validAtlas, evidences: [] }).success).toBe(false);
    expect(atlasSchema.safeParse({ ...validAtlas, citations: [] }).success).toBe(false);
    expect(atlasSchema.safeParse({ ...validAtlas, reviews: [] }).success).toBe(false);
    expect(atlasSchema.safeParse({ ...validAtlas, claims: [{ ...validAtlas.claims[0], citationIds: [] }] }).success).toBe(false);
    expect(atlasSchema.safeParse({
      ...validAtlas,
      evidences: [{ ...validAtlas.evidences[0], sourceId: 'source-missing' }],
    }).success).toBe(false);
    expect(atlasSchema.safeParse({
      ...validAtlas,
      evidences: [{ ...validAtlas.evidences[0], locator: '  ' }],
    }).success).toBe(false);
  });

  it('requires verified reviews to identify a human and a review date', () => {
    const result = atlasSchema.safeParse({
      ...validAtlas,
      claims: [{ ...validAtlas.claims[0], editorialStatus: 'verified' }],
      reviews: [{ ...validAtlas.reviews[0], status: 'verified', reviewer: null, reviewedAt: null }],
    });
    expect(result.success).toBe(false);
  });

  it('blocks reproduction when an asset license is unknown', () => {
    expect(assetLicenseSchema.safeParse({
      id: 'license-unknown', assetPath: '/image.png', creator: null, license: null,
      licenseUrl: null, status: 'unknown', reproduction: 'allowed',
    }).success).toBe(false);
  });

  it('rejects known licenses without terms and duplicate asset paths', () => {
    expect(assetLicenseSchema.safeParse({
      id: 'license-incomplete', assetPath: '/image.png', creator: null, license: null,
      licenseUrl: null, status: 'known', reproduction: 'allowed',
    }).success).toBe(false);
    expect(atlasSchema.safeParse({
      ...validAtlas,
      assetLicenses: [...validAtlas.assetLicenses, { ...validAtlas.assetLicenses[0], id: 'license-second' }],
    }).success).toBe(false);
  });
});
