import type { Entity } from '@core/content/models/content-schema';

import { chronologyGroupOf, chronologyItemOf, entityKindLabel } from './chronology-items';

const entity = (extent: Partial<NonNullable<Entity['temporalExtent']>> | null) =>
  ({
    id: 'x',
    title: 'X',
    kind: 'person',
    temporalExtent: extent && { startYear: null, endYear: null, precision: 'year', ...extent },
  }) as Entity;

describe('chronologyItemOf', () => {
  it('stands a single year on both ends and keeps approximate dates marked', () => {
    expect(chronologyItemOf(entity({ startYear: 1848 }))).toMatchObject({
      start: 1848,
      end: 1848,
    });
    expect(chronologyItemOf(entity({ endYear: 1900, precision: 'approximate' }))).toMatchObject({
      start: 1900,
      end: 1900,
      approximate: true,
    });
  });
  it('orders reversed years and drops records without a year', () => {
    expect(chronologyItemOf(entity({ startYear: 1900, endYear: 1850 }))).toMatchObject({
      start: 1850,
      end: 1900,
    });
    expect(chronologyItemOf(entity({}))).toBeNull();
    expect(chronologyItemOf(entity(null))).toBeNull();
  });
  it('names the kind in Portuguese', () => {
    expect(entityKindLabel('event')).toBe('Acontecimento');
    expect(entityKindLabel('place', 'country')).toBe('País');
    expect(entityKindLabel('place', 'regime')).toBe('Regime');
    expect(entityKindLabel('place')).toBe('Território');
  });
  it('sends each kind to the group the filters and lists use', () => {
    expect(chronologyGroupOf('person')).toBe('people');
    expect(chronologyGroupOf('work')).toBe('works');
    expect(chronologyGroupOf('article')).toBe('works');
    expect(chronologyGroupOf('event')).toBe('events');
    expect(chronologyGroupOf('institution')).toBe('organizations');
    expect(chronologyGroupOf('party')).toBe('organizations');
  });
});
