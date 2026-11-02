import { Component, computed, input } from '@angular/core';
import type { PositionClaim } from '@ideologies/models/ideology-page.schema';
import { positionAxis, type PositionAxisId } from '@ideologies/models/position-axes';
import {
  type AxisEstimate,
  estimateEntity,
  largestPairDifference,
} from '@ideologies/utils/positions';

/** Estimated positions on analytic axes, drawn from attributed and sourced claims. */
@Component({
  selector: 'app-positions-estimate',
  templateUrl: './positions-estimate.component.html',
  styleUrl: './positions-estimate.component.scss',
})
export class PositionsEstimateComponent {
  readonly entities = input.required<readonly { id: string; title: string }[]>();
  readonly claims = input.required<readonly PositionClaim[]>();

  readonly rows = computed(() =>
    this.entities().map((entity) => ({
      id: entity.id,
      title: entity.title,
      axes: estimateEntity(this.claims(), entity.id),
    })),
  );

  readonly summary = computed(() => {
    const pair = largestPairDifference(this.rows());
    if (!pair) return null;
    const titles = Object.fromEntries(this.entities().map((e) => [e.id, e.title]));
    return {
      axis: positionAxis(pair.axisId).label,
      first: titles[pair.first],
      second: titles[pair.second],
      difference: format(pair.difference),
    };
  });

  axisLabel(id: PositionAxisId): string {
    return positionAxis(id).label;
  }

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

  describe(title: string, axis: AxisEstimate): string {
    return `${title}, ${this.axisLabel(axis.axisId)}: ${this.statusText(axis)}`;
  }
}

function format(value: number | null): string {
  return value === null ? '' : value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}
