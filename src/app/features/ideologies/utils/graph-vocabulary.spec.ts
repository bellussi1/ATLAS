import type { KnowledgeGraph } from '@core/content/models/content-schema';
import { graphVocabulary, shortDefinition } from '@ideologies/utils/graph-vocabulary';

const graph = {
  atlases: [
    {
      entities: [
        {
          id: 'person-karl-marx',
          kind: 'person',
          title: 'Karl Marx',
          aliases: ['K. Marx', 'Marx'],
          summary: 'Filósofo e crítico da economia política.',
        },
      ],
    },
  ],
} as unknown as KnowledgeGraph;

describe('graphVocabulary', () => {
  it('explains titles and aliases with the record summary and skips ambiguous labels', () => {
    const terms = graphVocabulary(graph, [
      { label: 'Marx', entityId: 'person-karl-marx', kind: 'Pensador', definition: 'manual' },
      { label: 'Engels', entityId: 'person-engels', kind: 'Pensador', definition: 'manual' },
    ]);
    expect(terms.map((t) => t.label)).toEqual(['Karl Marx', 'K. Marx', 'Marx', 'Engels']);
    expect(terms.find((t) => t.label === 'Marx')?.definition).toBe(
      'Filósofo e crítico da economia política.',
    );
    expect(terms.find((t) => t.label === 'Karl Marx')?.kind).toBe('Pessoa');
    expect(terms.find((t) => t.label === 'Engels')?.definition).toBe('manual');
  });

  it('prevents colliding aliases on another entity from hijacking titles or manual terms', () => {
    const withCollision = {
      atlases: [
        {
          entities: [
            {
              id: 'wiki-topic-classe-social',
              kind: 'concept',
              title: 'Classe social',
              aliases: ['Karl Marx', 'Marx'],
              summary: 'Conceito sociológico de estratificação.',
            },
            {
              id: 'person-karl-marx',
              kind: 'person',
              title: 'Karl Marx',
              aliases: ['K. Marx', 'Marx'],
              summary: 'Filósofo e crítico da economia política.',
            },
          ],
        },
      ],
    } as unknown as KnowledgeGraph;

    const terms = graphVocabulary(withCollision, [
      { label: 'Marx', entityId: 'person-karl-marx', kind: 'Pensador', definition: 'manual' },
    ]);
    expect(terms.find((t) => t.label === 'Karl Marx')?.entityId).toBe('person-karl-marx');
    expect(terms.find((t) => t.label === 'Marx')?.entityId).toBe('person-karl-marx');
    expect(terms.find((t) => t.label === 'Classe social')?.entityId).toBe(
      'wiki-topic-classe-social',
    );
  });

  it('shortens long summaries at a word boundary', () => {
    expect(shortDefinition('uma frase longa demais para caber', 15)).toBe('uma frase…');
  });
});
