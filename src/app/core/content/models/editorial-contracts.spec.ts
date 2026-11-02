import { contentFixture } from '@testing/content-fixture';

import { countrySchema, knowledgeGraphSchema, regimeSchema } from './content-schema';

describe('country and regime editorial contracts', () => {
  const graph = contentFixture.graph;
  it('keeps countries distinct from places, governments and regimes', () => {
    const country = graph.atlases
      .flatMap((a) => a.entities)
      .find((e) => e.id === 'country-brazil')!;
    expect(countrySchema.safeParse(country).success).toBe(true);
    expect(countrySchema.safeParse({ ...country, countryProfile: undefined }).success).toBe(false);
    expect(regimeSchema.safeParse(country).success).toBe(false);
    const regime = graph.atlases
      .flatMap((a) => a.entities)
      .find((e) => e.id === 'regime-brazil-constitution-1988')!;
    expect(regimeSchema.safeParse({ ...regime, temporalExtent: null }).success).toBe(false);
  });
  it('rejects ungrounded classifications and non-country references before publication', () => {
    const invalid = structuredClone(graph);
    const regime = invalid.atlases.flatMap((a) => a.entities).find((e) => e.kind === 'regime')!;
    if (regime.kind !== 'regime') throw Error('Missing regime fixture');
    regime.regimeProfile.countryIds = ['person-karl-marx'];
    expect(knowledgeGraphSchema.safeParse(invalid).success).toBe(false);
    regime.regimeProfile.countryIds = ['country-brazil'];
    regime.regimeProfile.classifications[0].evidenceIds = ['evidence-missing'];
    expect(knowledgeGraphSchema.safeParse(invalid).success).toBe(false);
  });
});
