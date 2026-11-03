import { relationSentence } from './relation-types';

describe('relationSentence', () => {
  it('keeps a lowercase label as the predicate', () => {
    expect(
      relationSentence({
        type: 'divergencia-ou-critica',
        label: 'critica o programa de reformas de',
      }),
    ).toEqual({ predicate: 'critica o programa de reformas de', topic: null });
  });

  it('turns a capitalised topic label into a topic with the verb of the relation type', () => {
    expect(
      relationSentence({ type: 'influencia-documentada', label: 'Separação dos poderes' }),
    ).toEqual({ predicate: 'influencia', topic: 'Separação dos poderes' });
    expect(
      relationSentence({ type: 'divergencia-ou-critica', label: 'Crítica ao Estado' }),
    ).toEqual({
      predicate: 'critica',
      topic: 'Crítica ao Estado',
    });
  });
});
