import { DOCUMENT, ViewportScroller } from '@angular/common';
import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-reading-outline',
  imports: [RouterLink],
  templateUrl: './reading-outline.component.html',
  styleUrl: './reading-outline.component.scss',
})
export class AtlasReadingOutlineComponent {
  readonly sections = input.required<readonly { heading: string }[]>();
  readonly percent = signal(0);
  readonly active = signal(0);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly scroller = inject(ViewportScroller);
  private readonly destroyRef = inject(DestroyRef);
  constructor() {
    afterNextRender(() => {
      const win = this.document.defaultView!;
      this.scroller.setOffset(() => [
        0,
        this.host.nativeElement.getBoundingClientRect().height + 24,
      ]);
      let frame = 0;
      const measure = () => {
        const article = this.host.nativeElement.closest('article')!;
        const sections = Array.from(article.querySelectorAll<HTMLElement>('.article-section'));
        if (!sections.length) return;
        const first = sections[0].getBoundingClientRect().top + win.scrollY;
        const last = sections[sections.length - 1].getBoundingClientRect().bottom + win.scrollY;
        const viewportEnd = win.scrollY + win.innerHeight;
        this.percent.set(
          Math.round(
            Math.max(0, Math.min(100, ((viewportEnd - first) / Math.max(1, last - first)) * 100)),
          ),
        );
        let active = 0;
        sections.forEach((section, index) => {
          if (
            section.getBoundingClientRect().top <=
            this.host.nativeElement.getBoundingClientRect().bottom + 32
          )
            active = index;
        });
        this.active.set(active);
      };
      const schedule = () => {
        if (!frame)
          frame = win.requestAnimationFrame(() => {
            frame = 0;
            measure();
          });
      };
      win.addEventListener('scroll', schedule, { passive: true });
      win.addEventListener('resize', schedule);
      schedule();
      this.destroyRef.onDestroy(() => {
        this.scroller.setOffset([0, 0]);
        win.removeEventListener('scroll', schedule);
        win.removeEventListener('resize', schedule);
        win.cancelAnimationFrame(frame);
      });
    });
  }
  focusSection(index: number): void {
    const details = this.host.nativeElement.querySelector('details');
    if (details) details.open = false;
    this.active.set(index);
    this.document.getElementById('section-' + index)?.focus({ preventScroll: true });
  }
}
