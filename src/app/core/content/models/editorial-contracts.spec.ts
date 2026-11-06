import { contentFixture } from '@testing/content-fixture';

import { localizedEntity } from '../queries/localized-content';
import { entitySchema, knowledgeGraphSchema } from './content-schema';
import { translationCatalogueSchema } from './content-translation';

describe('place editorial contracts', () => {
  const graph = contentFixture.graph;
  it('keeps the country and regime cuts as places with their own profiles', () => {
    const country = graph.atlases
      .flatMap((a) => a.entities)
      .find((e) => e.id === 'country-brazil')!;
    expect(country.kind).toBe('place');
    expect(country.kind === 'place' ? country.placeType : undefined).toBe('country');
    expect(entitySchema.safeParse(country).success).toBe(true);
    expect(entitySchema.safeParse({ ...country, countryProfile: undefined }).success).toBe(false);
    expect(entitySchema.safeParse({ ...country, placeType: 'regime' }).success).toBe(false);
    const regime = graph.atlases
      .flatMap((a) => a.entities)
      .find((e) => e.id === 'regime-brazil-constitution-1988')!;
    expect(regime.kind).toBe('place');
    expect(regime.kind === 'place' ? regime.placeType : undefined).toBe('regime');
    expect(entitySchema.safeParse({ ...regime, temporalExtent: null }).success).toBe(false);
  });
  it('normalizes the former country and regime kinds into places', () => {
    const country = graph.atlases
      .flatMap((a) => a.entities)
      .find((e) => e.id === 'country-brazil')!;
    const legacy = { ...country, kind: 'country' } as Record<string, unknown>;
    delete legacy['placeType'];
    const parsed = entitySchema.parse(legacy);
    expect(parsed.kind).toBe('place');
    expect(parsed.kind === 'place' ? parsed.placeType : undefined).toBe('country');
  });
  it('rejects ungrounded classifications and non-country references before publication', () => {
    const invalid = structuredClone(graph);
    const regime = invalid.atlases
      .flatMap((a) => a.entities)
      .find((e) => e.kind === 'place' && e.placeType === 'regime')!;
    if (regime.kind !== 'place' || !regime.regimeProfile) throw Error('Missing regime fixture');
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
