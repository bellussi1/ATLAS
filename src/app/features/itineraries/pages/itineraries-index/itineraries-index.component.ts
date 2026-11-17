import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  type Itinerary,
  type ItineraryDestination,
  type ItineraryKind,
  itineraryKindLabels,
  itineraryKinds,
} from '@itineraries/models/itinerary.schema';
import { ItineraryRepository } from '@itineraries/services/itinerary-repository.service';
import { resolveItineraryDestination } from '@itineraries/utils/itinerary-destination';
import { AtlasGeometricMosaicComponent } from '@shared/ui/geometric-mosaic/geometric-mosaic.component';
import type { MosaicPalette } from '@shared/ui/geometric-mosaic/mosaic-tiles';

const KIND_PALETTES: Record<ItineraryKind, MosaicPalette> = {
  historico: 'tissi',
  comparativo: 'atlas',
  conceitual: 'liberal',
  institucional: 'social-democracia',
};

@Component({
  selector: 'app-itineraries-index',
  imports: [RouterLink, AtlasGeometricMosaicComponent],
  templateUrl: './itineraries-index.component.html',
  styleUrl: './itineraries-index.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItinerariesIndexComponent {
  private readonly repository = inject(ItineraryRepository);
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

  constructor() {
    void this.repository
      .list()
      .then((items) => this.items.set(items))
      .finally(() => this.loading.set(false));
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
}
