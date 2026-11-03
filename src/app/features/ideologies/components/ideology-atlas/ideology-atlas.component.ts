import { DOCUMENT } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { entityMedia } from '@core/content/media/asset-license';
import type { Entity, Relation } from '@core/content/models/content-schema';
import type { KnowledgeRelationResult } from '@core/content/queries/knowledge-graph';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { EditorialSourcesComponent } from '@ideologies/components/editorial-sources/editorial-sources.component';
import { TimelineAxisComponent } from '@ideologies/components/timeline-axis/timeline-axis.component';
import type { EditorialReference } from '@ideologies/models/editorial-reference';
import { TimelineFocusService } from '@ideologies/services/timeline-focus.service';
import { axisItemOf, entityKindLabel } from '@ideologies/utils/timeline-axis-items';
import { CardCarouselComponent } from '@shared/ui/card-carousel/card-carousel.component';
import { iconKind } from '@shared/ui/kind-icon/kind-icon.component';
import { RecordCardComponent } from '@shared/ui/record-card/record-card.component';

import { KnowledgeTextComponent } from '../knowledge-text/knowledge-text.component';

/** Stage units (the 920x572 canvas) taken by a label box; the root keeps a larger clearance. */
const nodeBox = { width: 134, height: 72 };
const rootBox = { width: 150, height: 84 };

/** Pushes overlapping label boxes apart along their shallowest axis; the root never moves. */
function relaxNodes(points: Map<string, { x: number; y: number }>, root: { x: number; y: number }) {
  const list = [...points.values()];
  const clamp = (value: number, half: number, size: number) =>
    Math.min(size - half - 4, Math.max(half + 4, value));
  for (let pass = 0; pass < 200; pass++) {
    let moved = false;
    for (let i = 0; i < list.length; i++) {
      const a = list[i]!;
      const rx = a.x - root.x;
      const ry = a.y - root.y;
      const rootX = (nodeBox.width + rootBox.width) / 2 - Math.abs(rx);
      const rootY = (nodeBox.height + rootBox.height) / 2 - Math.abs(ry);
      if (rootX > 0 && rootY > 0) {
        if (rootX < rootY) a.x += (rx >= 0 ? 1 : -1) * (rootX + 1);
        else a.y += (ry >= 0 ? 1 : -1) * (rootY + 1);
        moved = true;
      }
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j]!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const ox = nodeBox.width - Math.abs(dx);
        const oy = nodeBox.height - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        if (ox < oy) {
          const shift = ((dx >= 0 ? 1 : -1) * (ox + 1)) / 2;
          a.x += shift;
          b.x -= shift;
        } else {
          const shift = ((dy >= 0 ? 1 : -1) * (oy + 1)) / 2;
          a.y += shift;
          b.y -= shift;
        }
      }
    }
    for (const point of list) {
      point.x = clamp(point.x, nodeBox.width / 2, 920);
      point.y = clamp(point.y, nodeBox.height / 2, 572);
    }
    if (!moved) break;
  }
}

type RelationFilter = 'all' | 'discovery' | 'structured';
interface GraphNode {
  entity: Entity;
  x: number;
  y: number;
}
interface GraphEdge {
  relation: Relation;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

@Component({
  selector: 'app-ideology-atlas',
  imports: [
    RecordCardComponent,
    EditorialSourcesComponent,
    RouterLink,
    KnowledgeTextComponent,
    CardCarouselComponent,
    TimelineAxisComponent,
  ],
  templateUrl: './ideology-atlas.component.html',
  styleUrls: [
    './ideology-atlas.component.scss',
    './ideology-atlas-visual.scss',
    './ideology-atlas-interaction.scss',
  ],
})
export class IdeologyAtlasComponent {
  private readonly repository = inject(ContentRepository);
  private readonly graph = this.repository.knowledgeGraph;
  private readonly focus = inject(TimelineFocusService);
  /** Record echoed from the timeline, so the graph can mark it when it is on screen. */
  readonly echoId = this.focus.entityId;
  readonly atlasId = input.required<string>();
  readonly rootEntityId = input.required<string>();
  readonly origin = input.required<string>();
  readonly openingTitle = input('Uma rede.');
  readonly openingSubtitle = input('Muitas entradas.');
  readonly embedded = input(false);
  readonly continuous = input(false);
  /** Below 672px the canvas gives way to the text list, which then opens by default. */
  readonly textAlternative = signal(false);
  readonly atlas = computed(
    () => this.graph.atlases.find((item) => item.id === this.atlasId()) ?? this.graph.atlases[0]!,
  );
  readonly discoveryLinkCount = computed(
    () => this.atlas().relations.filter((relation) => relation.type === 'encyclopedic-link').length,
  );
  readonly structuredRelationCount = computed(
    () => this.atlas().relations.length - this.discoveryLinkCount(),
  );
  readonly unconnectedEntityCount = computed(
    () =>
      this.entities().filter(
        (entity) =>
          !this.atlas().relations.some(
            (relation) => relation.fromEntityId === entity.id || relation.toEntityId === entity.id,
          ),
      ).length,
  );
  readonly hoveredId = signal<string | null>(null);
  readonly relationFilter = signal<RelationFilter>('all');
  readonly selectedId = linkedSignal(() => this.rootEntityId());
  readonly search = signal('');
  readonly history = signal<string[]>([]);
  readonly entities = computed(() => {
    return this.atlas().entities;
  });
  readonly allEntities = computed(() => this.graph.atlases.flatMap((item) => item.entities));
  readonly selected = computed(
    () =>
      this.allEntities().find((entity) => entity.id === this.selectedId()) ?? this.entities()[0],
  );
  readonly filteredEntities = computed(() => {
    const query = this.search().trim().toLocaleLowerCase('pt-BR');
    return this.entities().filter(
      (entity) =>
        !query ||
        [entity.title, entity.summary, ...entity.aliases].some((value) =>
          value.toLocaleLowerCase('pt-BR').includes(query),
        ),
    );
  });
  readonly relations = computed(() =>
    this.repository.queryRelations(this.selectedId(), { atlasId: this.atlasId() }),
  );
  readonly visibleRelations = computed(() =>
    this.relations().filter((relation) => {
      if (this.relationFilter() === 'discovery')
        return relation.relationType === 'encyclopedic-link';
      if (this.relationFilter() === 'structured')
        return relation.relationType !== 'encyclopedic-link';
      return true;
    }),
  );
  /** The textual list carries each relation's evidence, so it opens folded past this many. */
  readonly relationPreview = 5;
  readonly showAllRelations = signal(false);
  readonly shownRelations = computed(() =>
    this.showAllRelations()
      ? this.visibleRelations()
      : this.visibleRelations().slice(0, this.relationPreview),
  );
  readonly graphNodes = computed<GraphNode[]>(() => {
    const focusId = this.selectedId();
    const visibleIds = new Set([
      focusId,
      this.rootEntityId(),
      ...this.visibleRelations().map((relation) => relation.relatedEntityId),
    ]);
    const entities = this.allEntities();
    const items = entities.filter((entity) => visibleIds.has(entity.id));
    const layout = this.repository.layouts.atlases;
    const root = layout.order[this.rootEntityId()];
    if (root === undefined) throw new Error('Raiz do atlas ausente do layout compilado.');
    // Neighbours sit on concentric ellipses, evenly spaced, so labels never stack on each other.
    const rings = [
      { capacity: 8, rx: 250, ry: 140 },
      { capacity: 13, rx: 335, ry: 218 },
      { capacity: 18, rx: 395, ry: 250 },
    ];
    const around = items
      .filter((entity) => entity.id !== this.rootEntityId())
      .sort((a, b) => layout.order[a.id]! - layout.order[b.id]!);
    const placed = new Map<string, { x: number; y: number }>();
    let from = 0;
    rings.forEach((ring, index) => {
      const last = index === rings.length - 1;
      const group = around.slice(from, last ? undefined : from + ring.capacity);
      from += group.length;
      group.forEach((entity, i) => {
        const angle =
          -Math.PI / 2 +
          (2 * Math.PI * i) / group.length +
          (index % 2 ? Math.PI / group.length : 0);
        placed.set(entity.id, {
          x: layout.center.x + Math.cos(angle) * ring.rx,
          y: layout.center.y + Math.sin(angle) * ring.ry,
        });
      });
    });
    relaxNodes(placed, layout.center);
    return items.map((entity) => ({
      entity,
      ...(placed.get(entity.id) ?? layout.center),
    }));
  });
  readonly graphEdges = computed<GraphEdge[]>(() => {
    const positions = new Map(this.graphNodes().map((node) => [node.entity.id, node]));
    return this.visibleRelations().flatMap((result) => {
      const relation = this.atlas().relations.find((item) => item.id === result.relationId);
      if (!relation) return [];
      if (relation.fromEntityId !== this.selectedId() && relation.toEntityId !== this.selectedId())
        return [];
      const from = positions.get(relation.fromEntityId);
      const to = positions.get(relation.toEntityId);
      return from && to ? [{ relation, x1: from.x, y1: from.y, x2: to.x, y2: to.y }] : [];
    });
  });
  readonly timelineEntities = computed(() =>
    this.entities()
      .filter(
        (entity) =>
          entity.kind !== 'ideology' &&
          entity.kind !== 'concept' &&
          entity.temporalExtent &&
          (entity.temporalExtent.startYear !== null || entity.temporalExtent.endYear !== null),
      )
      .sort((a, b) => this.timelineYear(a) - this.timelineYear(b)),
  );
  readonly timelineItems = computed(() =>
    this.timelineEntities().flatMap((entity) => axisItemOf(entity) ?? []),
  );
  /** Records the axis could carry if they had a date. */
  readonly timelineUndated = computed(
    () =>
      this.entities().filter(
        (entity) =>
          entity.kind !== 'ideology' &&
          entity.kind !== 'concept' &&
          !this.timelineEntities().includes(entity),
      ).length,
  );
  readonly timelineId = signal<string | null>(null);
  readonly timelineSelectedId = computed(() => this.timelineSelected()?.id ?? null);
  readonly timelineSelected = computed(
    () =>
      this.timelineEntities().find((entity) => entity.id === this.timelineId()) ??
      this.timelineEntities()[0],
  );

  constructor() {
    const view = inject(DOCUMENT).defaultView;
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    if (!view?.ResizeObserver) return;
    // The canvas is a 920-wide stage: below ~40rem of real column width it gives way to the text list.
    const observer = new view.ResizeObserver(([entry]) =>
      this.textAlternative.set(entry.contentRect.width < 640),
    );
    observer.observe(host);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  openEntity(entityId: string): void {
    if (entityId === this.selectedId()) return;
    this.history.update((items) => [...items, this.selectedId()]);
    this.selectedId.set(entityId);
  }
  returnContext(): void {
    const previous = this.history().at(-1);
    if (!previous) {
      this.selectedId.set(this.rootEntityId());
      return;
    }
    this.history.update((items) => items.slice(0, -1));
    this.selectedId.set(previous);
  }
  setRelationFilter(value: string): void {
    if (value === 'all' || value === 'discovery' || value === 'structured') {
      this.relationFilter.set(value);
    }
  }
  setSearch(value: string): void {
    this.search.set(value);
  }
  selectTimeline(entityId: string): void {
    this.timelineId.set(entityId);
    this.focus.entityId.set(entityId);
  }
  timelineYear(entity: Entity): number {
    return entity.temporalExtent?.startYear ?? entity.temporalExtent?.endYear ?? 0;
  }
  yearLabel(entity: Entity): string {
    const extent = entity.temporalExtent;
    if (!extent) return 'Data não informada';
    const qualifier = extent.precision === 'approximate' ? 'c. ' : '';
    if (extent.startYear !== null && extent.endYear !== null)
      return `${qualifier}${extent.startYear}–${extent.endYear}`;
    if (extent.startYear !== null) return `${qualifier}a partir de ${extent.startYear}`;
    if (extent.endYear !== null) return `${qualifier}até ${extent.endYear}`;
    return extent.label ?? 'Data não informada';
  }
  cardIcon(entity: Entity) {
    return iconKind(entity.kind);
  }
  picture(entity: Entity): string | null {
    return entityMedia(this.repository.knowledgeGraph, entity)?.assetPath ?? null;
  }
  relationNote(id: string): string {
    const count = this.atlas().relations.filter(
      (r) => r.fromEntityId === id || r.toEntityId === id,
    ).length;
    return count ? `${count} ${count === 1 ? 'relação' : 'relações'}` : '';
  }
  kindLabel(entity: Entity): string {
    return this.kindName(entity.kind);
  }
  kindName(kind: Entity['kind']): string {
    return entityKindLabel(kind);
  }
  relationName(relation: KnowledgeRelationResult): string {
    const labels: Record<string, string> = {
      'encyclopedic-link': 'link enciclopédico',
      related_to: 'classificação relacionada',
      influenced: 'influenciou',
      influenced_by: 'influenciado por',
      associated_with: 'associado a',
      reacted_against: 'reagiu contra',
      developed_into: 'desenvolveu-se em',
      participated_in: 'participou de',
      wrote: 'escreveu',
      authored: 'autoria',
      event_influenced_ideology: 'evento ligado a uma ideologia',
    };
    return labels[relation.relationType] ?? relation.relationType;
  }
  relationSourceLabel(relation: KnowledgeRelationResult): string {
    const provenance = this.atlas().relations.find((item) => item.id === relation.relationId)
      ?.provenance?.source;
    return provenance === 'wikipedia'
      ? 'Descoberta na Wikipedia'
      : provenance === 'wikidata'
        ? 'Afirmação estruturada no Wikidata'
        : 'Relação editorial';
  }
  relationStatusLabel(relation: KnowledgeRelationResult): string {
    const status = this.atlas().relations.find(
      (item) => item.id === relation.relationId,
    )?.editorialStatus;
    return status === 'pending'
      ? 'revisão pendente'
      : status === 'verified'
        ? 'verificada editorialmente'
        : status === 'contested'
          ? 'controversa'
          : status === 'needs-update'
            ? 'precisa de atualização'
            : status === 'draft'
              ? 'rascunho'
              : 'estado editorial não informado';
  }
  relationUncertaintyLabel(relation: KnowledgeRelationResult): string {
    const labels: Record<Relation['uncertainty'], string> = {
      low: 'baixa',
      moderate: 'moderada',
      high: 'alta',
      unknown: 'não avaliada',
    };
    return labels[relation.uncertainty];
  }
  relationSources(relation: KnowledgeRelationResult): EditorialReference[] {
    const record = this.atlas().relations.find((item) => item.id === relation.relationId);
    if (!record) return [];

    const references = new Map<string, EditorialReference>();
    const addReference = (reference: EditorialReference) => {
      const key = reference.url ?? reference.id;
      const existing = references.get(key);
      references.set(
        key,
        existing
          ? {
              ...existing,
              locator:
                [existing.locator, reference.locator].filter(Boolean).join(' · ') || undefined,
            }
          : reference,
      );
    };

    if (record.provenance) {
      addReference({
        id: `provenance-${record.id}`,
        title: record.provenance.source === 'wikipedia' ? 'Wikipedia' : 'Wikidata',
        url: record.provenance.url,
        locator: `Consultada em ${record.provenance.retrievedAt}`,
      });
    }
    for (const evidenceId of record.evidenceIds) {
      const evidence = this.atlas().evidences.find((item) => item.id === evidenceId);
      const source = evidence && this.atlas().sources.find((item) => item.id === evidence.sourceId);
      if (evidence && source) {
        addReference({
          id: evidence.id,
          title: source.title,
          url: source.url,
          locator: evidence.locator,
        });
      }
    }
    return [...references.values()];
  }
  relationTarget(relation: KnowledgeRelationResult): Entity | undefined {
    return this.allEntities().find((entity) => entity.id === relation.relatedEntityId);
  }
  relationSource(relation: KnowledgeRelationResult): Entity | undefined {
    return relation.direction === 'outgoing' ? this.selected() : this.relationTarget(relation);
  }
  relationDestination(relation: KnowledgeRelationResult): Entity | undefined {
    return relation.direction === 'outgoing' ? this.relationTarget(relation) : this.selected();
  }
  nodePosition(entityId: string): GraphNode | undefined {
    return this.graphNodes().find((node) => node.entity.id === entityId);
  }
}
