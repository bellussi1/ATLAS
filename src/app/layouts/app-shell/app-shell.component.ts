import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import {
  NavigationEnd,
  NavigationError,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { BreadcrumbsComponent } from '@shared/ui/breadcrumbs/breadcrumbs.component';
import { AtlasEditorialMarkComponent } from '@shared/ui/editorial-mark/editorial-mark.component';
import { AtlasNoticeComponent } from '@shared/ui/notice/notice.component';

@Component({
  selector: 'app-root',
  imports: [
    AtlasEditorialMarkComponent,
    AtlasNoticeComponent,
    BreadcrumbsComponent,
    RouterLink,
    RouterLinkActive,
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
  instantNavigation = true;
  private firstPage = true;
  private pageAnimation?: Animation;
  private pageFrame = 0;
  readonly composition = signal(0);
  readonly instantComposition = signal(false);
  readonly failedNavigation = signal<string | null>(null);

  constructor() {
    let previousPath: string | undefined;
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationError) {
        this.failedNavigation.set(event.url);
        return;
      }
      if (!(event instanceof NavigationEnd)) return;
      this.failedNavigation.set(null);
      const path = event.urlAfterRedirects.split(/[?#]/)[0];
      this.updatePageMetadata(path);
      if (path === previousPath) return;
      previousPath = path;
      this.transitionPage();
    });
    inject(DestroyRef).onDestroy(() => {
      this.pageAnimation?.cancel();
      this.document.defaultView?.cancelAnimationFrame?.(this.pageFrame);
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
    this.instantNavigation = keyboard;
    this.document.documentElement.dataset['input'] = keyboard ? 'keyboard' : 'pointer';
  }

  transitionPage(): void {
    const win = this.document.defaultView;
    this.pageAnimation?.cancel();
    win?.cancelAnimationFrame?.(this.pageFrame);
    if (this.firstPage) {
      this.firstPage = false;
      return;
    }
    if (
      !win ||
      typeof win.requestAnimationFrame !== 'function' ||
      this.instantNavigation ||
      win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      this.document.documentElement.classList.contains('atlas-reduced-motion')
    )
      return;
    this.pageFrame = win.requestAnimationFrame(() => {
      const main = this.document.getElementById('conteudo');
      if (!main || typeof main.animate !== 'function') return;
      const tokens = win.getComputedStyle(main);
      this.pageAnimation = main.animate(
        [
          { opacity: 0.65, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        {
          duration: parseFloat(tokens.getPropertyValue('--motion-standard')) || 200,
          easing: tokens.getPropertyValue('--ease-out').trim() || 'ease-out',
        },
      );
    });
  }

  changeComposition(event: MouseEvent): void {
    this.instantComposition.set(!event.detail);
    this.composition.update((value) => (value + 1) % 3);
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
