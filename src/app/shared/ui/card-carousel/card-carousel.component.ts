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
import { prefersReducedMotion } from '@shared/motion/prefers-reduced-motion';

let nextCarouselId = 0;
/** These keep their own behaviour; a drag starts only on the card surface. */
const interactiveSelector = 'a, button, input, select, textarea, summary, [contenteditable="true"]';
const dragThreshold = 6;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Horizontal carousel: arrows, a progress bar that can be dragged, keyboard paging, drag
 * to scroll with a mouse or pen, and snapping. Items stay in the DOM, so the prerendered
 * page keeps the whole list. Items carry the `carousel-item` class (ui-primitives.scss).
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
  private readonly bar = viewChild.required<ElementRef<HTMLElement>>('bar');
  readonly label = input.required<string>();
  readonly hint = input('Arraste ou use as setas');
  readonly trackId = `card-carousel-${nextCarouselId++}`;
  readonly total = signal(0);
  readonly firstVisible = signal(0);
  readonly lastVisible = signal(0);
  readonly atStart = signal(true);
  readonly atEnd = signal(true);
  readonly scrollable = signal(false);
  readonly thumbSize = signal(100);
  readonly thumbOffset = signal(0);
  readonly dragging = signal(false);
  private drag: { pointer: number; startX: number; startLeft: number; moved: boolean } | null =
    null;
  private seeking: number | null = null;
  private suppressClick = false;

  constructor() {
    afterNextRender(() => {
      const track = this.track().nativeElement;
      // A drag that ends over a card must not also press it.
      const swallowClick = (event: MouseEvent) => {
        if (!this.suppressClick) return;
        event.preventDefault();
        event.stopPropagation();
      };
      track.addEventListener('click', swallowClick, true);
      this.destroyRef.onDestroy(() => track.removeEventListener('click', swallowClick, true));
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

  /** Reads the scroll geometry; the visible range and progress come from the items' offsets. */
  update(): void {
    const track = this.track().nativeElement;
    const left = track.scrollLeft;
    const max = track.scrollWidth - track.clientWidth;
    const right = left + track.clientWidth;
    const items = this.items(track);
    const visible = items.flatMap((item, index) => {
      const start = item.offsetLeft;
      return start + item.offsetWidth > left + 4 && start < right - 4 ? [index] : [];
    });
    const size = clamp((track.clientWidth / Math.max(track.scrollWidth, 1)) * 100, 12, 100);
    this.total.set(items.length);
    this.firstVisible.set(visible[0] ?? 0);
    this.lastVisible.set(visible.at(-1) ?? 0);
    this.atStart.set(left <= 2);
    this.atEnd.set(left >= max - 2);
    this.scrollable.set(max > 2);
    this.thumbSize.set(size);
    this.thumbOffset.set(max > 0 ? (left / max) * (100 - size) : 0);
  }

  /** Moves about one viewport and lands on a card edge in that direction. */
  page(direction: 1 | -1): void {
    const track = this.track().nativeElement;
    const max = track.scrollWidth - track.clientWidth;
    const current = track.scrollLeft;
    const step = track.clientWidth * 0.85;
    const items = this.items(track);
    let left: number;
    if (direction > 0) {
      const ahead = items.filter((item) => item.offsetLeft > current + 4);
      const reachable = ahead.filter((item) => item.offsetLeft <= current + step + 4);
      left = (reachable.at(-1) ?? ahead[0])?.offsetLeft ?? max;
    } else {
      const behind = items.filter((item) => item.offsetLeft < current - 4);
      const reachable = behind.filter((item) => item.offsetLeft >= current - step - 4);
      left = (reachable[0] ?? behind.at(-1))?.offsetLeft ?? 0;
    }
    this.glide(track, clamp(left, 0, max), true);
  }

  /** Brings one card to the centre of the track, for selections made outside it. */
  revealIndex(index: number): void {
    const track = this.track().nativeElement;
    const item = this.items(track)[index];
    if (!item) return;
    const max = track.scrollWidth - track.clientWidth;
    const left = item.offsetLeft - (track.clientWidth - item.offsetWidth) / 2;
    this.glide(track, clamp(left, 0, max), true);
  }

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || event.pointerType === 'touch' || !this.scrollable()) return;
    if ((event.target as Element).closest(interactiveSelector)) return;
    this.drag = {
      pointer: event.pointerId,
      startX: event.clientX,
      startLeft: this.track().nativeElement.scrollLeft,
      moved: false,
    };
  }

  onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || drag.pointer !== event.pointerId) return;
    const delta = event.clientX - drag.startX;
    const track = this.track().nativeElement;
    if (!drag.moved) {
      if (Math.abs(delta) < dragThreshold) return;
      drag.moved = true;
      track.setPointerCapture(event.pointerId);
      this.dragging.set(true);
    }
    track.scrollLeft = drag.startLeft - delta;
  }

  onPointerUp(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || drag.pointer !== event.pointerId) return;
    this.drag = null;
    if (!drag.moved) return;
    this.dragging.set(false);
    this.suppressClick = true;
    setTimeout(() => (this.suppressClick = false));
    this.snap();
  }

  onBarDown(event: PointerEvent): void {
    if (event.button !== 0 || !this.scrollable()) return;
    this.seeking = event.pointerId;
    this.bar().nativeElement.setPointerCapture(event.pointerId);
    this.seek(event.clientX);
  }

  onBarMove(event: PointerEvent): void {
    if (this.seeking === event.pointerId) this.seek(event.clientX);
  }

  onBarUp(event: PointerEvent): void {
    if (this.seeking === event.pointerId) this.seeking = null;
  }

  onKeydown(event: KeyboardEvent): void {
    const track = this.track().nativeElement;
    if (event.target !== track) return;
    switch (event.key) {
      case 'ArrowRight':
        this.page(1);
        break;
      case 'ArrowLeft':
        this.page(-1);
        break;
      case 'Home':
        this.glide(track, 0, true);
        break;
      case 'End':
        this.glide(track, track.scrollWidth, true);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  private items(track: HTMLElement): HTMLElement[] {
    return Array.from(track.children) as HTMLElement[];
  }

  /** Snaps to the card nearest the release point, so a drag never stops between cards. */
  private snap(): void {
    const track = this.track().nativeElement;
    const nearest = this.items(track).reduce<HTMLElement | undefined>(
      (best, item) =>
        !best ||
        Math.abs(item.offsetLeft - track.scrollLeft) < Math.abs(best.offsetLeft - track.scrollLeft)
          ? item
          : best,
      undefined,
    );
    if (!nearest) return;
    const max = track.scrollWidth - track.clientWidth;
    this.glide(track, clamp(nearest.offsetLeft, 0, max), true);
  }

  private seek(clientX: number): void {
    const track = this.track().nativeElement;
    const bar = this.bar().nativeElement.getBoundingClientRect();
    const thumb = (bar.width * this.thumbSize()) / 100;
    const ratio = clamp((clientX - bar.left - thumb / 2) / Math.max(bar.width - thumb, 1), 0, 1);
    track.scrollLeft = ratio * (track.scrollWidth - track.clientWidth);
  }

  private glide(track: HTMLElement, left: number, smooth: boolean): void {
    const animate = smooth && !prefersReducedMotion(this.document);
    track.scrollTo({ left, behavior: animate ? 'smooth' : 'auto' });
  }
}
