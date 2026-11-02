import { contentFixture } from '@testing/content-fixture';

import { localizedEntity } from '../queries/localized-content';
import { countrySchema, knowledgeGraphSchema, regimeSchema } from './content-schema';
import { translationCatalogueSchema } from './content-translation';

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

describe('content translation publication and fallback', () => {
  const entity = contentFixture.graph.atlases
    .flatMap((a) => a.entities)
    .find((e) => e.id === 'country-brazil')!;
  const translation = contentFixture.search.find((e) => e.id === entity.id)!.translations![0];
  it('uses an approved, revision-bound translation without changing the identity or review status', () => {
    const result = localizedEntity(entity, 'en', [translation]);
    expect(result.entity.title).toBe('Brazil');
    expect(result.entity.id).toBe(entity.id);
    expect(result.entity.slug).toBe(entity.slug);
    expect(result.entity.editorialStatus).toBe('pending');
    expect(result.locale).toBe('en');
    expect(result.translation?.review).toMatchObject({
      method: 'assistant',
      reviewer: 'Codex (IA)',
    });
  });
  it('falls back to the actual original for pending, stale or unsupported translations', () => {
    const pending = {
      ...translation,
      review: { status: 'pending' as const, note: 'Teste: sem revisão.' },
    };
    for (const [locale, entries] of [
      ['en', [pending]],
      ['en', [{ ...translation, sourceRevision: 99 }]],
      ['es', [translation]],
    ] as const) {
      const result = localizedEntity(entity, locale, entries);
      expect(result.entity).toBe(entity);
      expect(result.locale).toBe('pt-BR');
      expect(result.fallback).toBe(true);
    }
  });
  it('requires review attribution/method and unique locale/entity entries', () => {
    const base = {
      schemaVersion: 1,
      defaultLocale: 'pt-BR',
      locales: ['pt-BR', 'en'],
      entries: [translation],
    };
    expect(translationCatalogueSchema.safeParse(base).success).toBe(true);
    expect(
      translationCatalogueSchema.safeParse({ ...base, entries: [translation, translation] })
        .success,
    ).toBe(false);
    expect(
      translationCatalogueSchema.safeParse({
        ...base,
        entries: [{ ...translation, review: { status: 'approved' } }],
      }).success,
    ).toBe(false);
  });
});
