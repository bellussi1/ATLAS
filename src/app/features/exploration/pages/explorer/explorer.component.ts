import { DOCUMENT, NgTemplateOutlet, ViewportScroller } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  NavigationEnd,
  NavigationStart,
  Router,
  RouterLink,
  RouterLinkActive,
  Scroll,
} from '@angular/router';
import { entityMedia } from '@core/content/media/asset-license';
import type { DiscoveryIndexEntry } from '@core/content/queries/discovery-index';
import {
  EXPLORER_PAGE_SIZE,
  explorerCatalogues,
  explorerContentGroups,
  explorerEntries,
  explorerFacets,
  explorerGroups,
  explorerPage,
  parseExplorerPage,
} from '@core/content/queries/knowledge-explorer';
import { contentLanguageLabels } from '@core/content/queries/localized-content';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { AtlasGeometricMosaicComponent } from '@shared/ui/geometric-mosaic/geometric-mosaic.component';
import { iconKind } from '@shared/ui/kind-icon/kind-icon.component';
import { RecordCardComponent } from '@shared/ui/record-card/record-card.component';
import {
  SelectMenuComponent,
  type SelectMenuOption,
} from '@shared/ui/select-menu/select-menu.component';

@Component({
  selector: 'app-explorer',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    RouterLinkActive,
    AtlasGeometricMosaicComponent,
    RecordCardComponent,
    SelectMenuComponent,
  ],
  templateUrl: './explorer.component.html',
  styleUrl: './explorer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExplorerComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly repository = inject(ContentRepository);
  private readonly viewport = inject(ViewportScroller);
  private readonly document = inject(DOCUMENT);
  // Pager links keep the reader's place: the router would otherwise scroll to the top of the page.
  private keptScrollY: number | null = null;
  // A #source-… link may point to another page; the scroll restoration must not undo it.
  private resolvingFragment = false;
  private resolvedFragment: string | null = null;
  /** Keeps the previous page visible and marked busy while a query-string change settles. */
  readonly navigating = signal(false);
  readonly groups = explorerGroups.map((group) => ({
    ...group,
    catalogues: explorerCatalogues.filter((c) => c.group === group.id),
  }));
  readonly catalogue =
    explorerCatalogues.find((c) => c.path === this.route.snapshot.data['catalogue']) ??
    explorerCatalogues[0];
  readonly mosaicSeed = explorerCatalogues.indexOf(this.catalogue) + 3;
  readonly languages = contentLanguageLabels;
  readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  /** `#source-…` links open the page that holds that source. */
  readonly fragment = toSignal(this.route.fragment, {
    initialValue: this.route.snapshot.fragment,
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
  readonly paginated = true;
  readonly page = computed(() =>
    explorerPage(
      this.results(),
      parseExplorerPage(this.params().get('pagina')),
      EXPLORER_PAGE_SIZE,
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
  readonly stateOptions = computed<SelectMenuOption[]>(() => [
    { value: '', label: 'Todas as situações' },
    ...(this.unknownState()
      ? [{ value: this.params().get('estado') ?? '', label: 'Situação indisponível' }]
      : []),
    ...this.facets.states.map((facet) => ({
      value: facet.value,
      label: facet.label,
      count: facet.count,
    })),
  ]);
  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      // Filters, search and pager only change the query string: the reader stays where they are.
      if (event instanceof NavigationStart) {
        const samePage = event.url.split('?')[0] === this.router.url.split('?')[0];
        this.keptScrollY = this.resolvingFragment
          ? null
          : samePage
            ? this.viewport.getScrollPosition()[1]
            : null;
        this.navigating.set(samePage);
      }
      if (event instanceof NavigationEnd) {
        this.navigating.set(false);
        this.resolvingFragment = false;
      }
      if (event instanceof Scroll && this.keptScrollY !== null) {
        const y = this.keptScrollY;
        this.keptScrollY = null;
        // The router scrolls to the top after its own Scroll event, so the restore waits one turn.
        setTimeout(() => this.viewport.scrollToPosition([0, y]));
      }
    });
    // A source anchor can live on a later page: open that page before scrolling to the item.
    effect(() => {
      const fragment = this.fragment();
      const entries = this.results();
      if (!fragment || this.catalogue.path !== 'fontes') return;
      const index = entries.findIndex((entry) => (entry.fragment ?? entry.id) === fragment);
      if (index < 0) return;
      const target = Math.floor(index / EXPLORER_PAGE_SIZE) + 1;
      if (target !== this.page().page) {
        this.resolvingFragment = true;
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { pagina: target === 1 ? null : target },
          queryParamsHandling: 'merge',
          fragment,
          replaceUrl: true,
        });
        return;
      }
      if (this.resolvedFragment === fragment) return;
      this.resolvedFragment = fragment;
      setTimeout(() => this.scrollToFragment(fragment), 0);
    });
  }
  sourceUrl(id: string): string | null {
    return (
      this.repository.knowledgeGraph.atlases.flatMap((a) => a.sources).find((s) => s.id === id)
        ?.url ?? null
    );
  }
  applyState(state: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { estado: state || null, pagina: null },
      queryParamsHandling: 'merge',
    });
  }
  // Category links live in the URL; the search and state filters keep it.
  apply(form: HTMLFormElement): void {
    const data = new FormData(form);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: String(data.get('q') ?? '').trim() || null,
        tipo: this.params().get('tipo'),
        estado: this.params().get('estado'),
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
  private scrollToFragment(fragment: string): void {
    const element = this.document.getElementById(fragment);
    if (!element) return;
    element.scrollIntoView({ block: 'start' });
  }
  private queryString(): string {
    const params = new URLSearchParams();
    for (const key of ['q', 'tipo', 'estado', 'pagina', 'idioma']) {
      const value = this.params().get(key);
      if (value) params.set(key, value);
    }
    return params.size ? '?' + params.toString() : '';
  }
}
