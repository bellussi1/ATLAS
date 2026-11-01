import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  explorerCatalogues,
  explorerEntries,
  explorerFacets,
} from '@core/content/queries/knowledge-explorer';
import { ContentRepository } from '@core/content/repositories/content-repository.service';

@Component({
  selector: 'app-explorer',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './explorer.component.html',
  styleUrl: './explorer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExplorerComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly repository = inject(ContentRepository);
  readonly catalogues = explorerCatalogues;
  readonly catalogue =
    explorerCatalogues.find((c) => c.path === this.route.snapshot.data['catalogue']) ??
    explorerCatalogues[0];
  readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly facets = explorerFacets(this.repository.discoveryIndex, this.catalogue.path);
  readonly results = computed(() =>
    explorerEntries(this.repository.discoveryIndex, {
      catalogue: this.catalogue.path,
      query: this.params().get('q') ?? '',
      kind: this.params().get('tipo') ?? '',
      state: this.params().get('estado') ?? '',
    }),
  );
  readonly origin = computed(() => '/' + this.catalogue.path + this.queryString());
  readonly unknownKind = computed(
    () =>
      !!this.params().get('tipo') &&
      !this.facets.kinds.some((f) => f.value === this.params().get('tipo')),
  );
  readonly unknownState = computed(
    () =>
      !!this.params().get('estado') &&
      !this.facets.states.some((f) => f.value === this.params().get('estado')),
  );
  sourceUrl(id: string): string | null {
    return (
      this.repository.knowledgeGraph.atlases.flatMap((a) => a.sources).find((s) => s.id === id)
        ?.url ?? null
    );
  }
  apply(form: HTMLFormElement): void {
    const data = new FormData(form);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: String(data.get('q') ?? '').trim() || null,
        tipo: data.get('tipo') || null,
        estado: data.get('estado') || null,
      },
    });
  }
  private queryString(): string {
    const params = new URLSearchParams();
    for (const key of ['q', 'tipo', 'estado']) {
      const value = this.params().get(key);
      if (value) params.set(key, value);
    }
    return params.size ? '?' + params.toString() : '';
  }
}
