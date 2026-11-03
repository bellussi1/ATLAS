import type { Atlas } from '@core/content/models/content-schema';

import { deskEntities, deskLinks, eraBuckets, filterDesk, parseChain } from './desk-graph';

const extent = (startYear: number | null) =>
  startYear === null ? null : { startYear, endYear: null, precision: 'year' as const, label: null };
const atlas = {
  entities: [
    {
      id: 'p-marx',
      slug: 'marx',
      title: 'Karl Marx',
      kind: 'person',
      summary: 'Crítico',
      temporalExtent: extent(1818),
    },
    {
      id: 'w-capital',
      slug: 'capital',
      title: 'O capital',
      kind: 'work',
      summary: 'Valor',
      temporalExtent: extent(1867),
    },
    {
      id: 'c-valor',
      slug: 'valor',
      title: 'Valor',
      kind: 'concept',
      summary: '',
      temporalExtent: extent(null),
    },
  ],
  relations: [
    {
      id: 'r1',
      fromEntityId: 'p-marx',
      toEntityId: 'w-capital',
      label: 'escreveu',
      reverseLabel: 'foi escrita por',
      context: 'Publicada em 1867.',
      temporalExtent: extent(1867),
    },
  ],
} as unknown as Atlas;

describe('desk graph', () => {
  const entities = deskEntities(atlas);

  it('filters by accent-insensitive text, kind and era', () => {
    expect(
      filterDesk(entities, { text: 'CAPITAL', kind: null, era: null }).map((e) => e.id),
    ).toEqual(['w-capital']);
    expect(filterDesk(entities, { text: '', kind: 'person', era: null })).toHaveLength(1);
    expect(filterDesk(entities, { text: '', kind: null, era: 1850 }).map((e) => e.id)).toEqual([
      'w-capital',
    ]);
  });

  it('reads relations from either side with the matching label', () => {
    expect(deskLinks(atlas, 'p-marx')[0]).toMatchObject({
      otherId: 'w-capital',
      label: 'escreveu',
    });
    expect(deskLinks(atlas, 'w-capital')[0]).toMatchObject({
      otherId: 'p-marx',
      label: 'foi escrita por',
    });
  });

  it('buckets dated records and drops unknown or repeated chain ids', () => {
    expect(eraBuckets(entities).map((b) => b.count)).toEqual([1, 0, 1]);
    expect(parseChain('p-marx,nope,p-marx,w-capital', entities)).toEqual(['p-marx', 'w-capital']);
  });
});
