import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  type Itinerary,
  type ItineraryDestination,
  itineraryKindLabels,
} from '@itineraries/models/itinerary.schema';
import { ItineraryRepository } from '@itineraries/services/itinerary-repository.service';
import { resolveItineraryDestination } from '@itineraries/utils/itinerary-destination';
import { NotFoundMessageComponent } from '@shared/ui/not-found-message/not-found-message.component';
import { map, switchMap } from 'rxjs';

@Component({
  selector: 'app-itinerary-page',
  imports: [RouterLink, NotFoundMessageComponent],
  templateUrl: './itinerary-page.component.html',
  styleUrl: './itinerary-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItineraryPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly repository = inject(ItineraryRepository);
  private readonly title = inject(Title);

  readonly kindLabels = itineraryKindLabels;
  readonly loading = signal(true);
  readonly itinerary = signal<Itinerary | null>(null);

  readonly branchesByStop = computed(() => {
    const current = this.itinerary();
    const mapByStop = new Map<string, Itinerary['branches']>();
    if (!current) return mapByStop;
    for (const branch of current.branches) {
      const bucket = mapByStop.get(branch.fromStop);
      if (bucket) bucket.push(branch);
      else mapByStop.set(branch.fromStop, [branch]);
    }
    return mapByStop;
  });

  readonly stopTitles = computed(() => {
    const current = this.itinerary();
    return new Map((current?.stops ?? []).map((stop) => [stop.id, stop.title]));
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('slug') ?? ''),
        switchMap((slug) => {
          this.loading.set(true);
          return this.repository.bySlug(slug);
        }),
        takeUntilDestroyed(),
      )
      .subscribe((item) => {
        this.itinerary.set(item);
        this.loading.set(false);
        this.title.setTitle(item ? `${item.title} — ATLAS` : 'Itinerário não encontrado — ATLAS');
      });
  }

  destinationOf(destination: ItineraryDestination) {
    return resolveItineraryDestination(destination);
  }
}
