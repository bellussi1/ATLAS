import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { AnalyticsService } from '@core/analytics/analytics.service';
import { absoluteSiteUrl } from '@core/routing/site-url';
import { SiteFooterComponent } from '@layouts/site-footer/site-footer.component';
import { SiteHeaderComponent } from '@layouts/site-header/site-header.component';
import { BreadcrumbsComponent } from '@shared/ui/breadcrumbs/breadcrumbs.component';

import {
  NavigationFailureComponent,
  type NavigationFailureKind,
} from './navigation-failure/navigation-failure.component';

@Component({
  selector: 'app-root',
  imports: [
    SiteFooterComponent,
    SiteHeaderComponent,
    NavigationFailureComponent,
    BreadcrumbsComponent,
    RouterLink,
    RouterOutlet,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  host: {
    '(document:keydown)': 'setInputMode(true)',
    '(document:pointerdown)': 'setInputMode(false)',
  },
})
export class AppComponent {
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private currentPath: string | null = null;
  private loadingTimer: ReturnType<typeof setTimeout> | undefined;
  readonly failedNavigation = signal<string | null>(null);
  readonly failureKind = signal<NavigationFailureKind>('route');
  readonly previousTitle = signal<string | null>(null);
  readonly retrying = signal(false);
  readonly navigating = signal(false);
  readonly showLoadingScreen = signal(false);
  readonly loadingLabel = signal('Carregando…');
  /** Routes with `data.fullscreen` own the whole window: no header, breadcrumbs or footer. */
  readonly fullscreen = signal(
    /^\/(grafos|grafo|rede|mapa|mapa-mundi)(?:\/|$)/.test(this.router.url.split(/[?#]/)[0]),
  );
  readonly pageTitle = signal('ATLAS — compreender o mundo');

  constructor() {
    inject(AnalyticsService).start();
    this.destroyRef.onDestroy(() => {
      this.clearLoading();
    });
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationError) {
        this.clearLoading();
        const kind = this.failureKindFor(event.error);
        // A tab opened before a deploy asks for chunks the new build no longer serves.
        // One full load fetches the current build; the guard stops a reload loop.
        if (kind === 'chunk' && this.reloadOnce(event.url)) return;
        this.failedNavigation.set(event.url);
        this.failureKind.set(kind);
        this.previousTitle.set(this.currentPath === null ? null : this.previousPageLabel());
        this.fullscreen.set(false);
        this.retrying.set(false);
        return;
      }
      if (event instanceof NavigationCancel) {
        this.clearLoading();
        return;
      }
      if (event instanceof NavigationStart) {
        const path = event.url.split(/[?#]/)[0];
        if (this.currentPath !== null && path !== this.currentPath) {
          this.startLoading(path);
        }
        return;
      }
      if (!(event instanceof NavigationEnd)) return;
      this.clearLoading();
      this.failedNavigation.set(null);
      this.failureKind.set('route');
      this.previousTitle.set(null);
      this.retrying.set(false);
      const path = event.urlAfterRedirects.split(/[?#]/)[0];
      this.fullscreen.set(/^\/(grafos|grafo|rede|mapa|mapa-mundi)(?:\/|$)/.test(path));
      // Moving to another page hands focus to its content; query and fragment changes keep it.
      if (this.currentPath !== null && path !== this.currentPath) this.focusMainContent();
      this.currentPath = path;
      this.updatePageMetadata();
    });
  }

  retryNavigation(): void {
    const path = this.failedNavigation();
    if (!path || this.retrying()) return;
    this.retrying.set(true);
    if (this.failureKind() === 'chunk') {
      // Retrying inside the stale build would request the same missing chunk.
      this.document.defaultView?.location.assign(path);
      return;
    }
    void this.router
      .navigateByUrl(path)
      .then((success) => {
        if (success) this.focusMainContent();
      })
      .catch(() => undefined)
      .finally(() => this.retrying.set(false));
  }

  /** The previous page is still mounted; dismissing only removes the recovery notice. */
  dismissFailure(): void {
    this.failedNavigation.set(null);
    this.failureKind.set('route');
    this.previousTitle.set(null);
    this.retrying.set(false);
    this.focusMainContent();
  }

  setInputMode(keyboard: boolean): void {
    this.document.documentElement.dataset['input'] = keyboard ? 'keyboard' : 'pointer';
  }

  focusMainContent(): void {
    this.document.getElementById('conteudo')?.focus({ preventScroll: true });
  }

  private startLoading(path: string): void {
    this.clearLoading();
    this.navigating.set(true);
    this.loadingLabel.set(this.loadingLabelFor(path));
    this.loadingTimer = setTimeout(() => {
      if (this.navigating()) this.showLoadingScreen.set(true);
    }, 150);
  }

  private clearLoading(): void {
    if (this.loadingTimer !== undefined) {
      clearTimeout(this.loadingTimer);
      this.loadingTimer = undefined;
    }
    this.navigating.set(false);
    this.showLoadingScreen.set(false);
  }

  private loadingLabelFor(path: string): string {
    if (/^\/(grafos|grafo|rede)(?:\/|$)/.test(path)) return 'Preparando a rede de ligações…';
    if (/^\/(mapa|mapa-mundi)(?:\/|$)/.test(path)) return 'Preparando o mapa-múndi histórico…';
    if (path.startsWith('/leitura')) return 'Abrindo a leitura contínua…';
    if (path.startsWith('/verbete')) return 'Carregando a ficha do verbete…';
    return 'Carregando o acervo…';
  }

  private failureKindFor(error: unknown): NavigationFailureKind {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return /dynamically imported module|Loading chunk|module script failed|Failed to fetch/i.test(
      message,
    )
      ? 'chunk'
      : 'route';
  }

  /** Full page load of `url`, at most once per URL per minute in this tab. */
  private reloadOnce(url: string): boolean {
    const view = this.document.defaultView;
    // Offline, a full load would only swap the page for the browser's error screen.
    if (!view || view.navigator.onLine === false) return false;
    const key = 'atlas:chunk-reload';
    try {
      const previous = JSON.parse(view.sessionStorage.getItem(key) ?? 'null') as {
        url: string;
        at: number;
      } | null;
      if (previous?.url === url && Date.now() - previous.at < 60_000) return false;
      view.sessionStorage.setItem(key, JSON.stringify({ url, at: Date.now() }));
    } catch {
      return false;
    }
    view.location.assign(url);
    return true;
  }

  private previousPageLabel(): string {
    if (this.currentPath === '/') return 'Início';
    const title = this.pageTitle()
      .replace(/\s+—\s+ATLAS$/, '')
      .trim();
    return title && title !== 'ATLAS — compreender o mundo' ? title : 'Início';
  }

  private updatePageMetadata(): void {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) route = route.firstChild;
    // NavigationEnd precedes the Router's title update; use the resolved snapshot.
    const pageTitle = route.title || this.title.getTitle() || 'ATLAS — compreender o mundo';
    const description =
      this.activeRouteDescription() || 'Explore o acervo, com contexto e fontes identificadas.';
    this.pageTitle.set(pageTitle);
    this.fullscreen.set(route.data['fullscreen'] === true);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    let canonical = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      this.document.head.appendChild(canonical);
    }
    // The canonical is absolute in the build and must stay absolute after client navigation.
    canonical.href = absoluteSiteUrl(this.currentPath || '/');
    this.title.setTitle(pageTitle);
  }

  private activeRouteDescription(): string | undefined {
    let route = this.router.routerState.snapshot.root;
    while (route) {
      const description = route.data['metaDescription'];
      if (typeof description === 'string') return description;
      route = route.firstChild!;
    }
    return undefined;
  }
}
