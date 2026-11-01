import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { type ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

interface Breadcrumb {
  label: string;
  url: string;
  current: boolean;
}

@Component({
  selector: 'app-breadcrumbs',
  imports: [RouterLink],
  templateUrl: './breadcrumbs.component.html',
  styleUrl: './breadcrumbs.component.scss',
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
    const result: Breadcrumb[] = [{ label: 'Início', url: '/', current: this.router.url === '/' }];
    let route: ActivatedRouteSnapshot | undefined = root;
    let path = '';

    while (route) {
      const segments = route.url.map((segment) => segment.path).filter(Boolean);
      if (segments.length) path += `/${segments.join('/')}`;
      const label = route.data['breadcrumb'];
      const previous = result[result.length - 1];
      if (
        typeof label === 'string' &&
        label &&
        (previous.label !== label || previous.url !== path)
      ) {
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
