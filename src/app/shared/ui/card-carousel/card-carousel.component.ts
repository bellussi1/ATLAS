import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

let nextCarouselId = 0;

/**
 * Horizontal row of cards that keeps every item in the DOM: the prerendered page
 * still contains the whole list, and the controls only move the scroll position.
 * Projected items must carry the `carousel-item` class (see ui-primitives.scss).
 */
@Component({
  selector: 'app-card-carousel',
  templateUrl: './card-carousel.component.html',
  styleUrl: './card-carousel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardCarouselComponent {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  readonly label = input.required<string>();
  readonly trackId = `card-carousel-${nextCarouselId++}`;
  readonly total = signal(0);
  readonly firstVisible = signal(0);
  readonly lastVisible = signal(0);
  readonly atStart = signal(true);
  readonly atEnd = signal(true);

  constructor() {
    afterNextRender(() => {
      const track = this.track().nativeElement;
      if (typeof ResizeObserver !== 'undefined') {
        const resize = new ResizeObserver(() => this.update());
        resize.observe(track);
        this.destroyRef.onDestroy(() => resize.disconnect());
      }
      if (typeof MutationObserver !== 'undefined') {
        const mutation = new MutationObserver(() => this.update());
        mutation.observe(track, { childList: true });
        this.destroyRef.onDestroy(() => mutation.disconnect());
      }
      this.update();
    });
  }

  /** Reads the scroll geometry; visible ranges come from the items' offsets. */
  update(): void {
    const track = this.track().nativeElement;
    const left = track.scrollLeft;
    const right = left + track.clientWidth;
    const items = Array.from(track.children) as HTMLElement[];
    const visible = items.flatMap((item, index) => {
      const start = item.offsetLeft;
      const end = start + item.offsetWidth;
      return end > left + 4 && start < right - 4 ? [index] : [];
    });
    this.total.set(items.length);
    this.firstVisible.set(visible[0] ?? 0);
    this.lastVisible.set(visible.at(-1) ?? 0);
    this.atStart.set(left <= 2);
    this.atEnd.set(left + track.clientWidth >= track.scrollWidth - 2);
  }

  page(direction: 1 | -1): void {
    if (direction < 0 ? this.atStart() : this.atEnd()) return;
    const track = this.track().nativeElement;
    const reduced = this.document.defaultView?.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    track.scrollBy({
      left: direction * track.clientWidth * 0.85,
      behavior: reduced ? 'auto' : 'smooth',
    });
  }
}
