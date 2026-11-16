import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { readingPath } from '@core/routing/reading-routes';
import { AtlasHeadingDirective } from '@shared/directives/heading/heading.directive';
import { AtlasChevronComponent } from '@shared/ui/chevron/chevron.component';
import { AtlasGeometricMosaicComponent } from '@shared/ui/geometric-mosaic/geometric-mosaic.component';
import type { MosaicPalette } from '@shared/ui/geometric-mosaic/mosaic-tiles';
import { AtlasTextFieldComponent } from '@shared/ui/text-field/text-field.component';

import homeStats from '../../../../../../generated/home-stats.json';

interface ReadingCard {
  slug: string;
  title: string;
  kind?: string;
  tagline: string;
  summary: string;
  statusLabel: string;
  minutes?: number;
  chapters?: number;
  completeChapters?: number;
  palette: MosaicPalette;
  seed: number;
  excerpt: { heading: string; paragraph: string };
}

type StatusFilter = 'all' | 'reviewed' | 'draft';

const compiledStats = homeStats as { readings: ReadingCard[] };

@Component({
  selector: 'app-readings-index',
  imports: [
    RouterLink,
    AtlasHeadingDirective,
    AtlasGeometricMosaicComponent,
    AtlasTextFieldComponent,
    AtlasChevronComponent,
  ],
  templateUrl: './readings-index.component.html',
  styleUrl: './readings-index.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadingsIndexComponent {
  readonly readings = compiledStats.readings;
  readonly query = signal('');
  readonly statusFilter = signal<StatusFilter>('all');

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const filter = this.statusFilter();
    return this.readings.filter((item) => {
      if (filter === 'reviewed' && !item.statusLabel.toLowerCase().includes('revisad')) {
        return false;
      }
      if (filter === 'draft' && item.statusLabel.toLowerCase().includes('revisad')) {
        return false;
      }
      if (!q) return true;
      const haystack =
        `${item.title} ${item.kind ?? ''} ${item.tagline} ${item.summary}`.toLowerCase();
      return haystack.includes(q);
    });
  });

  entryPath(slug: string): string {
    return readingPath(slug);
  }

  setFilter(filter: StatusFilter): void {
    this.statusFilter.set(filter);
  }

  clearFilters(): void {
    this.query.set('');
    this.statusFilter.set('all');
  }
}
