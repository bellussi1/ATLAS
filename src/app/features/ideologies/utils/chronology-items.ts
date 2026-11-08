import { type Entity, type PlaceType, placeTypeOf } from '@core/content/models/content-schema';

/** Groups a reader can filter the chronology by; they match the reading order of the lists. */
export type ChronologyGroup = 'people' | 'works' | 'events' | 'organizations';

export const chronologyGroups: readonly { key: ChronologyGroup; label: string }[] = [
  { key: 'people', label: 'Pessoas' },
  { key: 'works', label: 'Obras' },
  { key: 'events', label: 'Acontecimentos' },
  { key: 'organizations', label: 'Organizações' },
];

/** The group of a record kind; anything that is not a person, work or event is an organization. */
export function chronologyGroupOf(kind: string): ChronologyGroup {
  if (kind === 'person') return 'people';
  if (kind === 'work' || kind === 'article') return 'works';
  if (kind === 'event') return 'events';
  return 'organizations';
}

const kindLabels: Record<Entity['kind'], string> = {
  person: 'Pessoa',
  ideology: 'Corrente ideológica',
  concept: 'Conceito',
  work: 'Obra',
  event: 'Acontecimento',
  'historical-polity': 'Formação política histórica',
  place: 'Território',
  party: 'Partido',
  institution: 'Organização',
  government: 'Governo',
  policy: 'Política pública',
  article: 'Artigo',
};

export function entityKindLabel(kind: Entity['kind'], placeType?: PlaceType): string {
  if (kind === 'place')
    return placeType === 'country' ? 'País' : placeType === 'regime' ? 'Regime' : 'Território';
  return kindLabels[kind];
}

export interface ChronologyItem {
  id: string;
  title: string;
  kind: string;
  /** Singular name of the kind, for lists and accessible names. */
  kindLabel: string;
  /** First recorded year; when only an end year exists both are the same. */
  start: number;
  end: number;
  approximate: boolean;
}

/** An entity as a dated chronology record, or null when it has no year to stand on. */
export function chronologyItemOf(entity: Entity): ChronologyItem | null {
  const extent = entity.temporalExtent;
  const first = extent?.startYear ?? extent?.endYear;
  const last = extent?.endYear ?? extent?.startYear;
  if (!extent || first == null || last == null) return null;
  return {
    id: entity.id,
    title: entity.title,
    kind: entity.kind,
    kindLabel: entityKindLabel(entity.kind, placeTypeOf(entity)),
    start: Math.min(first, last),
    end: Math.max(first, last),
    approximate: extent.precision === 'approximate',
  };
}
