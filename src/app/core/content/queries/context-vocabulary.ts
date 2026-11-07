import type { Entity, KnowledgeGraph } from '@core/content/models/content-schema';

/** One explorable word inside a context sheet, always backed by a graph record. */
export interface ContextTerm {
  label: string;
  entityId: string;
  kind: string;
  definition: string;
}

/** Labels shorter than this are too ambiguous to link automatically. */
const MIN_LABEL = 4;
const MAX_DEFINITION = 170;

/**
 * Short forms readers actually use, mapped to a record. They are explicit because an alias
 * such as "Marx" may be attached to more than one record by the importer; the curated label
 * resolves the ambiguity instead of silently picking one.
 */
const CURATED_LABELS: Readonly<Record<string, { label: string; entityId: string }>> = {
  classe: { label: 'classe', entityId: 'wiki-topic-classe-social' },
  bakunin: { label: 'Bakunin', entityId: 'wiki-topic-mikhail-bakunin' },
  kropotkin: { label: 'Kropotkin', entityId: 'wiki-topic-piotr-kropotkin' },
  marx: { label: 'Marx', entityId: 'person-karl-marx' },
  engels: { label: 'Engels', entityId: 'person-friedrich-engels' },
  weber: { label: 'Weber', entityId: 'wiki-topic-max-weber' },
};

const KIND_LABELS: Readonly<Record<string, string>> = {
  person: 'Pensador',
  ideology: 'Ideologia',
  concept: 'Conceito',
  event: 'Acontecimento',
  institution: 'Instituição',
  place: 'Lugar',
  work: 'Obra',
  party: 'Partido',
  government: 'Governo',
  'historical-polity': 'Formação política histórica',
  policy: 'Política pública',
  article: 'Artigo',
};

const normalize = (value: string): string =>
  value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR').trim();

/** Cuts a summary at a word boundary so the hover explanation stays one short line. */
export function shortDefinition(summary: string, max = MAX_DEFINITION): string {
  const text = summary.trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '')}…`;
}

function kindLabel(entity: Entity): string {
  if (entity.kind === 'place' && entity.placeType === 'country') return 'País';
  if (entity.kind === 'place' && entity.placeType === 'regime') return 'Regime';
  return KIND_LABELS[entity.kind] ?? 'Verbete';
}

/**
 * Words that can open another sheet from inside the current one. A label is used only when it
 * points to one record; collisions are dropped unless a curated short form resolves them.
 */
export function contextVocabulary(graph: KnowledgeGraph, excludeEntityId?: string): ContextTerm[] {
  const entities = graph.atlases.flatMap((atlas) => atlas.entities);
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  const labels = new Map<string, { label: string; ids: Set<string> }>();
  const titles = new Map<string, Set<string>>();
  const add = (label: string, entityId: string, title = false) => {
    const key = normalize(label);
    if (key.length < MIN_LABEL) return;
    const entry = labels.get(key) ?? { label, ids: new Set<string>() };
    entry.ids.add(entityId);
    labels.set(key, entry);
    if (title) {
      const owners = titles.get(key) ?? new Set<string>();
      owners.add(entityId);
      titles.set(key, owners);
    }
  };
  for (const entity of entities) {
    add(entity.title, entity.id, true);
    for (const alias of entity.aliases) add(alias, entity.id);
  }
  for (const { label, entityId } of Object.values(CURATED_LABELS)) {
    if (!byId.has(entityId)) continue;
    labels.set(normalize(label), { label, ids: new Set([entityId]) });
  }
  return [...labels.values()]
    .flatMap(({ label, ids }) => {
      const key = normalize(label);
      const titleOwners = titles.get(key);
      // An alias can be imported onto another record; a unique title resolves the collision.
      const entityId =
        ids.size === 1 ? [...ids][0] : titleOwners?.size === 1 ? [...titleOwners][0] : undefined;
      if (!entityId || entityId === excludeEntityId) return [];
      const entity = byId.get(entityId);
      return entity
        ? [
            {
              label,
              entityId,
              kind: kindLabel(entity),
              definition: shortDefinition(entity.summary),
            },
          ]
        : [];
    })
    .sort((a, b) => b.label.length - a.label.length);
}
