import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { chapterGroup, chapterGroups } from '@ideologies/models/ideology-chapters';
import type { IdeologyPage } from '@ideologies/models/ideology-page.schema';
import { chapterWeight, readingTrails } from '@ideologies/utils/reading-trails';

const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const shapes = ['block', 'disc', 'frame', 'bar'] as const;

/** Opening of a tradition: guiding questions, short trails and a map of its chapters. */
@Component({
  selector: 'app-ideology-poster',
  imports: [RouterLink],
  templateUrl: './ideology-poster.component.html',
  styleUrl: './ideology-poster.component.scss',
})
export class IdeologyPosterComponent {
  readonly page = input.required<IdeologyPage>();
  readonly basePath = input.required<string>();
  readonly minutes = input(0);
  /** Trail whose stops are lit on the map while its question is hovered or focused. */
  readonly highlighted = signal<string | null>(null);

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
