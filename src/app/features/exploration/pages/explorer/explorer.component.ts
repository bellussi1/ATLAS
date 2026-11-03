import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { entityMedia } from '@core/content/media/asset-license';
import type { DiscoveryIndexEntry } from '@core/content/queries/discovery-index';
import {
  EXPLORER_PAGE_SIZES,
  explorerCatalogues,
  explorerContentGroups,
  explorerEntries,
  explorerFacets,
  explorerGroups,
  explorerPage,
  parseExplorerPage,
  parseExplorerPageSize,
} from '@core/content/queries/knowledge-explorer';
import { contentLanguageLabels } from '@core/content/queries/localized-content';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { AtlasGeometricMosaicComponent } from '@shared/ui/geometric-mosaic/geometric-mosaic.component';
import { iconKind } from '@shared/ui/kind-icon/kind-icon.component';
import { RecordCardComponent } from '@shared/ui/record-card/record-card.component';

@Component({
  selector: 'app-explorer',
  imports: [
    RouterLink,
    RouterLinkActive,
    AtlasGeometricMosaicComponent,
    RecordCardComponent,
  ],
  templateUrl: './explorer.component.html',
  styleUrl: './explorer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExplorerComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly repository = inject(ContentRepository);
  readonly groups = explorerGroups.map((group) => ({
    ...group,
    catalogues: explorerCatalogues.filter((c) => c.group === group.id),
  }));
  readonly catalogue =
    explorerCatalogues.find((c) => c.path === this.route.snapshot.data['catalogue']) ??
    explorerCatalogues[0];
  readonly mosaicSeed = explorerCatalogues.indexOf(this.catalogue) + 3;
  readonly pageSizes = EXPLORER_PAGE_SIZES;
  readonly languages = contentLanguageLabels;
  readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly facets = explorerFacets(this.repository.discoveryIndex, this.catalogue.path);
  readonly kindGroups = explorerContentGroups
    .map((group) => ({
      ...group,
      kinds: this.facets.kinds.filter((kind) => kind.group === group.id),
    }))
    .filter((group) => group.kinds.length);
  readonly results = computed(() =>
    explorerEntries(this.repository.discoveryIndex, {
      catalogue: this.catalogue.path,
      query: this.params().get('q') ?? '',
      kind: this.params().get('tipo') ?? '',
      state: this.params().get('estado') ?? '',
    }),
  );
  // Sources keep one list: records link to their anchors (#source-…), which must stay on the page.
  readonly icon = iconKind;
  readonly paginated = this.catalogue.path !== 'fontes';
  readonly pageSize = computed(() => parseExplorerPageSize(this.params().get('porPagina')));
  readonly page = computed(() =>
    explorerPage(
      this.results(),
      parseExplorerPage(this.params().get('pagina')),
      this.paginated ? this.pageSize() : Math.max(1, this.results().length),
    ),
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
  // Category and page size links live in the URL; the search and state filters keep both.
  apply(form: HTMLFormElement): void {
    const data = new FormData(form);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: String(data.get('q') ?? '').trim() || null,
        tipo: this.params().get('tipo'),
        estado: data.get('estado') || null,
        porPagina: this.params().get('porPagina'),
        idioma: this.params().get('idioma'),
      },
    });
  }
  /** Title and summary in the requested language when an approved translation exists. */
  shown(entry: DiscoveryIndexEntry): { title: string; summary: string; locale: string } {
    const locale = this.params().get('idioma');
    const text = entry.translations?.find((t) => t.locale === locale)?.text;
    return text
      ? { title: text.title, summary: text.summary, locale: locale! }
      : { title: entry.title, summary: entry.summary, locale: entry.sourceLocale ?? 'und' };
  }
  /** Licensed picture of the record, when one may be reproduced. */
  picture(id: string): string | null {
    return entityMedia(this.repository.knowledgeGraph, { id })?.assetPath ?? null;
  }
  private queryString(): string {
    const params = new URLSearchParams();
    for (const key of ['q', 'tipo', 'estado', 'porPagina', 'pagina', 'idioma']) {
      const value = this.params().get(key);
      if (value) params.set(key, value);
    }
    return params.size ? '?' + params.toString() : '';
  }
}
