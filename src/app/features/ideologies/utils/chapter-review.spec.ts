import type { Atlas, Source } from '@core/content/models/content-schema';
import type { IdeologyPage } from '@ideologies/models/ideology-page.schema';
import { chapterReviews } from '@ideologies/utils/chapter-review';

const atlas = {
  entities: [
    { id: 'person-karl-marx', title: 'Karl Marx' },
    { id: 'person-eduard-bernstein', title: 'Eduard Bernstein' },
  ],
  relations: [
    {
      fromEntityId: 'person-karl-marx',
      toEntityId: 'person-eduard-bernstein',
      label: 'criticou',
      context: 'Uma relação que não deve virar pergunta automaticamente.',
    },
  ],
} as unknown as Atlas;

const source = (id: string): Source => ({
  id,
  title: `Fonte ${id}`,
  url: null,
  edition: '1. ed.',
  publicationDate: null,
});

const chapters = [
  {
    id: 'introducao',
    narrative: ['Karl Marx e Eduard Bernstein aparecem no texto.'],
    review: {
      question: 'O que separa reforma de revolução nesta tradição?',
      answer: 'A estratégia e o diagnóstico do que pode mudar.',
      rationale: 'Compare estratégias, não apenas nomes.',
      sourceIds: ['source-a'],
      revisit: [
        {
          entityId: 'person-eduard-bernstein',
          why: 'Retome a revisão reformista para localizar a objeção.',
        },
      ],
    },
  },
  {
    id: 'origens',
    narrative: ['Karl Marx e Eduard Bernstein aparecem de novo.'],
    review: null,
  },
] as unknown as IdeologyPage['chapters'];

describe('chapterReviews', () => {
  it('keeps only editorial reviews and resolves labels, sources and connections', () => {
    const resolveSources = (ids: string[]) => ids.map(source);
    const reviews = chapterReviews(chapters, atlas, resolveSources);
    expect(reviews[0]).toMatchObject({
      question: 'O que separa reforma de revolução nesta tradição?',
      answer: 'A estratégia e o diagnóstico do que pode mudar.',
      rationale: 'Compare estratégias, não apenas nomes.',
    });
    expect(reviews[0]?.sources.map((item) => item.title)).toEqual(['Fonte source-a']);
    expect(reviews[0]?.revisit).toEqual([
      {
        entityId: 'person-eduard-bernstein',
        label: 'Eduard Bernstein',
        why: 'Retome a revisão reformista para localizar a objeção.',
      },
    ]);
    expect(reviews[1]).toBeNull();
  });

  it('does not turn a documented relation into a question without an editorial review', () => {
    expect(atlas.relations).toHaveLength(1);
    expect(chapterReviews(chapters, atlas, () => [])[1]).toBeNull();
  });
});
