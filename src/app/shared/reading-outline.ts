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
  template: `
    <div class="reading-position">
      <span>Posição no texto</span
      ><progress max="100" [value]="percent()" aria-label="Posição no texto"></progress>
    </div>
    <details>
      <summary>Nesta leitura · {{ sections().length }} seções</summary>
      <nav aria-label="Seções desta leitura">
        @for (section of sections(); track section.heading; let index = $index) {
          <a
            [routerLink]="[]"
            queryParamsHandling="preserve"
            [fragment]="'section-' + index"
            [attr.aria-current]="active() === index ? 'location' : null"
            (click)="focusSection(index)"
            >{{ index + 1 }}. {{ section.heading }}</a
          >
        }
      </nav>
    </details>
  `,
  styles: `
    :host {
      display: block;
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--color-canvas);
      max-height: 50dvh;
      overflow: auto;
      margin-top: 2rem;
      padding-block: 0.75rem;
      border-block: 1px solid var(--color-border-strong);
    }
    .reading-position {
      display: flex;
      align-items: center;
      gap: 1rem;
      font: 0.75rem/1.5 var(--font-mono);
    }
    progress {
      height: 0.3rem;
      width: 100%;
      flex: 1;
      accent-color: var(--color-accent);
      appearance: none;
      border: 0;
      background: var(--color-border);
    }
    progress::-webkit-progress-bar {
      background: var(--color-border);
    }
    progress::-webkit-progress-value {
      background: var(--color-accent);
    }
    progress::-moz-progress-bar {
      background: var(--color-accent);
    }
    summary {
      cursor: pointer;
      min-height: 2.75rem;
      padding-block: 0.75rem;
      font-weight: 600;
    }
    nav {
      display: grid;
    }
    a {
      display: flex;
      align-items: center;
      min-height: 2.75rem;
      color: var(--color-ink-muted);
      text-underline-offset: 0.2em;
      padding-left: 0.75rem;
      border-left: 3px solid transparent;
    }
    a[aria-current] {
      color: var(--color-accent);
      border-left-color: var(--color-accent);
    }
  `,
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
