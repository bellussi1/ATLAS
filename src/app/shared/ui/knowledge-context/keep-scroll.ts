import { type Router, Scroll } from '@angular/router';
import { filter, take } from 'rxjs';

/**
 * Sheets add browser history entries that hold no page of their own. When the panel pops
 * them, the router restores a stored scroll position for the same URL, which throws the
 * reader back to the top. This puts the anchor (or, without one, the scroll offset) back
 * once that restoration has run (it is applied just after the event), so lifting a sheet never moves the page.
 */
export function keepScrollAnchor(router: Router, win: Window, anchor: Element | null): void {
  const top = anchor?.getBoundingClientRect().top;
  const offset = win.scrollY;
  const restore = () => {
    const delta =
      anchor?.isConnected && top !== undefined
        ? anchor.getBoundingClientRect().top - top
        : win.scrollY - offset;
    if (delta) win.scrollBy({ top: anchor?.isConnected ? delta : -delta, behavior: 'instant' });
  };
  const wait = router.events
    .pipe(
      filter((event) => event instanceof Scroll),
      take(1),
    )
    .subscribe(() => win.setTimeout(restore));
  win.setTimeout(() => wait.unsubscribe(), 1000);
}
