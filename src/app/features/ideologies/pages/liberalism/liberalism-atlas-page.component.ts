import { DOCUMENT } from '@angular/common';
import { afterNextRender, Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { IdeologyAtlasComponent } from '@ideologies/components/ideology-atlas/ideology-atlas.component';
import { liberalismAtlas } from '@ideologies/data/liberalism-atlas';

@Component({
  selector: 'app-liberalism-atlas-page',
  imports: [IdeologyAtlasComponent, RouterLink],
  templateUrl: './liberalism-atlas-page.component.html',
  styleUrl: './liberalism-atlas-page.component.scss',
})
export class LiberalismAtlasPage {
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly repository = inject(ContentRepository);
  readonly config = liberalismAtlas;
  readonly progress = signal(0);
  readonly active = signal('atlas-section-rede');
  readonly chapters = [
    { id: 'atlas-section-rede', title: 'Rede' },
    { id: 'atlas-section-tempo', title: 'Tempo' },
    { id: 'atlas-section-imagens', title: 'Imagens e documentos' },
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
        const sections = this.chapters.flatMap(({ id }) => {
          const section = this.host.nativeElement.querySelector<HTMLElement>(`#${id}`);
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
      });
    });
  }

  go(anchor: string): void {
    this.active.set(anchor);
    void this.router.navigate([], {
      fragment: anchor,
      queryParamsHandling: 'preserve',
      replaceUrl: true,
    });
    this.host.nativeElement.querySelector<HTMLElement>(`#${anchor}`)?.focus({
      preventScroll: true,
    });
  }
}
