import type { Atlas, Entity } from '@core/content/models/content-schema';

/** Extra temporal reading for one person, always grounded in a relation that exists in the atlas. */
export interface EraTemporalNote {
  /** Span of dated works attributed to the person; not a full biography of activity. */
  activity?: { from: number; to: number; titles: string[] };
  /** Events the person is documented as taking part in, with the year of the event. */
  participation?: { id: string; title: string; year: number }[];
}

function pushUnique<T extends { id: string }>(list: T[], value: T): void {
  if (!list.some((item) => item.id === value.id)) list.push(value);
}

/**
 * Reads the atlas relations that already exist and turns them into the three temporal layers
 * the chronology shows: life (from the entity), dated works and documented participation.
 * A missing relation means "not recorded", never "did not happen".
 */
export function eraTemporalNotesFor(atlas: Atlas): Map<string, EraTemporalNote> {
  const byId = new Map(atlas.entities.map((entity) => [entity.id, entity]));
  const activity = new Map<string, { id: string; title: string; year: number }[]>();
  const participation = new Map<string, { id: string; title: string; year: number }[]>();

  for (const relation of atlas.relations) {
    if (
      relation.type !== 'authored' &&
      relation.type !== 'wrote' &&
      relation.type !== 'participated_in'
    )
      continue;
    const person = byId.get(relation.fromEntityId);
    const target = byId.get(relation.toEntityId);
    const year = target?.temporalExtent?.startYear;
    if (person?.kind !== 'person' || !target || year == null) continue;
    if (relation.type === 'participated_in' && target.kind === 'event') {
      const list = participation.get(person.id) ?? [];
      pushUnique(list, { id: target.id, title: target.title, year });
      participation.set(person.id, list);
    }
    if (
      (relation.type === 'authored' || relation.type === 'wrote') &&
      (target.kind === 'work' || target.kind === 'article')
    ) {
      const list = activity.get(person.id) ?? [];
      pushUnique(list, { id: target.id, title: target.title, year });
      activity.set(person.id, list);
    }
  }

  const notes = new Map<string, EraTemporalNote>();
  for (const personId of new Set([...activity.keys(), ...participation.keys()])) {
    const works = [...(activity.get(personId) ?? [])].sort((a, b) => a.year - b.year);
    const events = [...(participation.get(personId) ?? [])].sort((a, b) => a.year - b.year);
    notes.set(personId, {
      activity: works.length
        ? {
            from: works[0]!.year,
            to: works.at(-1)!.year,
            titles: works.map((work) => work.title),
          }
        : undefined,
      participation: events.length ? events : undefined,
    });
  }
  return notes;
}

/** Only the records the chronology actually shows, so a relation outside the block stays out. */
export function eraTemporalNotesForPeople(
  atlas: Atlas,
  people: readonly Entity[],
): Map<string, EraTemporalNote> {
  const ids = new Set(people.map((person) => person.id));
  return new Map([...eraTemporalNotesFor(atlas)].filter(([id]) => ids.has(id)));
}
