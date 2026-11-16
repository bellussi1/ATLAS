import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type Itinerary, itineraryKindLabels } from '@itineraries/models/itinerary.schema';
import { ItineraryRepository } from '@itineraries/services/itinerary-repository.service';
import { AtlasGeometricMosaicComponent } from '@shared/ui/geometric-mosaic/geometric-mosaic.component';

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
  readonly loading = signal(true);
  readonly items = signal<readonly Itinerary[]>([]);

  constructor() {
    void this.repository
      .list()
      .then((items) => this.items.set(items))
      .finally(() => this.loading.set(false));
  }
}
