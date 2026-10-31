import { type Atlas, knowledgeGraphSchema } from './content-schema';
import { queryKnowledgeEntities, queryKnowledgeRelations } from './knowledge-graph';

const sharedEntity = {
  title: 'Registro documentado',
  summary: 'Registro curto de teste.',
  aliases: [],
  context: 'Contexto histórico incluído para consulta.',
  temporalExtent: { startYear: 1987, endYear: 1988, precision: 'year' as const, label: null },
  uncertainty: 'low' as const,
  revision: 1,
  sections: [{ heading: 'Contexto', paragraphs: ['Registro de teste.'] }],
};

function atlas(
  id: string,
  slug: string,
  entities: Atlas['entities'],
  relations: Atlas['relations'] = [],
): Atlas {
  return {
    id,
    slug,
    title: slug,
    description: 'Atlas de teste.',
    version: '1.0.0',
    updatedAt: '2026-10-31',
    entityIds: entities.map((entity) => entity.id),
    entities,
    sources: [],
    evidences: [],
    citations: [],
    claims: [],
    reviews: [],
    assetLicenses: [],
    relations,
    learningPaths: [],
  };
}

const concept = {
  ...sharedEntity,
  id: 'concept-rights',
  slug: 'direitos-fundamentais',
  kind: 'concept' as const,
};
const person = {
  ...sharedEntity,
  id: 'person-ulysses',
  slug: 'ulysses-guimaraes',
  kind: 'person' as const,
  aliases: ['Presidente da Constituinte'],
  temporalExtent: { startYear: 1916, endYear: 1992, precision: 'year' as const, label: null },
};
const graph = knowledgeGraphSchema.parse({
  id: 'knowledge-graph-test',
  version: '1.0.0',
  updatedAt: '2026-10-31',
  atlases: [
    atlas(
      'atlas-rights',
      'direitos',
      [concept],
      [
        {
          id: 'relation-constituent',
          fromEntityId: concept.id,
          toEntityId: person.id,
          type: 'documented-association',
          label: 'contextualiza a atuação de',
          reverseLabel: 'é contextualizada por',
          context: 'Ligação entre o tema constitucional e a trajetória documentada.',
          temporalExtent: {
            startYear: 1987,
            endYear: 1988,
            precision: 'year',
            label: 'Assembleia Nacional Constituinte',
          },
          uncertainty: 'low',
          evidenceIds: ['evidence-constituent'],
        },
      ],
    ),
    {
      ...atlas('atlas-constituinte', 'constituinte', [person]),
      sources: [
        {
          id: 'source-constituent',
          title: 'Fonte do fixture',
          url: null,
          edition: 'Fixture de teste',
          publicationDate: null,
        },
      ],
      evidences: [
        {
          id: 'evidence-constituent',
          sourceId: 'source-constituent',
          locator: 'seção histórica',
          accessedAt: '2026-10-31',
          note: null,
        },
      ],
    },
  ],
});

describe('knowledge graph queries', () => {
  it('filters entities by atlas, entity type, and overlapping period', () => {
    expect(
      queryKnowledgeEntities(graph, {
        atlasId: 'atlas-constituinte',
        type: 'person',
        fromYear: 1987,
      }),
    ).toEqual([{ atlasId: 'atlas-constituinte', entity: person }]);
    expect(queryKnowledgeEntities(graph, { atlasId: 'atlas-rights', type: 'event' })).toEqual([]);
    expect(
      queryKnowledgeEntities(graph, { atlasId: 'atlas-constituinte', fromYear: 2000 }),
    ).toEqual([]);
    expect(queryKnowledgeEntities(graph, { entityId: 'concept-rights' })).toHaveLength(1);
    expect(queryKnowledgeEntities(graph, { term: 'direitos' })).toHaveLength(1);
    expect(queryKnowledgeEntities(graph, { term: 'presidente da constituinte' })).toHaveLength(1);
  });

  it('returns directional relations using the reverse label for incoming queries', () => {
    const incoming = queryKnowledgeRelations(graph, 'person-ulysses', { direction: 'incoming' });
    expect(incoming).toHaveLength(1);
    expect(incoming[0]).toMatchObject({
      relationId: 'relation-constituent',
      relatedEntityId: 'concept-rights',
      direction: 'incoming',
      label: 'é contextualizada por',
      relationType: 'documented-association',
    });
    expect(queryKnowledgeRelations(graph, 'person-ulysses', { direction: 'outgoing' })).toEqual([]);
    expect(
      queryKnowledgeRelations(graph, 'concept-rights', {
        type: 'documented-association',
        fromYear: 1988,
      }),
    ).toHaveLength(1);
  });

  it('rejects IDs duplicated across atlases and dangling cross-atlas relation targets', () => {
    const secondAtlas = graph.atlases[1];
    const duplicateId = knowledgeGraphSchema.safeParse({
      ...graph,
      atlases: [
        graph.atlases[0],
        {
          ...secondAtlas,
          entities: [{ ...person, id: 'concept-rights', slug: 'person-duplicate' }],
          entityIds: ['concept-rights'],
        },
      ],
    });
    const danglingTarget = knowledgeGraphSchema.safeParse({
      ...graph,
      atlases: [
        {
          ...graph.atlases[0],
          relations: [
            {
              ...graph.atlases[0].relations[0],
              toEntityId: 'entity-missing',
            },
          ],
        },
        secondAtlas,
      ],
    });
    expect(duplicateId.success).toBe(false);
    expect(danglingTarget.success).toBe(false);
  });
});
