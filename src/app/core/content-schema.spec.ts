import { atlasSchema, articleSchema, eventSchema, learningPathSchema, personSchema } from './content-schema';

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
  sources: [{ id: 'source-guidelines', title: 'Regras editoriais', reference: 'AGENTS.md#conteudo' }],
  claims: [
    {
      id: 'claim-context',
      entityId: 'concept-methodology',
      text: 'Afirmações históricas recebem contexto.',
      sourceIds: ['source-guidelines'],
    },
  ],
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
      sources: [...validAtlas.sources, { id: 'claim-context', title: 'Duplicada', reference: 'x' }],
    });
    const missingSource = atlasSchema.safeParse({
      ...validAtlas,
      claims: [{ ...validAtlas.claims[0], sourceIds: ['source-missing'] }],
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
});
