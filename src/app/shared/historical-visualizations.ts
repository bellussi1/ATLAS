import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ContentRepository } from '../core/content-repository';
import type { Atlas, KnowledgeGraph, Source } from '../core/content-schema';
import { AtlasEditorialLinkDirective } from './ui-primitives';

interface HistoricalSource {
  id: string;
  title: string;
}
export interface HistoricalRecord {
  id: string;
  slug: string;
  title: string;
  kind: string;
  kindLabel: string;
  summary: string;
  context: string;
  startYear: number | null;
  endYear: number | null;
  precision: string;
  periodLabel: string;
  uncertainty: string;
  sources: HistoricalSource[];
}

const kindLabels: Record<string, string> = {
  person: 'Pessoa',
  ideology: 'Ideia',
  concept: 'Conceito',
  work: 'Obra',
  event: 'Evento',
  'historical-polity': 'Formação política histórica',
  place: 'Lugar',
  party: 'Partido',
  institution: 'Instituição',
  government: 'Governo',
  policy: 'Política pública',
  article: 'Artigo',
};

function sourcesForEntity(atlas: Atlas, entityId: string): HistoricalSource[] {
  const sources = new Map(atlas.sources.map((source: Source) => [source.id, source]));
  const evidenceIds = new Set([
    ...atlas.claims
      .filter((claim) => claim.entityId === entityId)
      .flatMap((claim) => claim.citationIds)
      .flatMap(
        (citationId) =>
          atlas.citations.find((citation) => citation.id === citationId)?.evidenceId ?? [],
      ),
    ...atlas.relations
      .filter((relation) => relation.fromEntityId === entityId || relation.toEntityId === entityId)
      .flatMap((relation) => relation.evidenceIds),
  ]);
  const sourceIds = new Set(
    [...evidenceIds].flatMap(
      (evidenceId) =>
        atlas.evidences.find((evidence) => evidence.id === evidenceId)?.sourceId ?? [],
    ),
  );
  return [...sourceIds].flatMap((sourceId) => {
    const source = sources.get(sourceId);
    return source ? [{ id: source.id, title: source.title }] : [];
  });
}

export function buildHistoricalRecords(graph: KnowledgeGraph): HistoricalRecord[] {
  return graph.atlases.flatMap((atlas) =>
    atlas.entities
      .map((entity) => ({
        id: entity.id,
        slug: entity.slug,
        title: entity.title,
        kind: entity.kind,
        kindLabel: kindLabels[entity.kind] ?? 'Registro',
        summary: entity.summary,
        context: entity.context,
        startYear: entity.temporalExtent?.startYear ?? null,
        endYear: entity.temporalExtent?.endYear ?? null,
        precision: entity.temporalExtent?.precision ?? 'unknown',
        periodLabel: entity.temporalExtent?.label ?? 'Período não informado',
        uncertainty: entity.uncertainty,
        sources: sourcesForEntity(atlas, entity.id),
      }))
      .filter((entity) => entity.startYear !== null || entity.endYear !== null),
  );
}

@Component({
  selector: 'app-historical-visualizations',
  imports: [RouterLink, AtlasEditorialLinkDirective],
  templateUrl: './historical-visualizations.html',
  styleUrl: './historical-visualizations.scss',
})
export class AtlasHistoricalVisualizationsComponent {
  private readonly repository = inject(ContentRepository);
  readonly records = buildHistoricalRecords(this.repository.knowledgeGraph);
  readonly kinds = [
    ...new Map(this.records.map((record) => [record.kind, record.kindLabel])).entries(),
  ].map(([value, label]) => ({ value, label }));
  readonly kind = signal('');
  readonly selectedTimelineId = signal(this.records[0]?.id ?? '');
  readonly timelineRecords = computed(() =>
    this.records
      .filter((record) => !this.kind() || record.kind === this.kind())
      .sort(
        (a, b) =>
          (a.startYear ?? a.endYear ?? 0) - (b.startYear ?? b.endYear ?? 0) ||
          a.title.localeCompare(b.title, 'pt-BR'),
      ),
  );
  readonly selectedTimeline = computed<HistoricalRecord | undefined>(
    () =>
      this.timelineRecords().find((record) => record.id === this.selectedTimelineId()) ??
      this.timelineRecords()[0] ??
      undefined,
  );
  readonly comparisonIds = signal(this.records.slice(0, 2).map((record) => record.id));
  readonly comparedRecords = computed(() =>
    this.comparisonIds().flatMap((id) => {
      const record = this.records.find((item) => item.id === id);
      return record ? [record] : [];
    }),
  );
  readonly knownYears = this.records.flatMap((record) =>
    [record.startYear, record.endYear].filter((year): year is number => year !== null),
  );
  readonly minimumYear = this.knownYears.length ? Math.min(...this.knownYears) : 0;
  readonly maximumYear = this.knownYears.length ? Math.max(...this.knownYears) : 0;
  readonly yearTicks = [this.minimumYear, 1987, 1988, this.maximumYear].filter(
    (year, index, years) => years.indexOf(year) === index,
  );

  position(year: number | null): number {
    if (year === null || this.maximumYear === this.minimumYear) return 0;
    return ((year - this.minimumYear) / (this.maximumYear - this.minimumYear)) * 100;
  }

  periodWidth(record: HistoricalRecord): number {
    if (record.startYear === null || record.endYear === null) return 0;
    return Math.max(1.25, this.position(record.endYear) - this.position(record.startYear));
  }

  selectKind(value: string): void {
    this.kind.set(value);
    if (!this.timelineRecords().some((record) => record.id === this.selectedTimelineId())) {
      this.selectedTimelineId.set(this.timelineRecords()[0]?.id ?? '');
    }
  }

  toggleComparison(id: string): void {
    this.comparisonIds.update((selected) =>
      selected.includes(id)
        ? selected.filter((item) => item !== id)
        : selected.length < 3
          ? [...selected, id]
          : selected,
    );
  }

  comparisonSelected(id: string): boolean {
    return this.comparisonIds().includes(id);
  }
  comparisonLimitReached(): boolean {
    return this.comparisonIds().length >= 3;
  }
  sourcePath(): string {
    return '/fontes';
  }
  sourceFragment(sourceId: string): string {
    return `source-${sourceId}`;
  }
  entityPath(record: HistoricalRecord): string {
    return `/verbete/${record.slug}`;
  }
  precisionLabel(precision: string): string {
    return (
      (
        {
          year: 'Ano',
          approximate: 'Aproximado',
          range: 'Intervalo',
          unknown: 'Não informada',
        } as Record<string, string>
      )[precision] ?? precision
    );
  }
  uncertaintyLabel(uncertainty: string): string {
    return (
      (
        { low: 'Baixa', moderate: 'Moderada', high: 'Alta', unknown: 'Não informada' } as Record<
          string,
          string
        >
      )[uncertainty] ?? uncertainty
    );
  }
}
