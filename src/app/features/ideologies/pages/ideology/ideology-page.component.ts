import { Component, computed, inject, Injector, signal } from '@angular/core';
import { pendingUntilEvent, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { reproducibleAsset } from '@core/content/media/asset-license';
import type { Source } from '@core/content/models/content-schema';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { EditorialSourcesComponent } from '@ideologies/components/editorial-sources/editorial-sources.component';
import { IdeologyBlockComponent } from '@ideologies/components/ideology-block/ideology-block.component';
import { IdeologyReadingComponent } from '@ideologies/components/ideology-reading/ideology-reading.component';
import { KnowledgeTextComponent } from '@ideologies/components/knowledge-text/knowledge-text.component';
import { chapterGroup } from '@ideologies/models/ideology-chapters';
import type { IdeologyDossier } from '@ideologies/models/ideology-page.schema';
import { IdeologyRepository } from '@ideologies/services/ideology-repository.service';
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
    KnowledgeTextComponent,
    IdeologyReadingComponent,
    EditorialSourcesComponent,
    AtlasGeometricMosaicComponent,
    AtlasRevealDirective,
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
  readonly portrait = computed(() => {
    const page = this.page();
    const atlas = this.repository.knowledgeGraph.atlases.find((a) => a.id === page?.atlasId);
    const asset = atlas?.assetLicenses.find((a) => a.id === page?.portrait?.assetId);
    return asset ? reproducibleAsset(atlas, asset.assetPath) : undefined;
  });
  readonly palette = computed(() => (this.page()?.slug === 'liberalismo' ? 'liberal' : 'marx'));
  readonly companion = computed(() =>
    this.page()?.slug === 'liberalismo'
      ? { path: '/marxismo', label: 'Ler o Marxismo' }
      : { path: '/liberalismo', label: 'Ler o Liberalismo' },
  );
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
