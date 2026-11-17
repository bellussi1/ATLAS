import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { readingPath } from '@core/routing/reading-routes';
import { filter, map } from 'rxjs';

type Section = 'leituras' | 'itinerarios' | 'acervo' | 'grafos' | null;

export const headerReadings = [
  {
    path: readingPath('marxismo'),
    title: 'Marxismo',
    note: 'Trabalho, valor e divergências',
    shape: 'quarter',
    color: 'var(--color-accent)',
  },
  {
    path: readingPath('liberalismo'),
    title: 'Liberalismo',
    note: 'Liberdade, propriedade e mercado',
    shape: 'circle',
    color: 'var(--color-indigo)',
  },
  {
    path: readingPath('social-democracia'),
    title: 'Social-democracia',
    note: 'Reforma, Estado e bem-estar',
    shape: 'half',
    color: 'var(--color-ochre-paper)',
  },
  {
    path: readingPath('anarquismo'),
    title: 'Anarquismo',
    note: 'Autoridade, autonomia e apoio mútuo',
    shape: 'square',
    color: 'var(--color-teal-paper)',
  },
] as const;

// Every page outside the readings and the network belongs to the archive (catalogues, records, search).
const sectionOf = (url: string): Section => {
  const path = url.split(/[?#]/)[0];
  if (path === '/') return null;
  if (path.startsWith('/grafos')) return 'grafos';
  if (path.startsWith('/itinerario')) return 'itinerarios';
  if (path === '/leituras' || path.startsWith('/leitura/')) return 'leituras';
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
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private destroyed = false;
  private readonly menuToggle = viewChild.required<ElementRef<HTMLButtonElement>>('menuToggle');
  readonly menuOpen = signal(false);
  readonly query = signal('');
  readonly section = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => sectionOf(event.urlAfterRedirects)),
    ),
    { initialValue: sectionOf(this.router.url) },
  );

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
    });
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.menuOpen.set(false);
      });
  }

  toggle(): void {
    this.menuOpen.update((open) => !open);
  }

  warmArchive(): void {
    void import('@core/content/repositories/content-repository.service').then(
      ({ ContentRepository }) => {
        if (!this.destroyed) this.injector.get(ContentRepository).warmBundle();
      },
    );
  }
  warmGraph(): void {
    void import('@core/content/repositories/content-repository.service').then(
      ({ ContentRepository }) => {
        if (!this.destroyed) this.injector.get(ContentRepository).warmNetwork();
      },
    );
  }

  search(event: Event): void {
    event.preventDefault();
    void this.router.navigate(['/acervo'], {
      queryParams: { q: this.query().trim() || null },
    });
  }

  close(returnFocus = false): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    if (returnFocus) this.menuToggle().nativeElement.focus();
  }

  closeOnOutsidePointer(event: PointerEvent): void {
    if (!this.element.nativeElement.contains(event.target as Node)) this.close();
  }

  // Tabbing out of an open panel closes it, so focus never moves behind a hidden menu.
  closeWhenFocusLeaves(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this.menuOpen()) return;
    if (!this.element.nativeElement.contains(next)) this.close();
  }
}
