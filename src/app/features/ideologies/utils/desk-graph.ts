import { type Atlas, type PlaceType, placeTypeOf } from '@core/content/models/content-schema';
import { type IconKind, iconKind } from '@shared/ui/kind-icon/kind-icon.component';

export type DeskKind = Atlas['entities'][number]['kind'];

export interface DeskEntity {
  id: string;
  slug: string;
  title: string;
  kind: DeskKind;
  placeType?: PlaceType;
  summary: string;
  start: number | null;
  end: number | null;
  period: string;
  /** Glyph family; a person tied to a party or government reads as a politician. */
  icon: IconKind;
  /** Number of documented relations to other records of the tradition. */
  links: number;
}

export interface DeskLink {
  relationId: string;
  otherId: string;
  label: string;
  context: string;
  period: string;
}

export interface DeskQuery {
  text: string;
  kind: DeskKind | null;
  /** First year of the selected era bucket. */
  era: number | null;
}

export const ERA_SPAN = 25;

export const deskKindLabels: Partial<Record<DeskKind, string>> = {
  person: 'Pessoa',
  work: 'Obra',
  concept: 'Conceito',
  event: 'Acontecimento',
  ideology: 'Corrente',
  institution: 'Instituição',
  party: 'Partido',
  place: 'Lugar',
};

export const kindLabel = (kind: DeskKind, placeType?: PlaceType) => {
  if (kind === 'place')
    return placeType === 'country' ? 'País' : placeType === 'regime' ? 'Regime' : 'Lugar';
  return deskKindLabels[kind] ?? 'Registro';
};

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

function period(
  extent: { startYear: number | null; endYear: number | null; label?: string | null } | null,
) {
  if (!extent) return '';
  if (extent.label) return extent.label;
  if (extent.startYear === null) return '';
  return extent.endYear && extent.endYear !== extent.startYear
    ? `${extent.startYear}–${extent.endYear}`
    : `${extent.startYear}`;
}

export function deskEntities(atlas: Atlas | undefined): DeskEntity[] {
  const entities = atlas?.entities ?? [];
  const kindOf = new Map(entities.map((e) => [e.id, e.kind]));
  const neighbours = new Map<string, string[]>();
  for (const r of atlas?.relations ?? []) {
    if (!kindOf.has(r.fromEntityId) || !kindOf.has(r.toEntityId)) continue;
    neighbours.set(r.fromEntityId, [...(neighbours.get(r.fromEntityId) ?? []), r.toEntityId]);
    neighbours.set(r.toEntityId, [...(neighbours.get(r.toEntityId) ?? []), r.fromEntityId]);
  }
  const political = (id: string) =>
    (neighbours.get(id) ?? []).some((other) =>
      ['party', 'government'].includes(kindOf.get(other)!),
    );
  return entities
    .map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      kind: e.kind,
      placeType: placeTypeOf(e),
      summary: e.summary,
      start: e.temporalExtent?.startYear ?? null,
      end: e.temporalExtent?.endYear ?? null,
      period: period(e.temporalExtent),
      icon:
        e.kind === 'person' && political(e.id) ? 'politician' : iconKind(e.kind, placeTypeOf(e)),
      links: neighbours.get(e.id)?.length ?? 0,
    }))
    .sort((a, b) => (a.start ?? 9999) - (b.start ?? 9999) || a.title.localeCompare(b.title));
}

export function eraOf(entity: DeskEntity): number | null {
  return entity.start === null ? null : Math.floor(entity.start / ERA_SPAN) * ERA_SPAN;
}

export function filterDesk(entities: readonly DeskEntity[], query: DeskQuery): DeskEntity[] {
  const text = normalize(query.text);
  return entities.filter(
    (e) =>
      (!query.kind || e.kind === query.kind) &&
      (query.era === null || eraOf(e) === query.era) &&
      (!text || normalize(`${e.title} ${e.summary}`).includes(text)),
  );
}

/** Counts per kind, so filter chips can show what each one keeps. */
/** Dated entities grouped in fixed spans, from the earliest to the latest bucket. */
export function eraBuckets(entities: readonly DeskEntity[]): { start: number; count: number }[] {
  const eras = entities.flatMap((e) => eraOf(e) ?? []);
  if (!eras.length) return [];
  const first = Math.min(...eras);
  const last = Math.max(...eras);
  const buckets: { start: number; count: number }[] = [];
  for (let start = first; start <= last; start += ERA_SPAN)
    buckets.push({ start, count: eras.filter((era) => era === start).length });
  return buckets;
}

/** Relations of one entity, read from its side: incoming ones use the reverse label. */
export function deskLinks(atlas: Atlas | undefined, id: string): DeskLink[] {
  const known = new Set(atlas?.entities.map((e) => e.id));
  return (atlas?.relations ?? []).flatMap((r) => {
    const outgoing = r.fromEntityId === id;
    if (!outgoing && r.toEntityId !== id) return [];
    const otherId = outgoing ? r.toEntityId : r.fromEntityId;
    if (!known.has(otherId) || otherId === id) return [];
    return [
      {
        relationId: r.id,
        otherId,
        label: outgoing ? r.label : r.reverseLabel,
        context: r.context,
        period: period(r.temporalExtent),
      },
    ];
  });
}

/** The relation that joined two consecutive steps of a chain, if any. */
/** Keeps only known ids, without repeats, so a shared URL cannot build a broken chain. */
export function parseChain(value: string | null, entities: readonly DeskEntity[]): string[] {
  const known = new Set(entities.map((e) => e.id));
  return [...new Set((value ?? '').split(',').filter((id) => known.has(id)))];
}
