import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AtlasEvidenceNetworkComponent } from '../shared/evidence-network';
import { ContentRepository } from '../core/content-repository';
import { filterDiscoveryIndex } from '../core/discovery-index';
import { AtlasDiscoveryPreviewDirective } from '../shared/discovery-preview';
import { AtlasEditorialLinkDirective, AtlasNoticeComponent, AtlasTextFieldComponent } from '../shared/ui-primitives';
import { AtlasHistoricalVisualizationsComponent } from '../shared/historical-visualizations';

@Component({
  selector: 'app-exploration-page',
  imports: [RouterLink, AtlasEditorialLinkDirective, AtlasNoticeComponent, AtlasTextFieldComponent, AtlasEvidenceNetworkComponent, AtlasDiscoveryPreviewDirective, AtlasHistoricalVisualizationsComponent],
  templateUrl: './exploration-page.html',
  styleUrl: './exploration-page.scss',
})
export class ExplorationPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly data = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly mode = computed(() => this.data()['mode'] as string);
  readonly query = computed(() => this.params().get('q') ?? '');
  readonly kind = computed(() => this.params().get('tipo') ?? '');
  readonly state = computed(() => this.params().get('estado') ?? '');
  readonly discoveryIndex = inject(ContentRepository).discoveryIndex;
  readonly kinds = computed(() => [...new Map(this.discoveryIndex.map((entry) => [entry.kind, entry.kindLabel])).entries()]
    .map(([value, label]) => ({ value, label })));
  readonly states = computed(() => [...new Map(this.discoveryIndex.map((entry) => [entry.state, entry.stateLabel])).entries()]
    .map(([value, label]) => ({ value, label })));
  readonly results = computed(() => filterDiscoveryIndex(this.discoveryIndex, {
    query: this.query(), kind: this.kind(), state: this.state(),
  }));
  readonly returnContext = computed(() => this.router.url);
  search(value: string): void { void this.router.navigate([], { relativeTo: this.route, queryParams: { q: value || null }, queryParamsHandling: 'merge', replaceUrl: true }); }
  filterByKind(value: string): void { void this.router.navigate([], { relativeTo: this.route, queryParams: { tipo: value || null }, queryParamsHandling: 'merge', replaceUrl: true }); }
  filterByState(value: string): void { void this.router.navigate([], { relativeTo: this.route, queryParams: { estado: value || null }, queryParamsHandling: 'merge', replaceUrl: true }); }
  clearFilters(): void { void this.router.navigate([], { relativeTo: this.route, queryParams: { q: null, tipo: null, estado: null }, replaceUrl: true }); }
}
