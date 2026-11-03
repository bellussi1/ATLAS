import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { entityMedia } from '@core/content/media/asset-license';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import type { IdeologyPage } from '@ideologies/models/ideology-page.schema';
import { readingTrails } from '@ideologies/utils/reading-trails';
import { AtlasLicensedAssetComponent } from '@shared/ui/licensed-asset/licensed-asset.component';

const frames = ['disc', 'arch', 'quarter', 'square'] as const;

/** Opening of a tradition: guiding questions and licensed portraits of its records. */
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

  /** Up to four licensed pictures (people first, then works and events), cut in geometric frames. */
  readonly figures = computed(() => {
    const graph = this.repository.knowledgeGraph;
    const atlas = graph.atlases.find((a) => a.id === this.page().atlasId);
    if (!atlas) return [];
    return [...atlas.entities]
      .sort((a, b) => Number(b.kind === 'person') - Number(a.kind === 'person'))
      .flatMap((entity) => {
        const asset = entityMedia(graph, entity);
        const owner = asset && graph.atlases.find((a) => a.assetLicenses.includes(asset));
        return asset && owner ? [{ entity, asset, owner }] : [];
      })
      .slice(0, 4)
      .map((figure, i) => ({ ...figure, frame: frames[i % frames.length] }));
  });
  readonly trails = computed(() => readingTrails(this.page()));
}
