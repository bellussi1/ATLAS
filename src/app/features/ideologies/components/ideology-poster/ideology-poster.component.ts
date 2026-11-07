import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import type { IdeologyPage } from '@ideologies/models/ideology-page.schema';
import { resolveOpeningFigures } from '@ideologies/utils/opening-media';
import { readingTrails } from '@ideologies/utils/reading-trails';
import { AtlasLicensedAssetComponent } from '@shared/ui/licensed-asset/licensed-asset.component';

/** Opening of a tradition: guiding questions and the editorial selection of licensed images. */
@Component({
  selector: 'app-ideology-poster',
  imports: [RouterLink, AtlasLicensedAssetComponent],
  templateUrl: './ideology-poster.component.html',
  styleUrl: './ideology-poster.component.scss',
})
export class IdeologyPosterComponent {
  private readonly repository = inject(ContentRepository);
  readonly page = input.required<IdeologyPage>();
  readonly basePath = input.required<string>();

  /** Explicit figures from the page, or the conservative fallback when none were chosen. */
  readonly figures = computed(() =>
    resolveOpeningFigures(this.page(), this.repository.knowledgeGraph),
  );
  /** A fallback is not a curated selection and says so in the credits. */
  readonly curated = computed(
    () => this.figures().length > 0 && this.figures().every((figure) => figure.curated),
  );
  readonly trails = computed(() => readingTrails(this.page()));
}
