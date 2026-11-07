import { Component, computed, inject, Injector, signal } from '@angular/core';
import { pendingUntilEvent, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { Source } from '@core/content/models/content-schema';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { ChapterReviewComponent } from '@ideologies/components/chapter-review/chapter-review.component';
import { EditorialSourcesComponent } from '@ideologies/components/editorial-sources/editorial-sources.component';
import { IdeologyBlockComponent } from '@ideologies/components/ideology-block/ideology-block.component';
import { IdeologyPosterComponent } from '@ideologies/components/ideology-poster/ideology-poster.component';
import { IdeologyReadingComponent } from '@ideologies/components/ideology-reading/ideology-reading.component';
import { KnowledgeTextComponent } from '@ideologies/components/knowledge-text/knowledge-text.component';
import { companionOf, connectionsOf, paletteOf } from '@ideologies/data/ideology-readings';
import { terms } from '@ideologies/data/knowledge-vocabulary';
import { chapterGroup } from '@ideologies/models/ideology-chapters';
import type { IdeologyDossier } from '@ideologies/models/ideology-page.schema';
import { IdeologyRepository } from '@ideologies/services/ideology-repository.service';
import { chapterReviews } from '@ideologies/utils/chapter-review';
import { graphVocabulary } from '@ideologies/utils/graph-vocabulary';
import { planPageMedia } from '@ideologies/utils/page-media-plan';
import { AtlasRevealDirective } from '@shared/directives/reveal/reveal.directive';
import { AtlasGeometricMosaicComponent } from '@shared/ui/geometric-mosaic/geometric-mosaic.component';
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
    ChapterReviewComponent,
    KnowledgeTextComponent,
    IdeologyReadingComponent,
    EditorialSourcesComponent,
    IdeologyPosterComponent,
    AtlasRevealDirective,
    AtlasGeometricMosaicComponent,
  ],
  templateUrl: './ideology-page.component.html',
  styleUrl: './ideology-page.component.scss',
})
export class IdeologyPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly repository = inject(ContentRepository);
  private readonly ideologies = inject(IdeologyRepository);
  private readonly title = inject(Title);
  private readonly retry = new BehaviorSubject(0);
  private readonly injector = inject(Injector);
  readonly state = signal<PageState>({ status: 'loading', dossier: null });
  readonly page = computed(() => this.state().dossier?.page);
  readonly basePath = computed(() => `/${this.page()?.slug ?? ''}`);
  readonly palette = computed(() => {
    const page = this.page();
    return page ? paletteOf(page) : 'atlas';
  });
  readonly roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  /** Text for the always-present status region: screen readers announce changes to a live region that already exists. */
  readonly stateAnnouncement = computed(() => {
    if (this.page()) return '';
    switch (this.state().status) {
      case 'loading':
        return 'Carregando a leitura.';
      case 'error':
        return 'Não foi possível carregar esta leitura.';
      default:
        return 'Esta leitura ainda não está disponível.';
    }
  });
  readonly sections = computed(() =>
    (this.page()?.chapters ?? []).map((c) => ({
      anchor: c.anchor,
      title: c.title,
      minutes: c.minutes,
      group: chapterGroup(c.id),
    })),
  );
  readonly mediaPlan = computed(() => {
    const page = this.page();
    return page ? planPageMedia(page, this.repository.knowledgeGraph) : new Map();
  });
  /** Recall question and spaced revisit per chapter, derived from the graph. */
  readonly reviews = computed(() => {
    const page = this.page();
    if (!page) return [];
    const graph = this.repository.knowledgeGraph;
    return chapterReviews(
      page.chapters,
      graph.atlases.find((a) => a.id === page.atlasId),
      graphVocabulary(graph, terms),
    );
  });
  readonly minutes = computed(
    () => this.page()?.chapters.reduce((sum, c) => sum + c.minutes, 0) ?? 0,
  );
  /** Minutes left after each chapter, for the reading measure in the margin. */
  readonly remaining = computed(() => {
    const chapters = this.page()?.chapters ?? [];
    return chapters.map((_, i) => chapters.slice(i + 1).reduce((sum, c) => sum + c.minutes, 0));
  });
  readonly companion = computed(() => companionOf(this.page()?.slug ?? ''));
  readonly connections = computed(() => connectionsOf(this.page()?.slug ?? ''));

  constructor() {
    combineLatest([this.route.paramMap, this.retry])
      .pipe(
        switchMap(([params]) =>
          this.ideologies
            .loadIdeology(params.get('slug') ?? this.route.snapshot.data['slug'] ?? 'marxismo')
            .pipe(
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
