import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { editorialStatusLabel } from '@core/content/editorial/editorial-status';
import type { KnowledgeGraph, Relation } from '@core/content/models/content-schema';

@Component({
  selector: 'app-relation-evidence',
  imports: [RouterLink],
  templateUrl: './relation-evidence.component.html',
  styleUrl: './relation-evidence.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RelationEvidenceComponent {
  readonly graph = input.required<KnowledgeGraph>();
  readonly relation = input.required<Relation>();
  readonly from = computed(() =>
    this.graph()
      .atlases.flatMap((a) => a.entities)
      .find((e) => e.id === this.relation().fromEntityId)!,
  );
  readonly to = computed(() =>
    this.graph()
      .atlases.flatMap((a) => a.entities)
      .find((e) => e.id === this.relation().toEntityId)!,
  );
  readonly references = computed(() =>
    this.relation().evidenceIds.flatMap((id) => {
      const evidence = this.graph()
        .atlases.flatMap((a) => a.evidences)
        .find((e) => e.id === id);
      const source = this.graph()
        .atlases.flatMap((a) => a.sources)
        .find((s) => s.id === evidence?.sourceId);
      return evidence && source ? [{ evidence, source }] : [];
    }),
  );
  readonly status = editorialStatusLabel;
  readonly uncertainty: Record<string, string> = {
    low: 'baixa',
    moderate: 'moderada',
    high: 'alta',
    unknown: 'não determinada',
  };
}
