import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Entity, KnowledgeGraph } from '@core/content/models/content-schema';

@Component({
  selector: 'app-entity-profile',
  imports: [RouterLink],
  templateUrl: './entity-profile.component.html',
  styleUrl: './entity-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityProfileComponent {
  readonly entity = input.required<Entity>();
  readonly graph = input.required<KnowledgeGraph>();
  readonly evidenceIds = computed(() => {
    const entity = this.entity();
    return entity.kind === 'country'
      ? entity.countryProfile.evidenceIds
      : entity.kind === 'regime'
        ? [...new Set(entity.regimeProfile.classifications.flatMap((c) => c.evidenceIds))]
        : [];
  });
  readonly references = computed(() =>
    this.evidenceIds().flatMap((id) => {
      const evidence = this.graph()
        .atlases.flatMap((a) => a.evidences)
        .find((e) => e.id === id);
      const source = this.graph()
        .atlases.flatMap((a) => a.sources)
        .find((s) => s.id === evidence?.sourceId);
      return evidence && source ? [{ evidence, source }] : [];
    }),
  );
  readonly countries = computed(() => {
    const entity = this.entity();
    return entity.kind === 'regime'
      ? this.graph()
          .atlases.flatMap((a) => a.entities)
          .filter((e) => entity.regimeProfile.countryIds.includes(e.id))
      : [];
  });
}
