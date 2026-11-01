import { pageBlockSchema } from './ideology-page.schema';

describe('Interactive editorial block contract', () => {
  const item = {
    id: 'principle-history',
    title: 'História',
    kicker: 'Princípio',
    summary: 'Resumo',
    paragraphs: ['Contexto'],
    sourceIds: ['source-v4-marx-sep'],
    entityIds: ['concept-historical-materialism'],
    classification: 'interpretação',
  };
  it('accepts sourced principles and ideological currents as data', () => {
    expect(
      pageBlockSchema.safeParse({ type: 'explorations', mode: 'principles', items: [item] })
        .success,
    ).toBe(true);
    expect(
      pageBlockSchema.safeParse({ type: 'explorations', mode: 'schools', items: [item] }).success,
    ).toBe(true);
  });
  it('requires sources for an argumentative position', () => {
    expect(
      pageBlockSchema.safeParse({
        type: 'explorations',
        mode: 'principles',
        items: [{ ...item, sourceIds: [] }],
      }).success,
    ).toBe(false);
  });
});
