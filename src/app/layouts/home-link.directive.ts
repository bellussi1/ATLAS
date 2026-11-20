import { DOCUMENT, Location } from '@angular/common';
import { Directive, inject } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Logo link to the home page. Elsewhere it navigates like a router link; already on the home
 * page it glides back to the top instead of jumping. Modified clicks (new tab, etc.) keep the
 * browser default through the real `href`.
 */
@Directive({
  selector: 'a[appHomeLink]',
  host: { '(click)': 'onClick($event)' },
})
export class HomeLinkDirective {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly view = inject(DOCUMENT).defaultView;

  onClick(event: MouseEvent): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    if (this.router.url.split(/[?#]/)[0] !== '/') {
      void this.router.navigateByUrl('/');
      return;
    }
    const reduce = this.view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.view?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    if (this.router.url !== '/') this.location.replaceState('/');
  }
}
