import type { Entity, KnowledgeGraph } from '@core/content/models/content-schema';

export const analysisFilterKeys = ['colecao', 'tipo', 'relacao', 'de', 'ate', 'semData'] as const;
export interface AnalysisFilters {
  collection: string;
  kind: string;
  relation: string;
  from: string;
  to: string;
  includeUndated: boolean;
  error?: string;
}
export function parseAnalysisFilters(params: { get(key: string): string | null }): AnalysisFilters {
  const from = params.get('de') ?? '';
  const to = params.get('ate') ?? '';
  const validYear = (year: string) =>
    !year ||
    (/^-?\d+$/.test(year) &&
      Number.isSafeInteger(Number(year)) &&
      Math.abs(Number(year)) <= 100000);
  return {
    collection: params.get('colecao') ?? '',
    kind: params.get('tipo') ?? '',
    relation: params.get('relacao') ?? '',
    from,
    to,
    includeUndated: params.get('semData') !== 'nao',
    error:
      !validYear(from) || !validYear(to)
        ? 'Informe anos inteiros entre −100000 e 100000.'
        : from && to && Number(from) > Number(to)
          ? 'O ano inicial deve ser anterior ou igual ao ano final.'
          : undefined,
  };
}
export function selectAnalysisGraph(graph: KnowledgeGraph, filters: AnalysisFilters) {
  let entities = filters.error
    ? []
    : graph.atlases
        .filter((a) => !filters.collection || a.id === filters.collection)
        .flatMap((a) => a.entities)
        .filter((e) => !filters.kind || e.kind === filters.kind)
        .filter((e) => {
          const years = [e.temporalExtent?.startYear, e.temporalExtent?.endYear].filter(
            (y): y is number => y != null,
          );
          if (!years.length) return filters.includeUndated;
          return (
            (!filters.from || Math.max(...years) >= Number(filters.from)) &&
            (!filters.to || Math.min(...years) <= Number(filters.to))
          );
        });
  const ids = new Set(entities.map((e) => e.id));
  const relations = graph.atlases
    .flatMap((a) => a.relations)
    .filter(
      (r) =>
        (!filters.relation || r.type === filters.relation) &&
        ids.has(r.fromEntityId) &&
        ids.has(r.toEntityId),
    );
  if (filters.relation) {
    const connected = new Set(relations.flatMap((r) => [r.fromEntityId, r.toEntityId]));
    entities = entities.filter((e) => connected.has(e.id));
  }
  return { entities, relations };
}
export function analysisSelection(entities: readonly Entity[], id: string | null, fallback = 0) {
  return id === null ? entities[fallback] : entities.find((e) => e.id === id);
}

export function analysisComparisonIds(
  entities: readonly Entity[],
  left: string | null,
  right: string | null,
  preferred: readonly string[],
): string[] {
  const first =
    left ??
    (
      entities.find((e) => e.id === preferred[0] && e.id !== right) ??
      entities.find((e) => e.id !== right)
    )?.id ??
    '';
  const second =
    right ??
    (
      entities.find((e) => e.id === preferred[1] && e.id !== first) ??
      entities.find((e) => e.id !== first)
    )?.id ??
    '';
  return [first, second];
}
