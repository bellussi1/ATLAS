import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { rankByPopularity } from '@core/analytics/popularity';
import { explorerPage } from '@core/content/queries/knowledge-explorer';
import { readingPath } from '@core/routing/reading-routes';
import popularity from '@metrics/popularity.json';
import { AtlasHeadingDirective } from '@shared/directives/heading/heading.directive';
import { AtlasChevronComponent } from '@shared/ui/chevron/chevron.component';
import { AtlasGeometricMosaicComponent } from '@shared/ui/geometric-mosaic/geometric-mosaic.component';
import type { MosaicPalette } from '@shared/ui/geometric-mosaic/mosaic-tiles';
import { AtlasPaginationComponent } from '@shared/ui/pagination/pagination.component';
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

/** Two rows of two cards. */
const READINGS_PAGE_SIZE = 4;

const compiledStats = homeStats as { readings: ReadingCard[] };

@Component({
  selector: 'app-readings-index',
  imports: [
    RouterLink,
    AtlasHeadingDirective,
    AtlasGeometricMosaicComponent,
    AtlasTextFieldComponent,
    AtlasChevronComponent,
    AtlasPaginationComponent,
  ],
  templateUrl: './readings-index.component.html',
  styleUrl: './readings-index.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadingsIndexComponent {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  readonly readings = rankByPopularity(
    compiledStats.readings,
    (item) => `/leitura/${item.slug}`,
    popularity,
    { eligible: (item) => !item.statusLabel.toLowerCase().includes('rascunho') },
  );
  readonly query = signal('');
  readonly statusFilter = signal<StatusFilter>('all');

  readonly reviewedCount = computed(
    () =>
      this.readings.filter((item) => !item.statusLabel.toLowerCase().includes('rascunho')).length,
  );
  readonly draftCount = computed(
    () =>
      this.readings.filter((item) => item.statusLabel.toLowerCase().includes('rascunho')).length,
  );

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const filter = this.statusFilter();
    return this.readings.filter((item) => {
      const isDraft = item.statusLabel.toLowerCase().includes('rascunho');
      if (filter === 'reviewed' && isDraft) {
        return false;
      }
      if (filter === 'draft' && !isDraft) {
        return false;
      }
      if (!q) return true;
      const haystack =
        `${item.title} ${item.kind ?? ''} ${item.tagline} ${item.summary}`.toLowerCase();
      return haystack.includes(q);
    });
  });

  readonly page = signal(1);
  readonly paged = computed(() => explorerPage(this.filtered(), this.page(), READINGS_PAGE_SIZE));

  constructor() {
    // A new filter starts from the first page.
    effect(() => {
      this.query();
      this.statusFilter();
      untracked(() => this.page.set(1));
    });
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.document
      .getElementById('readings-results')
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

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

  openRandomReading(): void {
    const list = this.filtered();
    const pool = list.length ? list : this.readings;
    if (!pool.length) return;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    void this.router.navigateByUrl(this.entryPath(picked.slug));
  }
}
