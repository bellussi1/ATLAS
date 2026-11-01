import { methodologyKnowledgeGraph } from '@core/content/repositories/content-repository.service';
import { terms } from '@ideologies/data/knowledge-vocabulary';
import { knowledgeTextParts } from '@ideologies/utils/knowledge-text-parts';

describe('Contextual editorial terms', () => {
  it('reuses the same contract for Liberalism and every vocabulary ID exists', () => {
    const text = 'John Locke e Adam Smith: registros da coleção.';
    const parts = knowledgeTextParts(text);
    expect(parts.map((part) => part.text).join('')).toBe(text);
    expect(parts.filter((part) => part.term).map((part) => part.term?.entityId)).toEqual([
      'person-john-locke',
      'person-adam-smith',
    ]);
    const ids = new Set(methodologyKnowledgeGraph.atlases.flatMap((a) => a.entityIds));
    expect(terms.filter((term) => !ids.has(term.entityId))).toEqual([]);
  });
  it('preserves text and punctuation without matching inside another word', () => {
    const text = 'Materialismo histórico, Karl Marx e marxismo: O capital.';
    const parts = knowledgeTextParts(text);
    expect(parts.map((p) => p.text).join('')).toBe(text);
    expect(parts.filter((p) => p.term).map((p) => p.term?.entityId)).toEqual([
      'concept-historical-materialism',
      'person-karl-marx',
      'work-capital-volume-i',
    ]);
    expect(knowledgeTextParts('O capitalismo não é O capitalista.').some((p) => p.term)).toBe(
      false,
    );
  });
  it('limits controls to a single occurrence of each entity per paragraph', () => {
    expect(
      knowledgeTextParts('Karl Marx, Karl Marx e Karl Marx.').filter((p) => p.term),
    ).toHaveLength(1);
  });
});
