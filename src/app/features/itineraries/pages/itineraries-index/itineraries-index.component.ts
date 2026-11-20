import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  signal,
  untracked,
} from '@angular/core';
import { pendingUntilEvent, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { rankByPopularity } from '@core/analytics/popularity';
import { explorerPage } from '@core/content/queries/knowledge-explorer';
import {
  type Itinerary,
  type ItineraryDestination,
  type ItineraryKind,
  itineraryKindLabels,
  itineraryKinds,
} from '@itineraries/models/itinerary.schema';
import { ItineraryRepository } from '@itineraries/services/itinerary-repository.service';
import { resolveItineraryDestination } from '@itineraries/utils/itinerary-destination';
import popularity from '@metrics/popularity.json';
import { AtlasGeometricMosaicComponent } from '@shared/ui/geometric-mosaic/geometric-mosaic.component';
import type { MosaicPalette } from '@shared/ui/geometric-mosaic/mosaic-tiles';
import { AtlasPaginationComponent } from '@shared/ui/pagination/pagination.component';
import { AtlasSealComponent } from '@shared/ui/seal/seal.component';
import { AtlasStampComponent } from '@shared/ui/stamp/stamp.component';
import { from } from 'rxjs';

/** Two rows of two cards. */
const ITINERARIES_PAGE_SIZE = 4;

const KIND_PALETTES: Record<ItineraryKind, MosaicPalette> = {
  historico: 'tissi',
  comparativo: 'atlas',
  conceitual: 'liberal',
  institucional: 'social-democracia',
};

@Component({
  selector: 'app-itineraries-index',
  imports: [
    RouterLink,
    AtlasGeometricMosaicComponent,
    AtlasPaginationComponent,
    AtlasSealComponent,
    AtlasStampComponent,
  ],
  templateUrl: './itineraries-index.component.html',
  styleUrl: './itineraries-index.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItinerariesIndexComponent {
  private readonly repository = inject(ItineraryRepository);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  readonly kindLabels = itineraryKindLabels;
  readonly kinds = itineraryKinds;
  readonly loading = signal(true);
  readonly items = signal<readonly Itinerary[]>([]);
  readonly selectedKind = signal<ItineraryKind | 'all'>('all');
  readonly filteredItems = computed(() => {
    const kind = this.selectedKind();
    const all = this.items();
    return kind === 'all' ? all : all.filter((item) => item.kind === kind);
  });
  readonly page = signal(1);
  readonly paged = computed(() =>
    explorerPage(this.filteredItems(), this.page(), ITINERARIES_PAGE_SIZE),
  );

  constructor() {
    // A new filter starts from the first page.
    effect(() => {
      this.selectedKind();
      untracked(() => this.page.set(1));
    });
    from(this.repository.list())
      .pipe(pendingUntilEvent(this.injector), takeUntilDestroyed())
      .subscribe({
        next: (items) => {
          this.items.set(rankByPopularity(items, (item) => `/itinerario/${item.slug}`, popularity));
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  countForKind(kind: ItineraryKind): number {
    return this.items().filter((item) => item.kind === kind).length;
  }

  paletteFor(kind: ItineraryKind): MosaicPalette {
    return KIND_PALETTES[kind];
  }

  seedFor(slug: string): number {
    let hash = 11;
    for (let i = 0; i < slug.length; i++) {
      hash = (hash * 31 + slug.charCodeAt(i)) % 997;
    }
    return hash;
  }

  statusLabel(status: Itinerary['status']): string {
    return status === 'verified' ? 'Verificado' : 'Conferido por IA';
  }

  destinationLabel(destination: ItineraryDestination): string {
    return resolveItineraryDestination(destination).kindLabel;
  }

  openRandomItinerary(): void {
    const list = this.filteredItems();
    if (!list.length) return;
    const picked = list[Math.floor(Math.random() * list.length)];
    void this.router.navigate(['/itinerario', picked.slug]);
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.document
      .getElementById('itineraries-results')
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
}
