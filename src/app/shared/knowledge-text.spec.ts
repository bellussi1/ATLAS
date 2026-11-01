import { knowledgeTextParts } from './knowledge-text';

describe('Contextual editorial terms', () => {
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
