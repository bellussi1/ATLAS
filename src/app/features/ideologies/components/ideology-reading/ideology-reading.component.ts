import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { legacyChapterAnchors } from '@ideologies/models/ideology-chapters';
import type { IdeologyReadingSection } from '@ideologies/models/ideology-reading-section';

import { IdeologyReadingIndexComponent } from '../reading-index/reading-index.component';

@Component({
  selector: 'app-ideology-reading',
  imports: [IdeologyReadingIndexComponent],
  templateUrl: './ideology-reading.component.html',
  styleUrl: './ideology-reading.component.scss',
  host: { '[class.atlas-layout]': "layout() === 'atlas'", '[attr.data-tone]': 'tone()' },
})
export class IdeologyReadingComponent {
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly selected = signal('');
  readonly sections = input.required<readonly IdeologyReadingSection[]>();
  readonly layout = input<'narrative' | 'atlas'>('narrative');
  readonly activeOffset = input(150);
  readonly active = computed(() =>
    this.sections().some((s) => s.anchor === this.selected())
      ? this.selected()
      : (this.sections()[0]?.anchor ?? ''),
  );
  /** Each chapter tints the reading surface, so scrolling reads as moving between rooms. */
  readonly tone = computed(
    () =>
      Math.max(
        0,
        this.sections().findIndex((s) => s.anchor === this.active()),
      ) % 6,
  );
  readonly progress = signal(0);
  readonly previous = signal<string | null>(null);
  readonly reduced = signal(false);

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.document.documentElement.classList.remove('atlas-reduced-motion');
    });
    afterNextRender(() => {
      const win = this.document.defaultView;
      if (!win || typeof win.requestAnimationFrame !== 'function') return;
      const legacy = legacyChapterAnchors[win.location.hash.slice(1)];
      if (legacy && this.section(legacy)) {
        this.go(legacy);
        this.section(legacy)?.scrollIntoView();
      }
      let frame = 0;
      const measure = () => {
        const sections = this.sections().flatMap(({ anchor }) => this.section(anchor) ?? []);
        if (!sections.length) return;
        const top = sections[0].getBoundingClientRect().top + win.scrollY;
        const bottom = sections.at(-1)!.getBoundingClientRect().bottom + win.scrollY;
        this.progress.set(
          Math.round(
            Math.max(
              0,
              Math.min(
                100,
                ((win.scrollY + win.innerHeight - top) / Math.max(1, bottom - top)) * 100,
              ),
            ),
          ),
        );
        let active = sections[0].id;
        for (const section of sections) {
          if (section.getBoundingClientRect().top < this.activeOffset()) active = section.id;
        }
        this.selected.set(active);
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
      const observer =
        typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule);
      observer?.observe(this.host.nativeElement);
      schedule();
      this.destroyRef.onDestroy(() => {
        win.removeEventListener('scroll', schedule);
        win.removeEventListener('resize', schedule);
        win.cancelAnimationFrame(frame);
        observer?.disconnect();
      });
    });
  }

  navigateChapter(event: MouseEvent, anchor: string): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    this.go(anchor);
  }

  go(anchor: string): void {
    const section = this.section(anchor);
    if (!section) return;
    if (anchor !== this.active()) this.previous.set(this.active());
    this.selected.set(anchor);
    void this.router.navigate([], {
      relativeTo: this.route,
      fragment: anchor,
      queryParamsHandling: 'preserve',
      replaceUrl: true,
    });
    section.focus({ preventScroll: true });
  }

  returnToPrevious(): void {
    const previous = this.previous();
    if (previous) this.go(previous);
  }

  toggleMotion(): void {
    this.reduced.update((value) => !value);
    this.document.documentElement.classList.toggle('atlas-reduced-motion', this.reduced());
  }

  private section(anchor: string): HTMLElement | undefined {
    if (!this.sections().some((section) => section.anchor === anchor)) return undefined;
    const section = this.document.getElementById(anchor);
    return section && this.host.nativeElement.contains(section) ? section : undefined;
  }
}
