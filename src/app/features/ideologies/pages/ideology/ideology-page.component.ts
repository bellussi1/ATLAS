import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { pendingUntilEvent, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { reproducibleAsset } from '@core/content/media/asset-license';
import type { Source } from '@core/content/models/content-schema';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { IdeologyBlockComponent } from '@ideologies/components/ideology-block/ideology-block.component';
import { KnowledgeTextComponent } from '@ideologies/components/knowledge-text/knowledge-text.component';
import { IdeologyReadingIndexComponent } from '@ideologies/components/reading-index/reading-index.component';
import type { IdeologyDossier } from '@ideologies/models/ideology-page.schema';
import { IdeologyRepository } from '@ideologies/services/ideology-repository.service';
import { BehaviorSubject, catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';

interface PageState {
  status: 'loading' | 'error' | 'missing' | 'ready';
  dossier: IdeologyDossier | null;
}
@Component({
  selector: 'app-ideology-page',
  imports: [
    RouterLink,
    IdeologyBlockComponent,
    KnowledgeTextComponent,
    IdeologyReadingIndexComponent,
  ],
  templateUrl: './ideology-page.component.html',
  styleUrl: './ideology-page.component.scss',
})
export class IdeologyPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly repository = inject(ContentRepository);
  private readonly ideologies = inject(IdeologyRepository);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly title = inject(Title);
  private readonly retry = new BehaviorSubject(0);
  private readonly injector = inject(Injector);
  readonly state = signal<PageState>({ status: 'loading', dossier: null });
  readonly active = signal('introducao');
  readonly percent = signal(0);
  readonly previous = signal<string | null>(null);
  readonly reduced = signal(false);
  readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly page = computed(() => this.state().dossier?.page);
  readonly minutes = computed(
    () => this.page()?.chapters.reduce((sum, c) => sum + c.minutes, 0) ?? 0,
  );
  readonly portrait = computed(() => {
    const page = this.page();
    const atlas = this.repository.knowledgeGraph.atlases.find((a) => a.id === page?.atlasId);
    const asset = atlas?.assetLicenses.find((a) => a.id === page?.portrait?.assetId);
    return asset ? reproducibleAsset(atlas, asset.assetPath) : undefined;
  });
  readonly portraitTitle = computed(
    () =>
      this.repository.knowledgeGraph.atlases
        .flatMap((a) => a.entities)
        .find((e) => e.id === this.page()?.portrait?.entityId)?.title ?? 'Retrato',
  );

  constructor() {
    combineLatest([this.route.paramMap, this.retry])
      .pipe(
        switchMap(([params]) =>
          this.ideologies.loadIdeology(params.get('slug') ?? 'marxismo').pipe(
            pendingUntilEvent(this.injector),
            map((dossier): PageState => ({ status: dossier ? 'ready' : 'missing', dossier })),
            catchError(() => of<PageState>({ status: 'error', dossier: null })),
            startWith<PageState>({ status: 'loading', dossier: null }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((state) => {
        this.state.set(state);
        this.title.setTitle(
          state.dossier
            ? `${state.dossier.page.title}: ideias e divergências — ATLAS`
            : state.status === 'missing'
              ? 'Página não encontrada — ATLAS'
              : 'Leitura de ideologia — ATLAS',
        );
      });
    afterNextRender(() => {
      const win = this.document.defaultView!;
      let frame = 0;
      const measure = () => {
        const chapters = [
          ...this.host.nativeElement.querySelectorAll<HTMLElement>('.ideology-chapter'),
        ];
        if (!chapters.length) return;
        const top = chapters[0].getBoundingClientRect().top + win.scrollY;
        const bottom = chapters.at(-1)!.getBoundingClientRect().bottom + win.scrollY;
        this.percent.set(
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
        let active = chapters[0].id;
        for (const chapter of chapters)
          if (chapter.getBoundingClientRect().top < 150) active = chapter.id;
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
      const observer = new ResizeObserver(schedule);
      observer.observe(this.host.nativeElement);
      schedule();
      this.destroyRef.onDestroy(() => {
        win.removeEventListener('scroll', schedule);
        win.removeEventListener('resize', schedule);
        win.cancelAnimationFrame(frame);
        observer.disconnect();
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
    this.document.getElementById(anchor)?.focus({ preventScroll: true });
  }
  returnToPrevious(): void {
    const previous = this.previous();
    if (previous) this.go(previous);
  }
  toggleMotion(): void {
    this.reduced.update((value) => !value);
    this.document.documentElement.classList.toggle('atlas-reduced-motion', this.reduced());
  }
  reload(): void {
    this.retry.next(this.retry.value + 1);
  }
  sources(ids: string[]): Source[] {
    return ids.flatMap(
      (id) =>
        [
          ...(this.state().dossier?.supplement.sources ?? []),
          ...this.repository.knowledgeGraph.atlases.flatMap((a) => a.sources),
        ].find((s) => s.id === id) ?? [],
    );
  }
}
