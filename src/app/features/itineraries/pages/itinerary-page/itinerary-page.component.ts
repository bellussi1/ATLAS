import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { ContextStop } from '@core/content/models/knowledge-context';
import {
  type Itinerary,
  type ItineraryDestination,
  type ItineraryKind,
  itineraryKindLabels,
} from '@itineraries/models/itinerary.schema';
import { ItineraryRepository } from '@itineraries/services/itinerary-repository.service';
import { resolveItineraryDestination } from '@itineraries/utils/itinerary-destination';
import { AtlasGeometricMosaicComponent } from '@shared/ui/geometric-mosaic/geometric-mosaic.component';
import type { MosaicPalette } from '@shared/ui/geometric-mosaic/mosaic-tiles';
import {
  contextKey,
  ContextPanelService,
} from '@shared/ui/knowledge-context/context-panel.service';
import { NotFoundMessageComponent } from '@shared/ui/not-found-message/not-found-message.component';
import { map, switchMap } from 'rxjs';

const KIND_PALETTES: Record<ItineraryKind, MosaicPalette> = {
  historico: 'tissi',
  comparativo: 'atlas',
  conceitual: 'liberal',
  institucional: 'social-democracia',
};

@Component({
  selector: 'app-itinerary-page',
  imports: [RouterLink, NotFoundMessageComponent, AtlasGeometricMosaicComponent],
  templateUrl: './itinerary-page.component.html',
  styleUrl: './itinerary-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItineraryPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly repository = inject(ItineraryRepository);
  private readonly contextPanel = inject(ContextPanelService);
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

  readonly stopNumberById = computed(() => {
    const current = this.itinerary();
    return new Map((current?.stops ?? []).map((stop, index) => [stop.id, index + 1]));
  });

  readonly contextStops = computed<ContextStop[]>(() => {
    const current = this.itinerary();
    if (!current) return [];
    return current.stops.flatMap((stop) =>
      stop.contextEntityId
        ? [
            {
              key: contextKey({ entityId: stop.contextEntityId }),
              request: { entityId: stop.contextEntityId },
            },
          ]
        : [],
    );
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

  nodeShape(type: ItineraryDestination['type']): 'square' | 'circle' | 'half' | 'quarter' {
    switch (type) {
      case 'leitura':
      case 'roteiro':
        return 'square';
      case 'grafo':
        return 'circle';
      case 'verbete':
        return 'half';
      case 'catalogo':
        return 'quarter';
    }
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

  openContext(entityId: string, event: Event): void {
    const trigger = event.currentTarget as HTMLElement | null;
    if (!trigger) return;
    void this.contextPanel.open({ entityId }, trigger, this.contextStops());
  }
}
