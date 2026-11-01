import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { entityContext } from '@core/content/queries/entity-context';
import {
  analysisComparisonIds,
  analysisFilterKeys,
  analysisSelection,
  parseAnalysisFilters,
  selectAnalysisGraph,
} from '@core/content/queries/exploration-analysis';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { AnalysisFiltersComponent } from '@exploration/components/analysis-filters/analysis-filters.component';
import { KnowledgeNetworkComponent } from '@exploration/components/knowledge-network/knowledge-network.component';
import { RelationEvidenceComponent } from '@exploration/components/relation-evidence/relation-evidence.component';
import { AtlasClaimReferencesComponent } from '@shared/ui/claim-references/claim-references.component';
import { KnowledgeTimelineComponent } from '@shared/ui/knowledge-timeline/knowledge-timeline.component';

@Component({
  selector: 'app-analysis',
  imports: [
    RouterLink,
    AnalysisFiltersComponent,
    KnowledgeNetworkComponent,
    RelationEvidenceComponent,
    AtlasClaimReferencesComponent,
    KnowledgeTimelineComponent,
  ],
  templateUrl: './analysis.component.html',
  styleUrl: './analysis.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysisComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly repository = inject(ContentRepository);
  readonly graph = this.repository.knowledgeGraph;
  readonly network = this.route.snapshot.data['analysis'] === 'network';
  readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly filters = computed(() => parseAnalysisFilters(this.params()));
  readonly filtered = computed(() => selectAnalysisGraph(this.graph, this.filters()));
  readonly sharedQuery = computed(() =>
    Object.fromEntries(
      analysisFilterKeys.flatMap((key) =>
        this.params().has(key) ? [[key, this.params().get(key)]] : [],
      ),
    ),
  );
  readonly geometry = computed(() => {
    const key = this.filters().collection || 'all';
    const selected = this.selected();
    return this.repository.layouts.exploration.networks[
      selected ? `focus:${key}:${selected.id}` : key
    ];
  });
  readonly activeFilterCount = computed(
    () => analysisFilterKeys.filter((key) => this.params().has(key)).length,
  );
  readonly selectedEntry = computed(() =>
    this.repository.discoveryIndex.find((entry) => entry.id === this.selected()?.id),
  );
  readonly timeline = this.repository.layouts.exploration.timeline;
  readonly mode = computed(() => this.params().get('modo') ?? 'conceitual');
  readonly validMode = computed(() => ['historica', 'conceitual'].includes(this.mode()));
  readonly selected = computed(() =>
    analysisSelection(
      this.filtered().entities,
      this.params().get('no'),
      Math.max(
        0,
        this.filtered().entities.findIndex((e) => e.id === 'person-karl-marx'),
      ),
    ),
  );
  readonly connections = computed(() =>
    this.filtered().relations.filter(
      (r) => r.fromEntityId === this.selected()?.id || r.toEntityId === this.selected()?.id,
    ),
  );
  readonly slots = computed(() =>
    ['esquerda', 'direita'].map((key, index) => {
      const preferred =
        this.mode() === 'historica'
          ? ['event-french-revolution', 'event-russian-revolution']
          : ['concept-trabalho-socialmente-necessario', 'concept-historical-materialism'];
      const entries = this.filtered().entities;
      const ids = analysisComparisonIds(
        entries,
        this.params().get('esquerda'),
        this.params().get('direita'),
        preferred,
      );
      const id = ids[index];
      const entity = analysisSelection(entries, id);
      return {
        key,
        id,
        entity,
        context: entity ? entityContext(this.repository, entity.id) : undefined,
        entry: this.repository.discoveryIndex.find((e) => e.id === id),
        claims: entity
          ? this.graph.atlases.flatMap((atlas) =>
              atlas.claims
                .filter((c) => c.entityId === entity.id)
                .map((claim) => ({ claim, atlas })),
            )
          : [],
      };
    }),
  );
  readonly compared = computed(() => this.slots().flatMap((s) => (s.entity ? [s.entity] : [])));
  readonly validPair = computed(
    () => this.compared().length === 2 && this.compared()[0].id !== this.compared()[1].id,
  );
  readonly directRelations = computed(() =>
    this.validPair()
      ? this.filtered().relations.filter(
          (r) =>
            this.compared().some((e) => e.id === r.fromEntityId) &&
            this.compared().some((e) => e.id === r.toEntityId),
        )
      : [],
  );
  readonly commonSources = computed(() => {
    if (!this.validPair()) return [];
    const [a, b] = this.slots();
    return (a.context?.sources ?? []).filter(
      (s) => s.id !== 'context-origin' && b.context?.sources.some((other) => other.id === s.id),
    );
  });
  update(values: Record<string, string | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: values,
      queryParamsHandling: 'merge',
      scroll: 'manual',
    });
  }
  swap(): void {
    const [left, right] = this.slots();
    this.update({ esquerda: right.id, direita: left.id });
  }

  clear(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }
  relatedEntity(id: string) {
    return this.filtered().entities.find((entity) => entity.id === id);
  }
  comparisonQuery(id: string) {
    return { ...this.sharedQuery(), esquerda: id };
  }
  setSlot(key: string, value: string): void {
    this.update({ [key]: value });
  }
  preset(mode: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams:
        mode === 'historica'
          ? { modo: mode, esquerda: 'event-french-revolution', direita: 'event-russian-revolution' }
          : {
              modo: mode,
              esquerda: 'concept-trabalho-socialmente-necessario',
              direita: 'concept-historical-materialism',
            },
    });
  }
}
