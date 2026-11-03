import type { Atlas } from '@core/content/models/content-schema';
import type { KnowledgeTerm } from '@ideologies/models/knowledge-term';
import { chapterReviews } from '@ideologies/utils/chapter-review';

const atlas = {
  entities: [
    { id: 'a', title: 'Karl Marx' },
    { id: 'b', title: 'O capital' },
    { id: 'c', title: 'Engels' },
  ],
  relations: [
    { fromEntityId: 'a', toEntityId: 'b', label: 'escreveu', context: 'Publicado em 1867.' },
  ],
} as unknown as Atlas;
const vocabulary: KnowledgeTerm[] = [
  { label: 'Karl Marx', entityId: 'a', kind: 'Pessoa', definition: '' },
  { label: 'O capital', entityId: 'b', kind: 'Obra', definition: '' },
  { label: 'Engels', entityId: 'c', kind: 'Pessoa', definition: '' },
  { label: 'Fora', entityId: 'z', kind: 'Pessoa', definition: '' },
];

describe('chapterReviews', () => {
  it('asks about documented relations and revisits records from two chapters before', () => {
    const reviews = chapterReviews(
      [
        { narrative: ['Karl Marx escreveu O capital com apoio de Engels, citado Fora.'] },
        { narrative: ['Um capítulo sem nomes.'] },
        { narrative: ['Karl Marx de novo.'] },
      ],
      atlas,
      vocabulary,
    );
    expect(reviews[0].recall?.answer).toBe('Karl Marx escreveu O capital.');
    expect(reviews[1].recall).toBeNull();
    expect(reviews[2].revisit.map((r) => r.label)).toEqual(['O capital', 'Engels']);
  });
});
