import { Component, computed, input } from '@angular/core';
import type { PositionClaim } from '@ideologies/models/ideology-page.schema';
import { positionAxis, type PositionAxisId } from '@ideologies/models/position-axes';
import {
  type AxisEstimate,
  estimateEntity,
  largestPairDifference,
} from '@ideologies/utils/positions';
import { KnowledgeContextDirective } from '@shared/directives/knowledge-context/knowledge-context.directive';
import { RecordCardComponent } from '@shared/ui/record-card/record-card.component';

interface ClaimView {
  id: string;
  statement: string;
  meta: string;
}

interface AxisView {
  axis: AxisEstimate;
  label: string;
  poles: string;
  statusText: string;
  description: string;
  claims: ClaimView[];
}

interface EntityView {
  id: string;
  title: string;
  evidence: AxisView[];
  hidden: string[];
}

/**
 * Estimated positions on analytic axes. Each axis with evidence shows its value, its range
 * and the claims behind it; axes without evidence are listed once, never drawn as a point.
 */
@Component({
  selector: 'app-positions-estimate',
  imports: [RecordCardComponent, KnowledgeContextDirective],
  templateUrl: './positions-estimate.component.html',
  styleUrl: './positions-estimate.component.scss',
})
export class PositionsEstimateComponent {
  readonly entities = input.required<readonly { id: string; title: string }[]>();
  readonly claims = input.required<readonly PositionClaim[]>();
  /** Source records used by the claims, to show their titles next to each statement. */
  readonly sources = input<readonly { id: string; title: string }[]>([]);

  readonly rows = computed<EntityView[]>(() => {
    const titles = new Map(this.sources().map((source) => [source.id, source.title]));
    return this.entities().map((entity) => {
      const axes = estimateEntity(this.claims(), entity.id);
      const evidence = axes
        .filter((axis) => axis.status !== 'insuficiente')
        .map((axis) => ({
          axis,
          label: positionAxis(axis.axisId).label,
          poles: this.poles(axis.axisId),
          statusText: this.statusText(axis),
          description: `${entity.title}, ${positionAxis(axis.axisId).label}: ${this.statusText(axis)}`,
          claims: this.claims()
            .filter((claim) => claim.entityId === entity.id && claim.axisId === axis.axisId)
            .map((claim) => ({
              id: claim.id,
              statement: claim.statement,
              meta: [
                claim.classification,
                `confiança ${claim.confidence}`,
                `valor ${format(claim.value)}`,
                claim.sourceIds.map((id) => titles.get(id) ?? id).join('; '),
              ].join(' · '),
            })),
        }));
      const hidden = axes
        .filter((axis) => axis.status === 'insuficiente')
        .map((axis) => positionAxis(axis.axisId).label);
      return { id: entity.id, title: entity.title, evidence, hidden };
    });
  });

  readonly summary = computed(() => {
    const entityRows = this.rows();
    const pair = largestPairDifference(
      entityRows.map((row) => ({ id: row.id, axes: estimateEntity(this.claims(), row.id) })),
    );
    if (!pair) return null;
    const titles = new Map(this.entities().map((entity) => [entity.id, entity.title]));
    return {
      axis: positionAxis(pair.axisId).label,
      first: titles.get(pair.first),
      second: titles.get(pair.second),
      difference: format(pair.difference),
    };
  });

  poles(id: PositionAxisId): string {
    const axis = positionAxis(id);
    return `${axis.low} ↔ ${axis.high}`;
  }

  /** Percentage along the track, from the first pole (left) to the second (right). */
  pct(value: number | null): number {
    return value === null ? 0 : ((value + 1) / 2) * 100;
  }

  statusText(axis: AxisEstimate): string {
    switch (axis.status) {
      case 'insuficiente':
        return 'sem evidência suficiente';
      case 'indicativa':
        return `indicativa: ${axis.claims} ${axis.claims === 1 ? 'afirmação' : 'afirmações'}, ${axis.sources} ${axis.sources === 1 ? 'fonte' : 'fontes'}`;
      case 'divergente':
        return `fontes divergem: intervalo de ${format(axis.low)} a ${format(axis.high)}`;
      case 'estimada':
        return `estimada em ${format(axis.value)}, intervalo de ${format(axis.low)} a ${format(axis.high)}, ${axis.claims} afirmações, ${axis.sources} fontes`;
    }
  }
}

function format(value: number | null): string {
  return value === null ? '' : value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}
