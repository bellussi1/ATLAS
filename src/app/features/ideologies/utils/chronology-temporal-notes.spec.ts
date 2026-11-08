import type { Atlas, Entity } from '@core/content/models/content-schema';

import { eraTemporalNotesFor, eraTemporalNotesForPeople } from './chronology-temporal-notes';

const entity = (id: string, kind: Entity['kind'], startYear: number | null, endYear = startYear) =>
  ({
    id,
    title: id,
    kind,
    temporalExtent: { startYear, endYear, precision: 'year', label: null },
  }) as Entity;

const atlas = {
  entities: [
    entity('marx', 'person', 1818, 1883),
    entity('manifesto', 'work', 1848),
    entity('capital', 'work', 1867),
    entity('commune', 'event', 1871),
    entity('untitled', 'work', null),
  ],
  relations: [
    {
      id: 'r1',
      fromEntityId: 'marx',
      toEntityId: 'manifesto',
      type: 'authored',
    },
    {
      id: 'r2',
      fromEntityId: 'marx',
      toEntityId: 'capital',
      type: 'wrote',
    },
    {
      id: 'r3',
      fromEntityId: 'marx',
      toEntityId: 'commune',
      type: 'participated_in',
    },
    {
      id: 'r4',
      fromEntityId: 'marx',
      toEntityId: 'untitled',
      type: 'wrote',
    },
    {
      id: 'r5',
      fromEntityId: 'manifesto',
      toEntityId: 'marx',
      type: 'authored',
    },
  ],
} as unknown as Atlas;

describe('eraTemporalNotesFor', () => {
  it('separates dated works from documented participation', () => {
    const note = eraTemporalNotesFor(atlas).get('marx')!;
    expect(note.activity).toEqual({
      from: 1848,
      to: 1867,
      titles: ['manifesto', 'capital'],
    });
    expect(note.participation).toEqual([{ id: 'commune', title: 'commune', year: 1871 }]);
  });

  it('ignores works without a year and relations already reversed', () => {
    expect(eraTemporalNotesFor(atlas).get('manifesto')).toBeUndefined();
  });

  it('keeps notes only for the people the chronology shows', () => {
    const notes = eraTemporalNotesForPeople(atlas, [atlas.entities[0]!]);
    expect([...notes.keys()]).toEqual(['marx']);
    expect(eraTemporalNotesForPeople(atlas, []).size).toBe(0);
  });
});
