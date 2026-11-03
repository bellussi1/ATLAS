import type { Entity } from '@core/content/models/content-schema';

import type { TimelineAxisItem } from './timeline-axis-layout';

const kindLabels: Record<Entity['kind'], string> = {
  person: 'Pessoa',
  ideology: 'Corrente ideológica',
  concept: 'Conceito',
  work: 'Obra',
  event: 'Acontecimento',
  'historical-polity': 'Formação política histórica',
  country: 'País',
  regime: 'Regime',
  place: 'Território',
  party: 'Partido',
  institution: 'Organização',
  government: 'Governo',
  policy: 'Política pública',
  article: 'Artigo',
};

export function entityKindLabel(kind: Entity['kind']): string {
  return kindLabels[kind];
}

/** An entity as an axis record, or null when it has no year to stand on. */
export function axisItemOf(entity: Entity): TimelineAxisItem | null {
  const extent = entity.temporalExtent;
  const first = extent?.startYear ?? extent?.endYear;
  const last = extent?.endYear ?? extent?.startYear;
  if (!extent || first == null || last == null) return null;
  return {
    id: entity.id,
    title: entity.title,
    kind: entity.kind,
    kindLabel: entityKindLabel(entity.kind),
    start: Math.min(first, last),
    end: Math.max(first, last),
    approximate: extent.precision === 'approximate',
  };
}
