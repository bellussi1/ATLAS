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
import { BehaviorSubject, catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';

import { ContentRepository } from '../core/content-repository';
import type { Source } from '../core/content-schema';
import type { IdeologyDossier } from '../core/ideology-page-schema';
import { IdeologyBlockComponent } from '../shared/ideology-block';
import { reproducibleAsset } from '../shared/licensed-asset';

interface PageState {
  status: 'loading' | 'error' | 'missing' | 'ready';
  dossier: IdeologyDossier | null;
}
@Component({
  selector: 'app-ideology-page',
  imports: [RouterLink, IdeologyBlockComponent],
  templateUrl: './ideology-page.html',
  styleUrl: './ideology-page.scss',
})
export class IdeologyPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly repository = inject(ContentRepository);
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
          this.repository.loadIdeology(params.get('slug') ?? '').pipe(
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
  go(anchor: string): void {
    this.previous.set(this.active());
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
