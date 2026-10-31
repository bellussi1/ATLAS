import { AtlasEditorialMarkComponent } from './shared/editorial-mark';
import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreadcrumbsComponent } from './shared/breadcrumbs';
import { AtlasMenuComponent } from './shared/ui-primitives';

@Component({
  selector: 'app-root',
  imports: [AtlasEditorialMarkComponent, AtlasMenuComponent, BreadcrumbsComponent, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: {
    '(document:keydown)': 'instantNavigation = true',
    '(document:pointerdown)': 'instantNavigation = false',
  },
})
export class AppComponent {
  private readonly document = inject(DOCUMENT);
  instantNavigation = true;
  private firstPage = true;
  private pageAnimation?: Animation;
  private pageFrame = 0;
  constructor() {
    let previousPath: string | undefined;
    inject(Router).events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (!(event instanceof NavigationEnd)) return;
      const path = event.urlAfterRedirects.split(/[?#]/)[0];
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
    if (this.firstPage) { this.firstPage = false; return; }
    if (!win || typeof win.requestAnimationFrame !== 'function' || this.instantNavigation || win.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    this.pageFrame = win.requestAnimationFrame(() => {
      const main = this.document.getElementById('conteudo');
      if (!main || typeof main.animate !== 'function') return;
      const tokens = win.getComputedStyle(main);
      this.pageAnimation = main.animate(
        [{ opacity: .65, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: parseFloat(tokens.getPropertyValue('--motion-standard')) || 200, easing: tokens.getPropertyValue('--ease-out').trim() || 'ease-out' },
      );
    });
  }
  readonly composition = signal(0);
  readonly instantComposition = signal(false);
  changeComposition(event: MouseEvent): void {
    this.instantComposition.set(!event.detail);
    this.composition.update(value => (value + 1) % 3);
  }

  focusMainContent(): void {
    this.document.getElementById('conteudo')?.focus();
  }
}
