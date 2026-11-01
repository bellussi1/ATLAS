import { Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ContentRepository } from '../core/content-repository';
import { studyPathSchema } from '../core/study-schema';
import { AtlasDiscoveryPreviewDirective } from '../shared/discovery-preview';
import { reproducibleAsset } from '../shared/licensed-asset';
import { AtlasStudyExerciseComponent } from '../shared/study-exercise';

const study = studyPathSchema.parse({
  id: 'estudo-valor-marx',
  slug: 'estudo-valor-marx',
  title: 'Ler conceitos em contraste',
  objectives: ['Distinguir duas formulações de valor.'],
  prerequisites: ['Ler as duas teses.'],
  lessons: [
    {
      id: 'licao-valor',
      title: 'Valor e trabalho',
      entityId: 'concept-trabalho-socialmente-necessario',
      exercises: [
        {
          id: 'exercicio-valor',
          prompt: 'No trecho de O capital, que tempo é usado na análise da grandeza do valor?',
          options: [
            { id: 'social', text: 'O tempo socialmente necessário' },
            { id: 'individual', text: 'Qualquer tempo individual gasto' },
          ],
          correctOptionId: 'social',
          feedback: {
            explanation:
              'O texto distingue o tempo socialmente necessário do tempo individual de cada produtor.',
            sourceId: 'source-marx-capital',
          },
        },
      ],
    },
  ],
});

@Component({
  selector: 'app-marx-atlas-page',
  imports: [RouterLink, AtlasStudyExerciseComponent, AtlasDiscoveryPreviewDirective],
  templateUrl: './marx-atlas-page.html',
  styleUrl: './marx-atlas-page.scss',
})
export class MarxAtlasPage {
  readonly inline = input(false);
  private readonly repository = inject(ContentRepository);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly atlas = this.repository.knowledgeGraph.atlases.find(
    (item) => item.id === 'atlas-marx-valor',
  );
  readonly smithPortrait = reproducibleAsset(this.atlas, '/images/atlas/adam-smith.jpg');
  readonly marxPortrait = reproducibleAsset(this.atlas, '/images/atlas/karl-marx.jpg');
  private readonly inlineFilter = signal(
    ['comparacao', 'critica'].includes(this.params().get('vinculo') ?? '')
      ? this.params().get('vinculo')!
      : 'todas',
  );
  private readonly inlineSelection = signal(
    this.params().get('argumento') === 'marx' ? 'marx' : 'smith',
  );
  readonly filter = computed(() =>
    this.inline()
      ? this.inlineFilter()
      : ['comparacao', 'critica'].includes(this.params().get('vinculo') ?? '')
        ? this.params().get('vinculo')!
        : 'todas',
  );
  readonly selected = computed(() =>
    this.inline()
      ? this.inlineSelection()
      : this.params().get('argumento') === 'marx'
        ? 'marx'
        : 'smith',
  );
  readonly claims = computed(() => {
    const id =
      this.selected() === 'smith'
        ? 'claim-work-wealth-of-nations'
        : 'claim-concept-trabalho-socialmente-necessario';
    return this.atlas?.claims.find((item) => item.id === id);
  });
  readonly origin = computed(() =>
    this.inline()
      ? '/atlas/marxismo'
      : `/atlas/marxismo/valor-e-trabalho?argumento=${this.selected()}&vinculo=${this.filter()}`,
  );
  readonly previewRecords = computed(() =>
    (this.selected() === 'smith'
      ? ['work-wealth-of-nations', 'person-adam-smith']
      : ['concept-trabalho-socialmente-necessario', 'work-capital-volume-i', 'person-karl-marx']
    ).flatMap((id) => {
      const entry = this.repository.discoveryIndex.find((item) => item.id === id);
      return entry ? [entry] : [];
    }),
  );
  readonly study = study;
  readonly exercise = study.lessons[0].exercises[0];
  select(value: string): void {
    if (this.inline()) {
      this.inlineSelection.set(value);
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { argumento: value },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
  setFilter(value: string): void {
    if (this.inline()) {
      this.inlineFilter.set(value);
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { vinculo: value },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
