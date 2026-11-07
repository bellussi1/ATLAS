import type { Entity, KnowledgeGraph } from '@core/content/models/content-schema';

import { contextVocabulary } from './context-vocabulary';

function entity(overrides: Partial<Entity> & Pick<Entity, 'id' | 'title' | 'kind'>): Entity {
  return {
    slug: overrides.id,
    summary: `Resumo de ${overrides.title}.`,
    aliases: [],
    context: '',
    temporalExtent: null,
    uncertainty: 'low',
    revision: 1,
    sections: [],
    editorialStatus: 'pending',
    ...overrides,
  } as Entity;
}

function graphWith(entities: Entity[]): KnowledgeGraph {
  return {
    id: 'graph-test',
    version: '1.1.0',
    updatedAt: '2026-11-07',
    atlases: [
      {
        id: 'atlas-test',
        slug: 'test',
        title: 'Teste',
        description: 'Teste',
        version: '1.0.0',
        updatedAt: '2026-11-07',
        entityIds: entities.map((item) => item.id),
        entities,
        sources: [],
        evidences: [],
        citations: [],
        claims: [],
        reviews: [],
        relations: [],
        assetLicenses: [],
        learningPaths: [],
      },
    ],
  } as KnowledgeGraph;
}

const proletariado = entity({
  id: 'wiki-topic-proletariado',
  title: 'Proletariado',
  kind: 'concept',
  aliases: ['proletários'],
});
const meios = entity({
  id: 'wiki-topic-meios-de-producao',
  title: 'Meios de produção',
  kind: 'concept',
});
const classe = entity({
  id: 'wiki-topic-classe-social',
  title: 'Classe social',
  kind: 'concept',
  aliases: ['classe', 'Marx'],
});
const marx = entity({
  id: 'person-karl-marx',
  title: 'Karl Marx',
  kind: 'person',
  aliases: ['Marx'],
});
const bakunin = entity({
  id: 'wiki-topic-mikhail-bakunin',
  title: 'Mikhail Bakunin',
  kind: 'person',
  aliases: ['Bakunin'],
});

describe('context vocabulary', () => {
  it('links the words in the sheet without linking the current record', () => {
    const vocabulary = contextVocabulary(
      graphWith([proletariado, meios, classe, marx, bakunin]),
      'wiki-topic-proletariado',
    );
    expect(vocabulary.find((term) => term.label === 'Proletariado')).toBeUndefined();
    expect(vocabulary.find((term) => term.label === 'Meios de produção')?.entityId).toBe(
      'wiki-topic-meios-de-producao',
    );
    expect(vocabulary.find((term) => term.label === 'Bakunin')?.entityId).toBe(
      'wiki-topic-mikhail-bakunin',
    );
    expect(vocabulary.find((term) => term.label === 'classe')?.entityId).toBe(
      'wiki-topic-classe-social',
    );
  });

  it('resolves a colliding alias with the curated short form, not the last importer', () => {
    const vocabulary = contextVocabulary(graphWith([classe, marx]));
    expect(vocabulary.find((term) => term.label === 'Marx')?.entityId).toBe('person-karl-marx');
    expect(vocabulary.find((term) => term.label === 'Karl Marx')?.entityId).toBe(
      'person-karl-marx',
    );
  });

  it('drops labels shared by two records when no curated form resolves them', () => {
    const first = entity({ id: 'a', title: 'Primeiro', kind: 'concept', aliases: ['comum'] });
    const second = entity({ id: 'b', title: 'Segundo', kind: 'concept', aliases: ['comum'] });
    const vocabulary = contextVocabulary(graphWith([first, second]));
    expect(vocabulary.find((term) => term.label === 'comum')).toBeUndefined();
  });
});
