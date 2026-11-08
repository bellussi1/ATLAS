import { Component, computed, input, signal, viewChild } from '@angular/core';
import type { PositionClaim } from '@ideologies/models/ideology-page.schema';
import { positionAxes, positionAxis, type PositionAxisId } from '@ideologies/models/position-axes';
import {
  axisDescription,
  type AxisEstimate,
  axisInterpretation,
  axisShortInterpretation,
  confidenceSummary,
  estimateEntity,
  largestPairDifference,
  statusLabel,
} from '@ideologies/utils/positions';
import { KnowledgeContextDirective } from '@shared/directives/knowledge-context/knowledge-context.directive';
import { CardCarouselComponent } from '@shared/ui/card-carousel/card-carousel.component';

/** A source as the position card needs it: title to read, link and edition to verify. */
export interface PositionSource {
  id: string;
  title: string;
  url?: string | null;
  edition?: string | null;
}

interface ClaimView {
  id: string;
  statement: string;
  classification: string;
  confidence: string;
  value: string;
  sources: PositionSource[];
}

interface AxisView {
  axis: AxisEstimate;
  label: string;
  shortLabel: string;
  poleLow: string;
  poleHigh: string;
  statusLabel: string;
  interpretation: string;
  shortInterpretation: string;
  confidence: string;
  description: string;
  claims: ClaimView[];
}

interface EntityView {
  id: string;
  title: string;
  evidence: AxisView[];
  hidden: string[];
  selected: AxisView | null;
}

/**
 * Estimated positions on analytic axes. Each card leads with the record and one selected
 * axis; other axes are one chip away, the claims stay behind a disclosure, and axes with
 * no sourced claim are listed without a value.
 */
@Component({
  selector: 'app-positions-estimate',
  imports: [KnowledgeContextDirective, CardCarouselComponent],
  templateUrl: './positions-estimate.component.html',
  styleUrl: './positions-estimate.component.scss',
})
export class PositionsEstimateComponent {
  readonly entities = input.required<readonly { id: string; title: string }[]>();
  readonly claims = input.required<readonly PositionClaim[]>();
  /** Source records used by the claims, shown as links next to each statement. */
  readonly sources = input<readonly PositionSource[]>([]);

  private readonly carousel = viewChild(CardCarouselComponent);
  /** Axis chosen on each card; null means the strongest axis for that record. */
  private readonly selectedAxes = signal<Record<string, PositionAxisId>>({});

  readonly rows = computed<EntityView[]>(() => {
    const sourceById = new Map(this.sources().map((source) => [source.id, source]));
    const selected = this.selectedAxes();
    return this.entities().map((entity) => {
      const axes = estimateEntity(this.claims(), entity.id);
      const evidence = axes
        .filter((axis) => axis.status !== 'insuficiente')
        .map((axis) => this.axisView(entity, axis, sourceById));
      const selectedId = selected[entity.id];
      const selectedAxis =
        evidence.find((item) => item.axis.axisId === selectedId) ?? this.primaryAxis(evidence);
      return {
        id: entity.id,
        title: entity.title,
        evidence,
        hidden: axes
          .filter((axis) => axis.status === 'insuficiente')
          .map((axis) => positionAxis(axis.axisId).label),
        selected: selectedAxis,
      };
    });
  });

  /** The two records that differ most on a shared axis, compared without a new selector. */
  readonly comparison = computed(() => {
    const rows = this.rows();
    const pair = largestPairDifference(
      rows.map((row) => ({ id: row.id, axes: row.evidence.map((item) => item.axis) })),
    );
    if (!pair) return null;
    const firstRow = rows.find((row) => row.id === pair.first);
    const secondRow = rows.find((row) => row.id === pair.second);
    const first = firstRow?.evidence.find((item) => item.axis.axisId === pair.axisId);
    const second = secondRow?.evidence.find((item) => item.axis.axisId === pair.axisId);
    if (!firstRow || !secondRow || !first || !second) return null;
    return {
      axis: positionAxis(pair.axisId),
      first: { row: firstRow, item: first },
      second: { row: secondRow, item: second },
    };
  });

  selectAxis(entityId: string, axisId: PositionAxisId): void {
    this.selectedAxes.update((current) => ({ ...current, [entityId]: axisId }));
  }

  /** Brings a record to the start of the carousel without leaving the page. */
  showCard(entityId: string): void {
    const index = this.rows().findIndex((row) => row.id === entityId);
    if (index >= 0) this.carousel()?.goTo(index);
  }

  /** Percentage along the track, from the first pole (left) to the second (right). */
  pct(value: number | null): number {
    return value === null ? 0 : ((value + 1) / 2) * 100;
  }

  private axisView(
    entity: { id: string; title: string },
    axis: AxisEstimate,
    sourceById: ReadonlyMap<string, PositionSource>,
  ): AxisView {
    const config = positionAxis(axis.axisId);
    const own = this.claims().filter(
      (claim) => claim.entityId === entity.id && claim.axisId === axis.axisId,
    );
    return {
      axis,
      label: config.label,
      shortLabel: config.short,
      poleLow: config.low,
      poleHigh: config.high,
      statusLabel: statusLabel(axis),
      interpretation: axisInterpretation(axis),
      shortInterpretation: axisShortInterpretation(axis),
      confidence: confidenceSummary(own),
      description: axisDescription(entity.title, axis),
      claims: own.map((claim) => this.claimView(claim, sourceById)),
    };
  }

  private claimView(
    claim: PositionClaim,
    sourceById: ReadonlyMap<string, PositionSource>,
  ): ClaimView {
    return {
      id: claim.id,
      statement: claim.statement,
      classification: claim.classification,
      confidence: claim.confidence,
      value: format(claim.value),
      sources: claim.sourceIds.map(
        (id) => sourceById.get(id) ?? { id, title: id, url: null, edition: null },
      ),
    };
  }

  /** The axis that carries the most information: widest interval, then most sources. */
  private primaryAxis(evidence: AxisView[]): AxisView | null {
    const order = (item: AxisView) =>
      positionAxes.findIndex((axis) => axis.id === item.axis.axisId);
    return (
      [...evidence].sort(
        (a, b) =>
          rangeOf(b.axis) - rangeOf(a.axis) ||
          b.axis.sources - a.axis.sources ||
          b.axis.claims - a.axis.claims ||
          order(a) - order(b),
      )[0] ?? null
    );
  }
}

function rangeOf(axis: AxisEstimate): number {
  return (axis.high ?? 0) - (axis.low ?? 0);
}

function format(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}
