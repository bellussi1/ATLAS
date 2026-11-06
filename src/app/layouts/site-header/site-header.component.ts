import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { explorerCatalogues } from '@core/content/queries/knowledge-explorer';
import { filter, map } from 'rxjs';

type Section = 'leituras' | 'acervo' | 'grafos' | null;

export const headerReadings = [
  {
    path: '/marxismo',
    title: 'Marxismo',
    note: 'Trabalho, valor e divergências',
    shape: 'quarter',
    color: 'var(--color-accent)',
  },
  {
    path: '/liberalismo',
    title: 'Liberalismo',
    note: 'Liberdade, propriedade e mercado',
    shape: 'circle',
    color: 'var(--color-indigo)',
  },
  {
    path: '/social-democracia',
    title: 'Social-democracia',
    note: 'Reforma, Estado e bem-estar',
    shape: 'half',
    color: 'var(--color-ochre-paper)',
  },
  {
    path: '/anarquismo',
    title: 'Anarquismo',
    note: 'Autoridade, autonomia e apoio mútuo',
    shape: 'square',
    color: 'var(--color-teal-paper)',
  },
] as const;

/** Catalogues shown beside the readings so the menu also answers "what else is here?". */
const headerCatalogues = explorerCatalogues.filter((catalogue) =>
  ['pessoas', 'obras', 'paises', 'acontecimentos', 'conceitos', 'fontes'].includes(catalogue.path),
);

// Every page outside the readings and the network belongs to the archive (catalogues, records, search).
const sectionOf = (url: string): Section => {
  const path = url.split(/[?#]/)[0];
  if (path === '/') return null;
  if (path.startsWith('/grafos')) return 'grafos';
  if (headerReadings.some((reading) => path.startsWith(reading.path))) return 'leituras';
  return 'acervo';
};

@Component({
  selector: 'app-site-header',
  imports: [RouterLink],
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.scss',
  host: {
    '(document:keydown.escape)': 'close(true)',
    '(document:pointerdown)': 'closeOnOutsidePointer($event)',
    '(focusout)': 'closeWhenFocusLeaves($event)',
  },
})
export class SiteHeaderComponent {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);
  private readonly menuToggle = viewChild.required<ElementRef<HTMLButtonElement>>('menuToggle');
  private readonly readingsToggle =
    viewChild.required<ElementRef<HTMLButtonElement>>('readingsToggle');
  readonly readings = headerReadings;
  readonly catalogues = headerCatalogues;
  readonly menuOpen = signal(false);
  readonly readingsOpen = signal(false);
  readonly query = signal('');
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
      .subscribe(() => {
        this.menuOpen.set(false);
        this.readingsOpen.set(false);
      });
  }

  toggle(): void {
    this.menuOpen.update((open) => !open);
  }

  toggleReadings(): void {
    this.readingsOpen.update((open) => !open);
  }

  search(event: Event): void {
    event.preventDefault();
    void this.router.navigate(['/acervo'], {
      queryParams: { q: this.query().trim() || null },
    });
  }

  close(returnFocus = false): void {
    if (!this.menuOpen() && !this.readingsOpen()) return;
    const smallScreen = this.menuToggle().nativeElement.offsetParent !== null;
    this.menuOpen.set(false);
    this.readingsOpen.set(false);
    if (returnFocus) {
      // On a small screen the menu button owns focus; on a wide one, the submenu button does.
      (smallScreen ? this.menuToggle() : this.readingsToggle()).nativeElement.focus();
    }
  }

  closeOnOutsidePointer(event: PointerEvent): void {
    if (!this.element.nativeElement.contains(event.target as Node)) this.close();
  }

  // Tabbing out of an open panel closes it, so focus never moves behind a hidden menu.
  closeWhenFocusLeaves(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || (!this.menuOpen() && !this.readingsOpen())) return;
    if (!this.element.nativeElement.contains(next)) this.close();
  }
}
