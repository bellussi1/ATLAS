import { DOCUMENT } from '@angular/common';
import { afterNextRender, Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { IdeologyAtlasComponent } from '@ideologies/components/ideology-atlas/ideology-atlas.component';
import { IdeologyReadingIndexComponent } from '@ideologies/components/reading-index/reading-index.component';
import { liberalismAtlas } from '@ideologies/data/liberalism-atlas';

@Component({
  selector: 'app-liberalism-atlas-page',
  imports: [IdeologyAtlasComponent, IdeologyReadingIndexComponent, RouterLink],
  templateUrl: './liberalism-atlas-page.component.html',
  styleUrl: './liberalism-atlas-page.component.scss',
})
export class LiberalismAtlasPage {
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly repository = inject(ContentRepository);
  readonly config = liberalismAtlas;
  readonly progress = signal(0);
  readonly active = signal('atlas-section-rede');
  readonly previous = signal<string | null>(null);
  readonly reduced = signal(false);
  readonly chapters = [
    { anchor: 'atlas-section-rede', title: 'Rede' },
    { anchor: 'atlas-section-tempo', title: 'Tempo' },
    { anchor: 'atlas-section-imagens', title: 'Imagens e documentos' },
  ] as const;
  readonly atlas = this.repository.knowledgeGraph.atlases.find(
    (item) => item.id === this.config.atlasId,
  )!;

  constructor() {
    afterNextRender(() => {
      const win = this.document.defaultView!;
      if (!win || typeof win.requestAnimationFrame !== 'function') return;
      let frame = 0;
      const measure = () => {
        const sections = this.chapters.flatMap(({ anchor }) => {
          const section = this.host.nativeElement.querySelector<HTMLElement>(`#${anchor}`);
          return section ? [section] : [];
        });
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
        for (const section of sections)
          if (section.getBoundingClientRect().top < 160) active = section.id;
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
      const observer =
        typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule);
      observer?.observe(this.host.nativeElement);
      schedule();
      this.destroyRef.onDestroy(() => {
        win.removeEventListener('scroll', schedule);
        win.removeEventListener('resize', schedule);
        win.cancelAnimationFrame(frame);
        observer?.disconnect();
        this.document.documentElement.classList.remove('atlas-reduced-motion');
      });
    });
  }

  navigateChapter(event: MouseEvent, anchor: string): void {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    this.go(anchor);
  }

  go(anchor: string): void {
    if (anchor !== this.active()) this.previous.set(this.active());
    this.active.set(anchor);
    void this.router.navigate([], {
      relativeTo: this.route,
      fragment: anchor,
      queryParamsHandling: 'preserve',
      replaceUrl: true,
    });
    this.host.nativeElement.querySelector<HTMLElement>(`#${anchor}`)?.focus({
      preventScroll: true,
    });
  }

  returnToPrevious(): void {
    const previous = this.previous();
    if (previous) this.go(previous);
  }

  toggleMotion(): void {
    this.reduced.update((value) => !value);
    this.document.documentElement.classList.toggle('atlas-reduced-motion', this.reduced());
  }
}
