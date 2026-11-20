import { DOCUMENT, Location } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { pendingUntilEvent, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { readerPredicate, readerProse } from '@core/content/editorial/reader-voice';
import type { KnowledgeGraph } from '@core/content/models/content-schema';
import type { ContextStop } from '@core/content/models/knowledge-context';
import { type LinkedReading, readingsForEntity } from '@core/content/queries/cross-links';
import {
  relationWeightDefinition,
  relationWeightOf,
} from '@core/content/queries/knowledge-network';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { readingPath } from '@core/routing/reading-routes';
import {
  destinationKey,
  type Itinerary,
  type ItineraryDestination,
  type ItineraryKind,
  itineraryKindLabels,
} from '@itineraries/models/itinerary.schema';
import { ItineraryRepository } from '@itineraries/services/itinerary-repository.service';
import {
  itineraryDestinationTitle,
  type ResolvedDestination,
  resolveItineraryDestination,
} from '@itineraries/utils/itinerary-destination';
import { AtlasGeometricMosaicComponent } from '@shared/ui/geometric-mosaic/geometric-mosaic.component';
import type { MosaicPalette } from '@shared/ui/geometric-mosaic/mosaic-tiles';
import {
  contextKey,
  ContextPanelService,
} from '@shared/ui/knowledge-context/context-panel.service';
import { NotFoundMessageComponent } from '@shared/ui/not-found-message/not-found-message.component';
import { AtlasSealComponent } from '@shared/ui/seal/seal.component';
import { AtlasStampComponent } from '@shared/ui/stamp/stamp.component';
import { catchError, from, map, of, switchMap } from 'rxjs';

const KIND_PALETTES: Record<ItineraryKind, MosaicPalette> = {
  historico: 'tissi',
  comparativo: 'atlas',
  conceitual: 'liberal',
  institucional: 'social-democracia',
};

/** How many other itineraries the closing section suggests. */
const RELATED_ITINERARY_LIMIT = 3;

interface StopNeighbor {
  slug: string;
  title: string;
  label: string;
}

interface StopEntityContext {
  entityId: string;
  summary: string;
  relationCount: number;
  claims: readonly string[];
  neighbors: readonly StopNeighbor[];
  readings: readonly LinkedReading[];
}

interface LabelledDestination extends ResolvedDestination {
  title: string;
}

interface RelatedItinerary {
  slug: string;
  title: string;
  question: string;
  kindLabel: string;
  stopCount: number;
  shared: number;
}

@Component({
  selector: 'app-itinerary-page',
  imports: [
    RouterLink,
    NotFoundMessageComponent,
    AtlasGeometricMosaicComponent,
    AtlasSealComponent,
    AtlasStampComponent,
  ],
  templateUrl: './itinerary-page.component.html',
  styleUrl: './itinerary-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItineraryPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly repository = inject(ItineraryRepository);
  private readonly content = inject(ContentRepository);
  private readonly contextPanel = inject(ContextPanelService);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly title = inject(Title);
  private readonly location = inject(Location);
  private readonly injector = inject(Injector);

  readonly kindLabels = itineraryKindLabels;
  readonly loading = signal(true);
  readonly itinerary = signal<Itinerary | null>(null);
  readonly activeStopId = signal<string | null>(null);
  /** Path of this page without fragment, for in-page anchors that bypass the router. */
  readonly pagePath = signal('');
  private readonly graphSignal = signal<KnowledgeGraph | null>(null);
  private readonly catalogue = signal<readonly Itinerary[]>([]);
  private observer: IntersectionObserver | null = null;

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

  readonly sourceById = computed(() => {
    const current = this.itinerary();
    return new Map((current?.sources ?? []).map((source) => [source.id, source]));
  });

  private readonly entityTitles = computed(() => {
    const graph = this.graphSignal();
    const bySlug = new Map<string, string>();
    const byId = new Map<string, string>();
    for (const entity of graph?.atlases.flatMap((atlas) => atlas.entities) ?? []) {
      bySlug.set(entity.slug, entity.title);
      byId.set(entity.id, entity.title);
    }
    return { entityTitleBySlug: bySlug, entityTitleById: byId };
  });

  readonly stopContexts = computed(() => {
    const current = this.itinerary();
    const graph = this.graphSignal();
    const result = new Map<string, StopEntityContext>();
    if (!current || !graph) return result;
    const entities = graph.atlases.flatMap((atlas) => atlas.entities);
    const relations = graph.atlases.flatMap((atlas) => atlas.relations);
    const claims = graph.atlases.flatMap((atlas) => atlas.claims);
    const byId = new Map(entities.map((e) => [e.id, e]));
    const bySlug = new Map(entities.map((e) => [e.slug, e]));
    const atlasIdsByEntity = new Map<string, string[]>();
    for (const atlas of graph.atlases) {
      for (const e of atlas.entities) {
        const bucket = atlasIdsByEntity.get(e.id);
        if (bucket) bucket.push(atlas.id);
        else atlasIdsByEntity.set(e.id, [atlas.id]);
      }
    }
    const readingsInPath = new Set(this.pathReadings().map((reading) => reading.slug));
    // Stops that share a context entity would repeat the same chips; each neighbour shows once.
    const shownNeighbors = new Set<string>();
    for (const stop of current.stops) {
      const entity = stop.contextEntityId
        ? byId.get(stop.contextEntityId)
        : stop.destination.type === 'verbete'
          ? bySlug.get(stop.destination.slug)
          : undefined;
      if (!entity) continue;
      const entityRelations = relations.filter(
        (r) => r.fromEntityId === entity.id || r.toEntityId === entity.id,
      );
      const sortedRelations = [...entityRelations].sort(
        (a, b) =>
          relationWeightDefinition(relationWeightOf(a)).rank -
          relationWeightDefinition(relationWeightOf(b)).rank,
      );
      const nonDiscovery = sortedRelations.filter((r) => r.type !== 'encyclopedic-link');
      const prioritizedRelations = nonDiscovery.length ? nonDiscovery : sortedRelations;
      const seenNeighbors = new Set<string>();
      const neighbors: StopNeighbor[] = [];
      for (const rel of prioritizedRelations) {
        const isOutgoing = rel.fromEntityId === entity.id;
        const otherId = isOutgoing ? rel.toEntityId : rel.fromEntityId;
        if (seenNeighbors.has(otherId) || shownNeighbors.has(otherId)) continue;
        const other = byId.get(otherId);
        if (!other) continue;
        seenNeighbors.add(otherId);
        shownNeighbors.add(otherId);
        neighbors.push({
          slug: other.slug,
          title: other.title,
          label: readerPredicate((isOutgoing ? rel.label : rel.reverseLabel) || rel.type),
        });
        if (neighbors.length >= 4) break;
      }
      const entityClaims = claims
        .filter((c) => c.entityId === entity.id && c.text.trim().length > 0)
        .slice(0, 2)
        .map((c) => readerProse(c.text) ?? c.text.trim());
      // Readings tied to the stop's entity, minus the one the stop itself opens.
      const ownReading =
        stop.destination.type === 'leitura' || stop.destination.type === 'roteiro'
          ? stop.destination.slug
          : null;
      const readings = readingsForEntity(
        entity.id,
        entity.slug,
        atlasIdsByEntity.get(entity.id),
      ).filter((reading) => reading.slug !== ownReading && !readingsInPath.has(reading.slug));
      result.set(stop.id, {
        entityId: entity.id,
        summary: entity.summary,
        relationCount: entityRelations.length,
        claims: entityClaims,
        neighbors,
        readings,
      });
    }
    return result;
  });

  /** Continuous readings the itinerary itself passes through, in order of first appearance. */
  readonly pathReadings = computed<readonly LinkedReading[]>(() => {
    const current = this.itinerary();
    if (!current) return [];
    const seen = new Map<string, LinkedReading>();
    for (const item of [...current.stops, ...current.branches]) {
      const dest = item.destination;
      if ((dest.type !== 'leitura' && dest.type !== 'roteiro') || seen.has(dest.slug)) continue;
      seen.set(dest.slug, {
        slug: dest.slug,
        title: itineraryDestinationTitle(dest),
        path: readingPath(dest.slug),
      });
    }
    return [...seen.values()];
  });

  /** Curated follow-ups with a readable title instead of the bare destination kind. */
  readonly connections = computed(() => {
    const current = this.itinerary();
    const lookup = this.entityTitles();
    return (current?.connections ?? []).map((conn) => ({
      reason: conn.reason,
      destination: {
        ...resolveItineraryDestination(conn.destination),
        title: itineraryDestinationTitle(conn.destination, lookup),
      } satisfies LabelledDestination,
    }));
  });

  /** Other published itineraries ranked by shared destinations and context entities. */
  readonly relatedItineraries = computed<readonly RelatedItinerary[]>(() => {
    const current = this.itinerary();
    if (!current) return [];
    const keysOf = (item: Itinerary) =>
      new Set([
        ...[...item.stops, ...item.branches].map((s) => destinationKey(s.destination)),
        ...item.stops.flatMap((s) => (s.contextEntityId ? [`entity:${s.contextEntityId}`] : [])),
      ]);
    const own = keysOf(current);
    return this.catalogue()
      .filter((item) => item.slug !== current.slug)
      .map((item) => {
        const shared = [...keysOf(item)].filter((key) => own.has(key)).length;
        return { item, shared, sameKind: item.kind === current.kind ? 1 : 0 };
      })
      .filter((entry) => entry.shared > 0 || entry.sameKind)
      .sort((a, b) => b.shared - a.shared || b.sameKind - a.sameKind)
      .slice(0, RELATED_ITINERARY_LIMIT)
      .map(({ item, shared }) => ({
        slug: item.slug,
        title: item.title,
        question: item.question,
        kindLabel: itineraryKindLabels[item.kind],
        stopCount: item.stops.length,
        shared,
      }));
  });

  readonly activeStopIndex = computed(() => {
    const current = this.itinerary();
    const active = this.activeStopId();
    if (!current?.stops.length || !active) return 0;
    return Math.max(
      0,
      current.stops.findIndex((s) => s.id === active),
    );
  });

  readonly contextStops = computed<ContextStop[]>(() => {
    const current = this.itinerary();
    const contexts = this.stopContexts();
    if (!current) return [];
    return current.stops.flatMap((stop) => {
      const entityId = stop.contextEntityId ?? contexts.get(stop.id)?.entityId;
      return entityId
        ? [
            {
              key: contextKey({ entityId }),
              request: { entityId },
            },
          ]
        : [];
    });
  });

  constructor() {
    this.content
      .loadKnowledgeGraph()
      .pipe(
        pendingUntilEvent(this.injector),
        catchError(() => of(null)),
        takeUntilDestroyed(),
      )
      .subscribe((graph) => this.graphSignal.set(graph));

    from(this.repository.list())
      .pipe(
        pendingUntilEvent(this.injector),
        catchError(() => of([] as readonly Itinerary[])),
        takeUntilDestroyed(),
      )
      .subscribe((items) => this.catalogue.set(items));

    this.route.paramMap
      .pipe(
        map((params) => params.get('slug') ?? ''),
        switchMap((slug) => {
          this.loading.set(true);
          return from(this.repository.bySlug(slug)).pipe(pendingUntilEvent(this.injector));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((item) => {
        this.itinerary.set(item);
        this.pagePath.set(this.location.path(false).split('#')[0]);
        const hashStop = this.route.snapshot?.fragment?.replace(/^parada-/, '');
        const initialStop =
          hashStop && item?.stops.some((s) => s.id === hashStop)
            ? hashStop
            : (item?.stops[0]?.id ?? null);
        this.activeStopId.set(initialStop);
        this.loading.set(false);
        this.title.setTitle(item ? `${item.title} — ATLAS` : 'Itinerário não encontrado — ATLAS');
        afterNextRender(() => this.observeStops(), { injector: this.injector });
      });

    inject(DestroyRef).onDestroy(() => this.observer?.disconnect());
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

  /**
   * Marks a stop as the one being read. With `scrollIntoView`, brings it to the top and moves
   * focus to its heading so keyboard and screen-reader users land where the eye goes.
   */
  selectStop(stopId: string, scrollIntoView = false): void {
    this.activeStopId.set(stopId);
    if (!scrollIntoView) return;
    const el = this.document.getElementById(`parada-${stopId}`);
    if (!el) return;
    const reduce = this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
    el.scrollIntoView({ behavior: reduce?.matches ? 'auto' : 'smooth', block: 'start' });
    el.querySelector<HTMLElement>('.stop__title')?.focus({ preventScroll: true });
  }

  /** Jumps to the closing section once the last stop is read. */
  goToEnd(): void {
    const el = this.document.getElementById('depois-do-percurso');
    if (!el) return;
    const reduce = this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
    el.scrollIntoView({ behavior: reduce?.matches ? 'auto' : 'smooth', block: 'start' });
    el.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  }

  openContext(entityId: string, event: Event): void {
    const trigger = event.currentTarget as HTMLElement | null;
    if (!trigger) return;
    void this.contextPanel.open({ entityId }, trigger, this.contextStops());
  }

  /** Keeps the index in step with the stop under the reading line while scrolling. */
  private observeStops(): void {
    this.observer?.disconnect();
    const view = this.document.defaultView;
    if (!view || typeof view.IntersectionObserver !== 'function') return;
    const items = this.host.nativeElement.querySelectorAll<HTMLElement>('.roadmap-item');
    if (!items.length) return;
    this.observer = new view.IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        const last = visible.at(-1);
        const id = last?.target.id.replace(/^parada-/, '');
        if (id) this.activeStopId.set(id);
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    for (const item of items) this.observer.observe(item);
  }
}
