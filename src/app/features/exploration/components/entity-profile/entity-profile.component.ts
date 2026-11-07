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
    if (entity.kind !== 'place') return [];
    if (entity.countryProfile) return entity.countryProfile.evidenceIds;
    if (entity.regimeProfile)
      return [...new Set(entity.regimeProfile.classifications.flatMap((c) => c.evidenceIds))];
    return [];
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
    const profile = entity.kind === 'place' ? entity.regimeProfile : undefined;
    if (!profile) return [];
    return this.graph()
      .atlases.flatMap((a) => a.entities)
      .filter(
        (e) => e.kind === 'place' && e.placeType === 'country' && profile.countryIds.includes(e.id),
      );
  });
}
