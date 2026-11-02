import { DOCUMENT } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, NavigationError, Router, RouterLink, RouterOutlet } from '@angular/router';
import { SiteFooterComponent } from '@layouts/site-footer/site-footer.component';
import { SiteHeaderComponent } from '@layouts/site-header/site-header.component';
import { BreadcrumbsComponent } from '@shared/ui/breadcrumbs/breadcrumbs.component';
import { AtlasNoticeComponent } from '@shared/ui/notice/notice.component';

@Component({
  selector: 'app-root',
  imports: [
    SiteFooterComponent,
    SiteHeaderComponent,
    AtlasNoticeComponent,
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
  readonly failedNavigation = signal<string | null>(null);

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationError) {
        this.failedNavigation.set(event.url);
        return;
      }
      if (!(event instanceof NavigationEnd)) return;
      this.failedNavigation.set(null);
      const path = event.urlAfterRedirects.split(/[?#]/)[0];
      this.updatePageMetadata(path);
    });
  }

  retryNavigation(): void {
    const path = this.failedNavigation();
    if (path)
      void this.router
        .navigateByUrl(path)
        .then((success) => {
          if (success) this.focusMainContent();
        })
        .catch(() => undefined);
  }

  setInputMode(keyboard: boolean): void {
    this.document.documentElement.dataset['input'] = keyboard ? 'keyboard' : 'pointer';
  }

  focusMainContent(): void {
    this.document.getElementById('conteudo')?.focus();
  }

  private updatePageMetadata(path: string): void {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) route = route.firstChild;
    // NavigationEnd precedes the Router's title update; use the resolved snapshot.
    const pageTitle = route.title || this.title.getTitle() || 'ATLAS — compreender o mundo';
    const routeDescription = this.activeRouteDescription();
    const description =
      path === '/marxismo'
        ? routeDescription ||
          'Conceitos, pensadores, cronologia, divergências e fontes do marxismo.'
        : path === '/liberalismo'
          ? 'Explore o Atlas do Liberalismo: pessoas, ideias, acontecimentos e documentos com fontes.'
          : routeDescription || 'Explore o acervo do ATLAS, com contexto e fontes identificadas.';
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    let canonical = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      this.document.head.appendChild(canonical);
    }
    // Root-relative canonicals stay correct for static builds without inventing a production host.
    canonical.href = path || '/';
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
