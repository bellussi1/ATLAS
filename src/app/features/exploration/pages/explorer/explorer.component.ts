import { DOCUMENT, ViewportScroller } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  convertToParamMap,
  NavigationEnd,
  NavigationStart,
  type ParamMap,
  Router,
  RouterLink,
  Scroll,
} from '@angular/router';
import { entityMedia } from '@core/content/media/asset-license';
import type { DiscoveryIndexEntry } from '@core/content/queries/discovery-index';
import {
  catalogueUrl,
  explorerCatalogues,
  explorerRecordCatalogueOrder,
} from '@core/content/queries/explorer-catalogues';
import {
  EXPLORER_PAGE_SIZE,
  explorerEntries,
  explorerFacets,
  explorerLayers,
  explorerMatchKind,
  parseExplorerPage,
} from '@core/content/queries/knowledge-explorer';
import { contentLanguageLabels } from '@core/content/queries/localized-content';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { readingPath } from '@core/routing/reading-routes';
import { AtlasGeometricMosaicComponent } from '@shared/ui/geometric-mosaic/geometric-mosaic.component';
import { AtlasKindIconComponent, iconKind } from '@shared/ui/kind-icon/kind-icon.component';
import { RecordCardComponent } from '@shared/ui/record-card/record-card.component';

@Component({
  selector: 'app-explorer',
  imports: [RouterLink, AtlasGeometricMosaicComponent, AtlasKindIconComponent, RecordCardComponent],
  templateUrl: './explorer.component.html',
  styleUrl: './explorer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExplorerComponent {
  readonly readingPath = readingPath;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly repository = inject(ContentRepository);
  private readonly viewport = inject(ViewportScroller);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private searchTimer?: ReturnType<typeof setTimeout>;
  // Pager links keep the reader's place: the router would otherwise scroll to the top of the page.
  private keptScrollY: number | null = null;
  // A #source-… link may point to another page; the scroll restoration must not undo it.
  private resolvingFragment = false;
  private resolvedFragment: string | null = null;
  /** Keeps the previous page visible and marked busy while a query-string change settles. */
  readonly navigating = signal(false);
  readonly catalogueUrl = catalogueUrl;
  readonly catalogue =
    explorerCatalogues.find((c) => c.path === this.route.snapshot.data['catalogue']) ??
    explorerCatalogues[0];
  readonly recordCatalogues = explorerRecordCatalogueOrder.map((path) =>
    explorerCatalogues.find((catalogue) => catalogue.path === path)!,
  );
  readonly registrosOpen = signal(true);
  readonly mosaicSeed = explorerCatalogues.indexOf(this.catalogue) + 3;
  readonly languages = contentLanguageLabels;
  readonly params = signal<ParamMap>(this.readInitialParams());
  /** `#source-…` links open the page that holds that source. */
  readonly fragment = toSignal(this.route.fragment, {
    initialValue: this.route.snapshot.fragment,
  });
  /** The input keeps the reader's text while the debounced query settles in the URL. */
  readonly queryDraft = signal(this.params().get('q') ?? '');
  readonly filtersOpen = signal(false);
  readonly phone = signal(false);
  /** Universal archive only: records, sources and readings are different layers. */
  readonly showLayers = this.catalogue.path === 'acervo';
  readonly layer = computed(() => {
    const value = this.params().get('camada') ?? '';
    return explorerLayers.some((item) => item.id === value) ? value : '';
  });
  readonly isUniversal = computed(() => this.catalogue.path === 'acervo' && !this.layer());
  readonly isRegistros = computed(
    () => this.catalogue.path === 'acervo' && this.layer() === 'registros',
  );
  readonly isFontes = computed(
    () =>
      this.catalogue.path === 'fontes' ||
      (this.catalogue.path === 'acervo' && this.layer() === 'fontes'),
  );
  readonly isLeituras = computed(
    () => this.catalogue.path === 'acervo' && this.layer() === 'editorial',
  );
  /** Political relevance of the record: core, context or outside the archive's scope. */
  readonly scope = computed(() => {
    const value = this.params().get('escopo') ?? '';
    return ['nucleo', 'contexto', 'fora'].includes(value) ? value : '';
  });
  readonly sort = computed(() => (this.params().get('ordem') === 'titulo' ? 'title' : 'relevance'));
  readonly view = computed<'grade' | 'list'>(() => {
    const value = this.params().get('vista');
    if (value === 'grade') return 'grade';
    if (value === 'lista') return 'list';
    return this.defaultView();
  });
  /** Tudo mixes records, sources and readings; a single grid would flatten their difference. */
  private readonly defaultView = computed<'grade' | 'list'>(() => {
    if (this.phone()) return 'list';
    if (this.showLayers && !this.layer()) return 'list';
    return this.sourceList() || this.editorialList() ? 'list' : 'grade';
  });
  readonly recordGrid = computed(
    () =>
      this.view() === 'grade' &&
      !this.sourceList() &&
      !this.editorialList() &&
      (!this.showLayers || this.layer() === 'registros'),
  );
  readonly viewToggleShown = computed(
    () =>
      !this.sourceList() &&
      !this.editorialList() &&
      (!this.showLayers || this.layer() === 'registros'),
  );
  readonly scopeTotal = computed(() =>
    this.facets().scopes.reduce((sum, item) => sum + item.count, 0),
  );
  readonly facets = computed(() =>
    explorerFacets(
      this.repository.discoveryIndex,
      this.catalogue.path,
      this.layer(),
      this.scope(),
      {
        query: this.params().get('q') ?? '',
        kind: this.params().get('tipo') ?? '',
        state: this.params().get('estado') ?? '',
      },
    ),
  );
  readonly scopeOptions = computed(() => {
    const counts = new Map(this.facets().scopes.map((item) => [item.value, item.count]));
    return [
      { value: 'nucleo', label: 'Núcleo', count: counts.get('nucleo') ?? 0 },
      { value: 'contexto', label: 'Contexto', count: counts.get('contexto') ?? 0 },
      { value: 'fora', label: 'Fora', count: counts.get('fora') ?? 0 },
    ];
  });
  readonly results = computed(() =>
    explorerEntries(this.repository.discoveryIndex, {
      catalogue: this.catalogue.path,
      query: this.params().get('q') ?? '',
      kind: this.params().get('tipo') ?? '',
      state: this.params().get('estado') ?? '',
      layer: this.layer(),
      scope: this.scope(),
      sort: this.sort(),
    }),
  );
  /** Tells the reader when no name matched and the list only cites the term in the text. */
  readonly matchKind = computed(() =>
    explorerMatchKind(this.repository.discoveryIndex, {
      catalogue: this.catalogue.path,
      query: this.params().get('q') ?? '',
      kind: this.params().get('tipo') ?? '',
      state: this.params().get('estado') ?? '',
      layer: this.layer(),
      scope: this.scope(),
    }),
  );
  // Sources keep one list: records link to their anchors (#source-…), which must stay on the page.
  readonly icon = iconKind;
  readonly page = computed(() => parseExplorerPage(this.params().get('pagina')));
  readonly visibleResults = computed(() =>
    this.results().slice(0, this.page() * EXPLORER_PAGE_SIZE),
  );
  readonly hasMore = computed(() => this.visibleResults().length < this.results().length);
  readonly countLabel = computed(() => {
    const total = this.results().length;
    if (!total) return 'Nenhum resultado';
    const shown = this.visibleResults().length;
    const range = shown === total ? `${total}` : `1–${shown}`;
    return `${range} de ${total} ${total === 1 ? 'resultado' : 'resultados'}`;
  });
  readonly origin = computed(() => catalogueUrl(this.catalogue.path) + this.queryString());
  readonly unknownKind = computed(
    () =>
      !!this.params().get('tipo') &&
      !this.facets().kinds.some((f) => f.value === this.params().get('tipo')),
  );
  readonly unknownLayer = computed(
    () =>
      !!this.params().get('camada') &&
      !explorerLayers.some((layer) => layer.id === this.params().get('camada')),
  );
  readonly unknownState = computed(
    () =>
      !!this.params().get('estado') &&
      !this.facets().states.some((f) => f.value === this.params().get('estado')),
  );
  /** Sources keep the compact list layout, also when the universal archive is cut to that layer. */
  readonly sourceList = computed(
    () => this.catalogue.path === 'fontes' || this.layer() === 'fontes',
  );
  readonly editorialList = computed(() => this.layer() === 'editorial');
  /** Only a record catalogue promises records; the universal archive also holds sources and readings. */
  readonly emptyTitle = computed(() =>
    this.sourceList() || this.editorialList() || (this.showLayers && !this.layer())
      ? 'Nenhum resultado encontrado'
      : 'Nenhum registro encontrado',
  );
  readonly scopeFilterShown = computed(() => !this.sourceList() && !this.editorialList());
  readonly activeFilters = computed(() => {
    const params = this.params();
    const filters: { key: string; label: string; remove: Record<string, null> }[] = [];
    const query = params.get('q');
    if (query)
      filters.push({ key: 'q', label: `Busca: ${query}`, remove: { q: null, pagina: null } });
    const kind = params.get('tipo');
    if (kind) {
      const item = this.facets().kinds.find((entry) => entry.value === kind);
      filters.push({
        key: 'tipo',
        label: `Tipo: ${item?.label ?? kind}`,
        remove: { tipo: null, pagina: null },
      });
    }
    const state = params.get('estado');
    if (state) {
      const item = this.facets().states.find((entry) => entry.value === state);
      filters.push({
        key: 'estado',
        label: `Estado: ${item?.label ?? state}`,
        remove: { estado: null, pagina: null },
      });
    }
    const scope = this.scope();
    if (scope) {
      const item = this.scopeOptions().find((entry) => entry.value === scope);
      filters.push({
        key: 'escopo',
        label: `Escopo: ${item?.label ?? scope}`,
        remove: { escopo: null, pagina: null },
      });
    }
    return filters;
  });
  readonly activeFilterCount = computed(() => this.activeFilters().length);
  constructor() {
    // Hydration can start the router without the initial query string; the real URL settles it.
    afterNextRender(() => {
      this.phone.set(
        this.document.defaultView?.matchMedia('(max-width: 47.99rem)').matches ?? false,
      );
      this.syncFromLocation();
      setTimeout(() => this.syncFromLocation(), 0);
      setTimeout(() => this.syncFromLocation(), 120);
    });
    const view = this.document.defaultView;
    if (view) {
      const onPageShow = () => this.syncFromLocation();
      view.addEventListener('pageshow', onPageShow);
      this.destroyRef.onDestroy(() => view.removeEventListener('pageshow', onPageShow));
    }
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
        const search = this.document.location?.search ?? '';
        const fromLocation = Object.fromEntries(new URLSearchParams(search));
        const fromRouter = this.router.parseUrl(event.urlAfterRedirects).queryParams;
        this.params.set(convertToParamMap({ ...fromRouter, ...fromLocation }));
        setTimeout(() => this.syncFromLocation(), 0);
      }
      if (event instanceof Scroll && this.keptScrollY !== null) {
        const y = this.keptScrollY;
        this.keptScrollY = null;
        // The router resets the new entry to the top inside this same event; restoring in a
        // microtask runs after all Scroll listeners and before the browser paints the flash.
        queueMicrotask(() => this.viewport.scrollToPosition([0, y]));
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
      if (target !== this.page()) {
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
    // Back/forward and clear actions update the field; a pending debounce keeps the typed text.
    effect(() => {
      const query = this.params().get('q') ?? '';
      if (!this.searchTimer && query !== this.queryDraft()) this.queryDraft.set(query);
    });
    this.destroyRef.onDestroy(() => {
      if (this.searchTimer) clearTimeout(this.searchTimer);
    });
  }
  /** The tree keeps the reading language when the reader switches catalogues. */
  navQuery(extra: Record<string, string> = {}): Record<string, string> {
    const idioma = this.params().get('idioma');
    return { ...extra, ...(idioma ? { idioma } : {}) };
  }
  sourceUrl(id: string): string | null {
    return (
      this.repository.knowledgeGraph.atlases.flatMap((a) => a.sources).find((s) => s.id === id)
        ?.url ?? null
    );
  }
  onQueryInput(event: Event): void {
    this.queryDraft.set((event.target as HTMLInputElement).value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.searchTimer = undefined;
      this.applyQuery(this.queryDraft(), true);
    }, 220);
  }
  submitSearch(event: Event): void {
    event.preventDefault();
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = undefined;
    }
    this.applyQuery(this.queryDraft(), false);
  }
  clearQuery(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = undefined;
    }
    this.queryDraft.set('');
    this.applyQuery('', true);
    queueMicrotask(() => this.document.getElementById('explorer-query')?.focus());
  }
  applySort(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ordem: value === 'titulo' ? 'titulo' : null, pagina: null },
      queryParamsHandling: 'merge',
    });
  }
  applyView(view: 'grade' | 'list'): void {
    if (view === this.view()) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { vista: view === 'grade' ? 'grade' : 'lista', pagina: null },
      queryParamsHandling: 'merge',
    });
  }
  loadMore(): void {
    if (!this.hasMore()) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { pagina: this.page() + 1 },
      queryParamsHandling: 'merge',
    });
  }
  toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
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
  private applyQuery(value: string, replace: boolean): void {
    const query = value.trim();
    if ((this.params().get('q') ?? '') === query) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: query || null, pagina: null },
      queryParamsHandling: 'merge',
      replaceUrl: replace,
    });
  }
  private scrollToFragment(fragment: string): void {
    const element = this.document.getElementById(fragment);
    if (!element) return;
    element.scrollIntoView({ block: 'start' });
  }
  private readInitialParams(): ParamMap {
    const search = this.document.location?.search ?? '';
    const fromLocation = Object.fromEntries(new URLSearchParams(search));
    const fromRouter = this.router.parseUrl(this.router.url).queryParams;
    const params = { ...fromLocation, ...fromRouter };
    return Object.keys(params).length
      ? convertToParamMap(params)
      : this.route.snapshot.queryParamMap;
  }
  /** The browser URL is the source of truth after hydration and trailing-slash redirects. */
  private syncFromLocation(): void {
    const params = Object.fromEntries(new URLSearchParams(this.document.location.search));
    this.params.set(convertToParamMap(params));
  }
  private queryString(): string {
    const params = new URLSearchParams();
    for (const key of [
      'q',
      'tipo',
      'estado',
      'escopo',
      'pagina',
      'idioma',
      'camada',
      'ordem',
      'vista',
    ]) {
      const value = this.params().get(key);
      if (value) params.set(key, value);
    }
    return params.size ? '?' + params.toString() : '';
  }
}
