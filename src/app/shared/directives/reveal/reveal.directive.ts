import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Directive, ElementRef, inject, PLATFORM_ID } from '@angular/core';

let observer: IntersectionObserver | undefined;

/**
 * Reveals a block once, just before it scrolls into view. Content stays visible
 * without JavaScript and for reduced motion: the hidden state only exists under
 * `html.atlas-reveal`, and anything already on screen is shown without animation.
 */
@Directive({ selector: '[appReveal]', host: { class: 'atlas-reveal-item' } })
export class AtlasRevealDirective {
  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const view = element.ownerDocument.defaultView;
    if (
      !view?.IntersectionObserver ||
      view.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      element.ownerDocument.documentElement.classList.contains('atlas-reduced-motion')
    )
      return;
    const top = element.getBoundingClientRect().top;
    if (top < view.innerHeight) return;
    element.ownerDocument.documentElement.classList.add('atlas-reveal');
    element.classList.add('is-pending');
    observer ??= new view.IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.remove('is-pending');
          observer?.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(element);
    inject(DestroyRef).onDestroy(() => observer?.unobserve(element));
  }
}
