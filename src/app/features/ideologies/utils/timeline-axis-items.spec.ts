import type { Entity } from '@core/content/models/content-schema';

import { axisItemOf, entityKindLabel } from './timeline-axis-items';

const entity = (extent: Partial<NonNullable<Entity['temporalExtent']>> | null) =>
  ({
    id: 'x',
    title: 'X',
    kind: 'person',
    temporalExtent: extent && { startYear: null, endYear: null, precision: 'year', ...extent },
  }) as Entity;

describe('axisItemOf', () => {
  it('stands a single year on both ends and keeps approximate dates marked', () => {
    expect(axisItemOf(entity({ startYear: 1848 }))).toMatchObject({ start: 1848, end: 1848 });
    expect(axisItemOf(entity({ endYear: 1900, precision: 'approximate' }))).toMatchObject({
      start: 1900,
      end: 1900,
      approximate: true,
    });
  });
  it('orders reversed years and drops records without a year', () => {
    expect(axisItemOf(entity({ startYear: 1900, endYear: 1850 }))).toMatchObject({
      start: 1850,
      end: 1900,
    });
    expect(axisItemOf(entity({}))).toBeNull();
    expect(axisItemOf(entity(null))).toBeNull();
  });
  it('names the kind in Portuguese', () => {
    expect(entityKindLabel('event')).toBe('Acontecimento');
  });
});
