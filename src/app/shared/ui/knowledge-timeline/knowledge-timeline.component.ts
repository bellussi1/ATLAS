import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Entity } from '@core/content/models/content-schema';
import type { ExplorationTimeline } from '@core/content/models/exploration-layout';

@Component({
  selector: 'app-knowledge-timeline',
  imports: [RouterLink],
  templateUrl: './knowledge-timeline.component.html',
  styleUrl: './knowledge-timeline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KnowledgeTimelineComponent {
  readonly entities = input.required<readonly Entity[]>();
  readonly layout = input.required<ExplorationTimeline>();
  readonly selectable = input(false);
  readonly selectedId = input<string>();
  readonly selected = output<string>();
  readonly precision: Record<string, string> = {
    year: 'ano registrado',
    range: 'intervalo registrado',
    approximate: 'data aproximada',
    unknown: 'data desconhecida',
  };
  readonly uncertainty: Record<string, string> = {
    low: 'baixa',
    moderate: 'moderada',
    high: 'alta',
    unknown: 'não determinada',
  };
}
