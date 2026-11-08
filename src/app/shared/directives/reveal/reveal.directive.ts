import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Directive, ElementRef, inject, PLATFORM_ID } from '@angular/core';
import { prefersReducedMotion } from '@shared/motion/prefers-reduced-motion';

let observer: IntersectionObserver | undefined;
let queued = new Set<HTMLElement>();
let scheduled = false;

/** Hides one block and watches it until the first intersection. */
function hide(element: HTMLElement) {
  element.ownerDocument.documentElement.classList.add('atlas-reveal');
  element.classList.add('is-pending');
  if (!observer)
    observer = new IntersectionObserver(
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
}

/**
 * Reads every pending rectangle before writing any class, so a page with many
 * revealed blocks causes a single layout instead of one per directive.
 */
function flush() {
  scheduled = false;
  const items = [...queued];
  queued = new Set();
  const view = items[0]?.ownerDocument.defaultView;
  if (!view) return;
  const tops = items.map((element) => element.getBoundingClientRect().top);
  for (let index = 0; index < items.length; index++)
    if (tops[index] >= view.innerHeight) hide(items[index]);
}

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
    if (!view?.IntersectionObserver || prefersReducedMotion(element.ownerDocument)) return;
    queued.add(element);
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(flush);
    inject(DestroyRef).onDestroy(() => {
      queued.delete(element);
      observer?.unobserve(element);
    });
  }
}
