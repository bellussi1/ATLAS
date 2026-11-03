import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { chapterGroup, chapterGroups } from '@ideologies/models/ideology-chapters';
import type { IdeologyPage } from '@ideologies/models/ideology-page.schema';
import { entityMedia } from '@ideologies/utils/page-media-plan';
import { chapterWeight, readingTrails } from '@ideologies/utils/reading-trails';
import { AtlasGeometricMosaicComponent } from '@shared/ui/geometric-mosaic/geometric-mosaic.component';
import { AtlasLicensedAssetComponent } from '@shared/ui/licensed-asset/licensed-asset.component';

const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const shapes = ['block', 'disc', 'frame', 'bar'] as const;
const frames = ['disc', 'arch', 'quarter', 'square'] as const;

/** Opening of a tradition: guiding questions, short trails and a map of its chapters. */
@Component({
  selector: 'app-ideology-poster',
  imports: [RouterLink, AtlasLicensedAssetComponent, AtlasGeometricMosaicComponent],
  templateUrl: './ideology-poster.component.html',
  styleUrl: './ideology-poster.component.scss',
})
export class IdeologyPosterComponent {
  private readonly repository = inject(ContentRepository);
  readonly page = input.required<IdeologyPage>();
  readonly basePath = input.required<string>();
  readonly minutes = input(0);
  /** Trail whose stops are lit on the map while its question is hovered or focused. */
  readonly highlighted = signal<string | null>(null);

  readonly palette = computed(() => (this.page().slug === 'liberalismo' ? 'liberal' : 'marx'));
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
  readonly columns = computed(() =>
    chapterGroups.map((group, g) => ({
      group,
      numeral: roman[g],
      chapters: this.page()
        .chapters.map((chapter, index) => ({ chapter, index }))
        .filter(({ chapter }) => chapterGroup(chapter.id) === group)
        .map(({ chapter, index }) => ({
          anchor: chapter.anchor,
          title: chapter.title,
          label: chapter.kicker,
          minutes: chapter.minutes,
          numeral: roman[index] ?? `${index + 1}`,
          weight: chapterWeight(chapter),
          shape: shapes[index % shapes.length],
        })),
    })),
  );

  lit(anchor: string): boolean {
    const group = this.highlighted();
    return (
      !!group &&
      this.trails().some((t) => t.group === group && t.stops.some((s) => s.anchor === anchor))
    );
  }
}
