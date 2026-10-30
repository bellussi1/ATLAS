import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, ActivatedRouteSnapshot } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

interface Breadcrumb {
  label: string;
  url: string;
  current: boolean;
}

@Component({
  selector: 'app-breadcrumbs',
  imports: [RouterLink],
  template: `
    @if (breadcrumbs().length > 1) {
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          @for (item of breadcrumbs(); track item.url + item.label) {
            <li>
              @if (item.current) {
                <span aria-current="page">{{ item.label }}</span>
              } @else {
                <a [routerLink]="item.url">{{ item.label }}</a>
              }
            </li>
          }
        </ol>
      </nav>
    }
  `,
  styles: `
    :host { display: block; }
    .breadcrumbs { max-width: 90rem; margin: 0 auto; padding: .9rem clamp(1.25rem, 5vw, 5rem) 0; }
    ol { display: flex; flex-wrap: wrap; gap: .5rem; margin: 0; padding: 0; list-style: none; }
    li { color: var(--ink-muted); font-size: .82rem; }
    li + li::before { content: '/'; margin-right: .5rem; color: var(--ink-muted); }
    a { color: inherit; text-underline-offset: .2em; }
    [aria-current="page"] { color: var(--ink); font-weight: 650; }
    a:focus-visible { outline: 3px solid var(--signal); outline-offset: 3px; }
  `,
})
export class BreadcrumbsComponent {
  private readonly router = inject(Router);
  readonly breadcrumbs = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.collectBreadcrumbs(this.router.routerState.snapshot.root)),
    ),
    { initialValue: this.collectBreadcrumbs(this.router.routerState.snapshot.root) },
  );

  private collectBreadcrumbs(root: ActivatedRouteSnapshot): Breadcrumb[] {
    const result: Breadcrumb[] = [
      { label: 'Início', url: '/', current: this.router.url === '/' },
    ];
    let route: ActivatedRouteSnapshot | undefined = root;
    let path = '';

    while (route) {
      const segments = route.url.map((segment) => segment.path).filter(Boolean);
      if (segments.length) path += `/${segments.join('/')}`;
      const label = route.data['breadcrumb'];
      const previous = result[result.length - 1];
      if (typeof label === 'string' && label && (previous.label !== label || previous.url !== path)) {
        result.push({ label, url: path || '/', current: false });
      }
      route = route.firstChild ?? undefined;
    }

    return result.map((item, index) => ({
      ...item,
      current: index === result.length - 1,
    }));
  }
}
