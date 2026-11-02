import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { AtlasGeometricMosaicComponent } from '@shared/ui/geometric-mosaic/geometric-mosaic.component';
import { filter, map } from 'rxjs';

type Section = 'marxismo' | 'liberalismo' | 'acervo' | null;

// Every page outside the two readings belongs to the archive (catalogues, records, search).
const sectionOf = (url: string): Section => {
  const path = url.split(/[?#]/)[0];
  if (path === '/') return null;
  if (path.startsWith('/marxismo')) return 'marxismo';
  if (path.startsWith('/liberalismo')) return 'liberalismo';
  return 'acervo';
};

@Component({
  selector: 'app-site-header',
  imports: [AtlasGeometricMosaicComponent, RouterLink],
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.scss',
  host: {
    '(document:keydown.escape)': 'close(true)',
    '(document:pointerdown)': 'closeOnOutsidePointer($event)',
  },
})
export class SiteHeaderComponent {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);
  private readonly menuToggle = viewChild.required<ElementRef<HTMLButtonElement>>('menuToggle');
  readonly menuOpen = signal(false);
  readonly section = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => sectionOf(event.urlAfterRedirects)),
    ),
    { initialValue: sectionOf(this.router.url) },
  );

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuOpen.set(false));
  }

  toggle(): void {
    this.menuOpen.update((open) => !open);
  }

  close(returnFocus = false): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    if (returnFocus) this.menuToggle().nativeElement.focus();
  }

  closeOnOutsidePointer(event: PointerEvent): void {
    if (!this.element.nativeElement.contains(event.target as Node)) this.close();
  }
}
