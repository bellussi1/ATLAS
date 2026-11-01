import { Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { reproducibleAsset } from '@core/content/media/asset-license';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { study } from '@ideologies/data/value-study';
import { AtlasDiscoveryPreviewDirective } from '@shared/directives/discovery-preview/discovery-preview.directive';
import { AtlasStudyExerciseComponent } from '@shared/ui/study-exercise/study-exercise.component';

@Component({
  selector: 'app-marx-atlas-page',
  imports: [RouterLink, AtlasStudyExerciseComponent, AtlasDiscoveryPreviewDirective],
  templateUrl: './value-debate.component.html',
  styleUrl: './value-debate.component.scss',
})
export class ValueDebateComponent {
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
  readonly filter = computed(() =>
    ['comparacao', 'critica'].includes(this.params().get('vinculo') ?? '')
      ? this.params().get('vinculo')!
      : 'todas',
  );
  readonly selected = computed(() =>
    this.params().get('argumento') === 'marx' ? 'marx' : 'smith',
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
      ? `/marxismo?argumento=${this.selected()}&vinculo=${this.filter()}#conceitos`
      : `/marxismo?argumento=${this.selected()}&vinculo=${this.filter()}`,
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
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { argumento: value },
      queryParamsHandling: 'merge',
      preserveFragment: true,
      replaceUrl: true,
      scroll: 'manual',
    });
  }
  setFilter(value: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { vinculo: value },
      queryParamsHandling: 'merge',
      preserveFragment: true,
      replaceUrl: true,
      scroll: 'manual',
    });
  }
}
