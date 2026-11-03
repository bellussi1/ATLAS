import { Component, computed, inject, Injector, signal } from '@angular/core';
import { pendingUntilEvent, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { Source } from '@core/content/models/content-schema';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { EditorialSourcesComponent } from '@ideologies/components/editorial-sources/editorial-sources.component';
import { IdeologyBlockComponent } from '@ideologies/components/ideology-block/ideology-block.component';
import { IdeologyDeskComponent } from '@ideologies/components/ideology-desk/ideology-desk.component';
import { IdeologyPosterComponent } from '@ideologies/components/ideology-poster/ideology-poster.component';
import { IdeologyReadingComponent } from '@ideologies/components/ideology-reading/ideology-reading.component';
import { KnowledgeTextComponent } from '@ideologies/components/knowledge-text/knowledge-text.component';
import { chapterGroup } from '@ideologies/models/ideology-chapters';
import type { IdeologyDossier } from '@ideologies/models/ideology-page.schema';
import { IdeologyRepository } from '@ideologies/services/ideology-repository.service';
import { planPageMedia } from '@ideologies/utils/page-media-plan';
import { chapterDeskKind } from '@ideologies/utils/reading-trails';
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
    IdeologyDeskComponent,
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
  /** Reading (percurso) and discovery (mesa) are sibling prerendered routes. */
  readonly mode = toSignal(
    this.route.data.pipe(map((d) => (d['mode'] === 'mesa' ? 'mesa' : 'percurso'))),
    {
      initialValue: this.route.snapshot.data['mode'] === 'mesa' ? 'mesa' : 'percurso',
    },
  );
  readonly basePath = computed(() => `/${this.page()?.slug ?? ''}`);
  readonly chapterDeskKind = chapterDeskKind;
  readonly palette = computed(() => (this.page()?.slug === 'liberalismo' ? 'liberal' : 'marx'));
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
  readonly minutes = computed(
    () => this.page()?.chapters.reduce((sum, c) => sum + c.minutes, 0) ?? 0,
  );
  /** Minutes left after each chapter, for the reading measure in the margin. */
  readonly remaining = computed(() => {
    const chapters = this.page()?.chapters ?? [];
    return chapters.map((_, i) => chapters.slice(i + 1).reduce((sum, c) => sum + c.minutes, 0));
  });
  readonly companion = computed(() =>
    this.page()?.slug === 'liberalismo'
      ? { path: '/marxismo', label: 'Ler o Marxismo' }
      : { path: '/liberalismo', label: 'Ler o Liberalismo' },
  );

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
