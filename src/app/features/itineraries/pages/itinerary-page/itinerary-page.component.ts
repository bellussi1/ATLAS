import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { KnowledgeGraph } from '@core/content/models/content-schema';
import type { ContextStop } from '@core/content/models/knowledge-context';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
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
import { catchError, map, of, switchMap } from 'rxjs';

const KIND_PALETTES: Record<ItineraryKind, MosaicPalette> = {
  historico: 'tissi',
  comparativo: 'atlas',
  conceitual: 'liberal',
  institucional: 'social-democracia',
};

interface StopEntityContext {
  entityId: string;
  summary: string;
  relationCount: number;
}

interface DiagramStopNode {
  id: string;
  index: number;
  title: string;
  shortTitle: string;
  type: ItineraryDestination['type'];
  kindLabel: string;
  x: number;
  y: number;
}

interface DiagramBranchArc {
  id: string;
  fromStop: string;
  title: string;
  x: number;
  y: number;
  pathD: string;
  convergesAt?: string;
  exit?: string;
}

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
  private readonly content = inject(ContentRepository);
  private readonly contextPanel = inject(ContextPanelService);
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);

  readonly kindLabels = itineraryKindLabels;
  readonly loading = signal(true);
  readonly itinerary = signal<Itinerary | null>(null);
  readonly activeStopId = signal<string | null>(null);
  private readonly graphSignal = signal<KnowledgeGraph | null>(null);

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

  readonly stopContexts = computed(() => {
    const current = this.itinerary();
    const graph = this.graphSignal();
    const result = new Map<string, StopEntityContext>();
    if (!current || !graph) return result;
    const entities = graph.atlases.flatMap((atlas) => atlas.entities);
    const relations = graph.atlases.flatMap((atlas) => atlas.relations);
    const byId = new Map(entities.map((e) => [e.id, e]));
    const bySlug = new Map(entities.map((e) => [e.slug, e]));
    for (const stop of current.stops) {
      const entity = stop.contextEntityId
        ? byId.get(stop.contextEntityId)
        : stop.destination.type === 'verbete'
          ? bySlug.get(stop.destination.slug)
          : undefined;
      if (!entity) continue;
      const relationCount = relations.filter(
        (r) => r.fromEntityId === entity.id || r.toEntityId === entity.id,
      ).length;
      result.set(stop.id, {
        entityId: entity.id,
        summary: entity.summary,
        relationCount,
      });
    }
    return result;
  });

  readonly activeStopIndex = computed(() => {
    const current = this.itinerary();
    if (!current || !current.stops.length) return 0;
    const active = this.activeStopId();
    const idx = active ? current.stops.findIndex((s) => s.id === active) : 0;
    return idx >= 0 ? idx : 0;
  });

  readonly activeStop = computed(() => {
    const current = this.itinerary();
    if (!current || !current.stops.length) return null;
    return current.stops[this.activeStopIndex()] ?? current.stops[0];
  });

  readonly diagram = computed(() => {
    const current = this.itinerary();
    if (!current || !current.stops.length) return null;
    const count = current.stops.length;
    const width = Math.max(720, count * 140);
    const height = current.branches.length > 0 ? 228 : 112;
    const padX = 72;
    const mainY = 54;
    const stepX = count > 1 ? (width - padX * 2) / (count - 1) : 0;

    const nodes: DiagramStopNode[] = current.stops.map((stop, index) => {
      const dest = resolveItineraryDestination(stop.destination);
      const shortTitle =
        stop.title.length > 22 ? `${stop.title.slice(0, 21).trimEnd()}…` : stop.title;
      return {
        id: stop.id,
        index: index + 1,
        title: stop.title,
        shortTitle,
        type: stop.destination.type,
        kindLabel: dest.kindLabel,
        x: padX + index * stepX,
        y: mainY,
      };
    });

    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const mainPath =
      nodes.length > 1 ? `M ${nodes[0].x} ${mainY} L ${nodes[nodes.length - 1].x} ${mainY}` : '';

    const branches: DiagramBranchArc[] = [];
    current.branches.forEach((branch, bIndex) => {
      const from = nodeById.get(branch.fromStop);
      if (!from) return;
      const branchY = 132 + (bIndex % 2) * 44;
      const target = branch.convergesAt ? nodeById.get(branch.convergesAt) : undefined;
      if (target) {
        const midX = (from.x + target.x) / 2;
        const pathD = `M ${from.x} ${mainY} C ${from.x} ${branchY}, ${(from.x + midX) / 2} ${branchY}, ${midX} ${branchY} C ${(midX + target.x) / 2} ${branchY}, ${target.x} ${branchY}, ${target.x} ${mainY}`;
        branches.push({
          id: branch.id,
          fromStop: branch.fromStop,
          title: branch.title,
          x: midX,
          y: branchY,
          pathD,
          convergesAt: branch.convergesAt,
        });
      } else {
        const endX = Math.min(width - 64, from.x + Math.max(105, stepX * 0.85));
        const pathD = `M ${from.x} ${mainY} C ${from.x} ${branchY}, ${(from.x + endX) / 2} ${branchY}, ${endX} ${branchY}`;
        branches.push({
          id: branch.id,
          fromStop: branch.fromStop,
          title: branch.title,
          x: endX,
          y: branchY,
          pathD,
          exit: branch.exit,
        });
      }
    });

    return { width, height, mainPath, nodes, branches };
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
        catchError(() => of(null)),
        takeUntilDestroyed(),
      )
      .subscribe((graph) => this.graphSignal.set(graph));

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
        this.activeStopId.set(item?.stops[0]?.id ?? null);
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

  selectStop(stopId: string, scrollIntoView = false): void {
    this.activeStopId.set(stopId);
    if (!scrollIntoView) return;
    const el = this.document.getElementById(`parada-${stopId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  stepBy(delta: -1 | 1): void {
    const current = this.itinerary();
    if (!current || !current.stops.length) return;
    const nextIdx = Math.max(0, Math.min(current.stops.length - 1, this.activeStopIndex() + delta));
    const nextStop = current.stops[nextIdx];
    if (nextStop) {
      this.selectStop(nextStop.id, true);
    }
  }

  openContext(entityId: string, event: Event): void {
    const trigger = event.currentTarget as HTMLElement | null;
    if (!trigger) return;
    void this.contextPanel.open({ entityId }, trigger, this.contextStops());
  }
}
