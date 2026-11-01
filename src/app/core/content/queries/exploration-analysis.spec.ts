import { contentFixture } from '@testing/content-fixture';

import {
  analysisComparisonIds,
  analysisSelection,
  parseAnalysisFilters,
  selectAnalysisGraph,
} from './exploration-analysis';

describe('network and comparison shared filters', () => {
  const graph = contentFixture.graph;
  const filter = (values: Record<string, string> = {}) =>
    parseAnalysisFilters(new URLSearchParams(values));
  it('uses identical collection/type/relation filters and preserves graph records', () => {
    const result = selectAnalysisGraph(graph, filter({ tipo: 'person', relacao: 'influenced_by' }));
    expect(result.entities.length).toBeGreaterThan(0);
    expect(result.entities.every((e) => e.kind === 'person')).toBe(true);
    expect(result.relations.every((r) => r.type === 'influenced_by')).toBe(true);
    const ids = new Set(result.entities.map((e) => e.id));
    expect(result.relations.every((r) => ids.has(r.fromEntityId) && ids.has(r.toEntityId))).toBe(
      true,
    );
    expect(selectAnalysisGraph(graph, filter({ colecao: 'missing' })).entities).toEqual([]);
  });
  it('does not invent an open-ended duration for single-date records', () => {
    const result = selectAnalysisGraph(graph, filter({ de: '1900', semData: 'nao' }));
    expect(result.entities.some((e) => e.id === 'work-communist-manifesto')).toBe(false);
    expect(result.entities.some((e) => e.id === 'person-karl-marx')).toBe(false);
    expect(result.entities.some((e) => e.id === 'person-rosa-luxemburg')).toBe(true);
  });
  it('keeps undated entries explicit and rejects malformed periods', () => {
    expect(
      selectAnalysisGraph(graph, filter({ de: '1900' })).entities.some((e) => !e.temporalExtent),
    ).toBe(true);
    const invalid: Record<string, string>[] = [
      { de: '1900', ate: '1800' },
      { de: 'oops' },
      { ate: '1988.5' },
    ];
    for (const values of invalid) {
      const filters = filter(values);
      expect(filters.error).toBeTruthy();
      expect(selectAnalysisGraph(graph, filters).entities).toEqual([]);
    }
  });
  it('does not silently replace filtered or unknown comparison selections', () => {
    const entries = selectAnalysisGraph(graph, filter()).entities;
    expect(analysisSelection(entries, 'missing')).toBeUndefined();
    expect(analysisSelection(entries, null)).toBe(entries[0]);
    const onlyPeople = selectAnalysisGraph(graph, filter({ tipo: 'person' })).entities;
    expect(analysisSelection(onlyPeople, 'work-capital-volume-i')).toBeUndefined();
    const preferred = ['concept-trabalho-socialmente-necessario', 'concept-historical-materialism'];
    const pair = analysisComparisonIds(entries, preferred[1], null, preferred);
    expect(pair[0]).toBe(preferred[1]);
    expect(pair[1]).not.toBe(pair[0]);
    expect(analysisComparisonIds(entries, preferred[0], preferred[0], preferred)).toEqual([
      preferred[0],
      preferred[0],
    ]);
  });
});
