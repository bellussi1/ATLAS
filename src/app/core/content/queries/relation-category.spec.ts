import { classifyRelation } from './relation-category';

const relation = (type: string, label: string, url?: string) => ({
  id: `rel-${type}-${label}`,
  type,
  label,
  provenance: url ? { url } : null,
});

describe('classifyRelation', () => {
  it('keeps specific types in their family', () => {
    expect(classifyRelation(relation('influenced_by', 'foi influenciado por'))).toEqual({
      family: 'influenced',
      reverse: true,
    });
    expect(classifyRelation(relation('wrote', 'escreveu'))?.family).toBe('creation');
  });

  it('reads the historical verb from generic labels', () => {
    expect(classifyRelation(relation('documented-association', 'foi membro de'))?.family).toBe(
      'participation',
    );
    expect(classifyRelation(relation('documented-association', 'fundou'))?.family).toBe('creation');
    expect(classifyRelation(relation('documented-association', 'sucedeu'))?.family).toBe(
      'continuity',
    );
    expect(classifyRelation(relation('documented-association', 'ocorreu em'))?.family).toBe(
      'location',
    );
    expect(
      classifyRelation(relation('associated_with', 'é classificado com a ideologia'))?.family,
    ).toBe('affiliation');
  });

  it('reads Wikidata P737 as reversed influence', () => {
    expect(
      classifyRelation(
        relation(
          'associated_with',
          'é classificado em associação com',
          'https://www.wikidata.org/wiki/Q44197#P737',
        ),
      ),
    ).toEqual({ family: 'influenced', reverse: true });
  });

  it('omits navigation links and vague co-occurrence', () => {
    expect(classifyRelation(relation('encyclopedic-link', 'link de descoberta'))).toBeNull();
    expect(classifyRelation(relation('associated_with', 'associado a'))).toBeNull();
  });
});
