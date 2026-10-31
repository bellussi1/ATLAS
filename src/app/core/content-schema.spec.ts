import { assetLicenseSchema, atlasSchema, articleSchema, entitySchema, eventSchema, historicalPolitySchema, ideologySchema, institutionSchema, learningPathSchema, personSchema, placeSchema, policySchema, partySchema, governmentSchema, workSchema, relationSchema, knowledgeGraphSchema } from './content-schema';

const validAtlas = {
  id: 'atlas-methodology',
  slug: 'methodology-atlas',
  title: 'Metodologia do ATLAS',
  description: 'Como o projeto estrutura seu conteúdo.',
  version: '1.0.0',
  updatedAt: '2026-10-31',
  entityIds: ['concept-methodology'],
  entities: [
    {
      id: 'concept-methodology',
      slug: 'metodologia-do-atlas',
      kind: 'concept',
      title: 'Metodologia do ATLAS',
      summary: 'Critérios editoriais do projeto.',
      aliases: [],
      context: 'Registro metodológico de teste.',
      temporalExtent: null,
      uncertainty: 'low',
      revision: 1,
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
  relations: [],
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
      relations: [{ id: 'relation-1', fromEntityId: 'concept-methodology', toEntityId: 'entity-missing', type: 'editorial-link', label: 'relaciona', reverseLabel: 'é relacionado por', context: 'Contexto editorial.', temporalExtent: null, uncertainty: 'unknown', evidenceIds: [] }],
    });
    const danglingGraphRelationship = knowledgeGraphSchema.safeParse({
      id: 'knowledge-graph-atlas', version: '1.0.0', updatedAt: '2026-10-31',
      atlases: [{ ...validAtlas, relations: [{ id: 'relation-2', fromEntityId: 'concept-methodology', toEntityId: 'entity-missing', type: 'editorial-link', label: 'relaciona', reverseLabel: 'é relacionado por', context: 'Contexto editorial.', temporalExtent: null, uncertainty: 'unknown', evidenceIds: [] }] }],
    });
    const missingSourceReference = atlasSchema.safeParse({
      ...validAtlas,
      sources: [{ id: 'source-guidelines', title: 'Regras editoriais' }],
    });

    expect(duplicateId.success).toBe(false);
    expect(missingSource.success).toBe(false);
    expect(danglingRelationship.success).toBe(true);
    expect(danglingGraphRelationship.success).toBe(false);
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

  it('models all requested entity types and learning paths with linked entities', () => {
    const base = {
      id: 'record-example',
      slug: 'registro-exemplo',
      title: 'Registro de exemplo',
      summary: 'Descrição usada no modelo.',
      aliases: [],
      context: 'Contexto documental do registro.',
      temporalExtent: null,
      uncertainty: 'unknown',
      revision: 1,
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
    for (const kind of ['ideology', 'concept', 'work', 'historical-polity', 'place', 'party', 'institution', 'government', 'policy']) {
      expect(entitySchema.safeParse({ ...base, kind }).success).toBe(true);
    }
    expect(ideologySchema.safeParse({ ...base, kind: 'ideology' }).success).toBe(true);
    expect(workSchema.safeParse({ ...base, kind: 'work' }).success).toBe(true);
    expect(historicalPolitySchema.safeParse({ ...base, kind: 'historical-polity' }).success).toBe(true);
    expect(placeSchema.safeParse({ ...base, kind: 'place' }).success).toBe(true);
    expect(partySchema.safeParse({ ...base, kind: 'party' }).success).toBe(true);
    expect(institutionSchema.safeParse({ ...base, kind: 'institution' }).success).toBe(true);
    expect(governmentSchema.safeParse({ ...base, kind: 'government' }).success).toBe(true);
    expect(policySchema.safeParse({ ...base, kind: 'policy' }).success).toBe(true);
    expect(learningPathSchema.safeParse(path).success).toBe(true);
    expect(atlasSchema.safeParse({ ...validAtlas, learningPaths: [path] }).success).toBe(true);
    expect(atlasSchema.safeParse({
      ...validAtlas,
      learningPaths: [{ ...path, entityIds: ['entity-missing'] }],
    }).success).toBe(false);
  });

  it('requires directional relations to describe their reverse and evidence-backed historical claims', () => {
    const result = relationSchema.safeParse({
      id: 'relation-influence', fromEntityId: 'person-a', toEntityId: 'concept-b', type: 'influence',
      label: 'influenciou', reverseLabel: 'recebeu influência de', context: 'Atribuição documentada.',
      temporalExtent: { startYear: 1987, endYear: 1988, precision: 'year', label: null },
      uncertainty: 'moderate', evidenceIds: [],
    });
    expect(result.success).toBe(false);
  });

  it('accepts a versioned knowledge graph containing multiple atlases', () => {
    const otherAtlas = { ...validAtlas, id: 'atlas-politics', slug: 'politics', title: 'Política', entityIds: ['person-example'], entities: [{
      ...validAtlas.entities[0], id: 'person-example', slug: 'pessoa-exemplo', kind: 'person' as const,
    }], sources: [], evidences: [], citations: [], claims: [], reviews: [], assetLicenses: [], relations: [], learningPaths: [] };
    const result = knowledgeGraphSchema.safeParse({
      id: 'knowledge-graph-atlas', version: '1.0.0', updatedAt: '2026-10-31', atlases: [validAtlas, otherAtlas],
    });
    expect(result.success).toBe(true);
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
