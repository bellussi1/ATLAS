import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { BreadcrumbsComponent } from './shared/breadcrumbs';
import { AtlasEditorialMarkComponent } from './shared/editorial-mark';
import { AtlasMenuComponent } from './shared/ui-primitives';

@Component({
  selector: 'app-root',
  imports: [
    AtlasEditorialMarkComponent,
    AtlasMenuComponent,
    BreadcrumbsComponent,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: {
    '(document:keydown)': 'instantNavigation = true',
    '(document:pointerdown)': 'instantNavigation = false',
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

  constructor() {
    let previousPath: string | undefined;
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (!(event instanceof NavigationEnd)) return;
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
      win.matchMedia?.('(prefers-reduced-motion: reduce)').matches
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
    const pageTitle = this.title.getTitle() || 'ATLAS — compreender o mundo';
    const routeDescription = this.activeRouteDescription();
    const description =
      path === '/atlas/marxismo'
        ? 'Explore pessoas, obras e debates sobre Marxismo e economia política. Núcleo em revisão editorial.'
        : path === '/atlas/marxismo/valor-e-trabalho'
          ? 'Compare as formulações de valor de Smith e Marx, suas fontes e a crítica documentada. Conteúdo em revisão.'
          : path === '/fontes'
            ? 'Consulte as fontes cadastradas no ATLAS, seus localizadores e as leituras relacionadas.'
            : path === '/conhecimento'
              ? 'Pesquise verbetes e textos de metodologia realmente disponíveis no acervo do ATLAS.'
              : path === '/relacoes'
                ? 'Investigue como o ATLAS relaciona conceitos, afirmações e evidências.'
                : path === '/tempo-e-espaco'
                  ? 'Consulte o estado atual da exploração temporal e espacial do acervo do ATLAS.'
                  : path.startsWith('/explorar/')
                    ? 'Leia conteúdos editoriais do ATLAS com contexto, relações e estados editoriais identificados.'
                    : path.startsWith('/verbete/')
                      ? routeDescription ||
                        'Consulte um verbete do ATLAS com contexto, afirmações, evidências e referências identificáveis.'
                      : path.startsWith('/estudar')
                        ? 'Conheça a proposta de trilhas de estudo do ATLAS e seus materiais disponíveis.'
                        : path === '/'
                          ? 'Explore relações, tempo e espaço, e os conteúdos disponíveis no acervo do ATLAS.'
                          : path === '/sobre'
                            ? 'Conheça a missão e os princípios editoriais da plataforma educacional pública do ATLAS.'
                            : 'Conheça a plataforma educacional pública do ATLAS e seus caminhos de leitura.';
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
