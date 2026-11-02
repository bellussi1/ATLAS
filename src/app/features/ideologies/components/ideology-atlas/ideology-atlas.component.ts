import { Component, computed, inject, input, linkedSignal, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Entity, Relation } from '@core/content/models/content-schema';
import type { KnowledgeRelationResult } from '@core/content/queries/knowledge-graph';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { EditorialSourcesComponent } from '@ideologies/components/editorial-sources/editorial-sources.component';
import type { EditorialReference } from '@ideologies/models/editorial-reference';
import { centuryLabel } from '@ideologies/utils/timeline-periods';
import { KnowledgeContextDirective } from '@shared/directives/knowledge-context/knowledge-context.directive';
import { CardCarouselComponent } from '@shared/ui/card-carousel/card-carousel.component';

import { KnowledgeTextComponent } from '../knowledge-text/knowledge-text.component';

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
interface TimelinePeriod {
  label: string;
  entities: Entity[];
}

@Component({
  selector: 'app-ideology-atlas',
  imports: [
    EditorialSourcesComponent,
    RouterLink,
    KnowledgeTextComponent,
    KnowledgeContextDirective,
    CardCarouselComponent,
  ],
  templateUrl: './ideology-atlas.component.html',
  styleUrls: [
    './ideology-atlas.component.scss',
    './ideology-atlas-visual.scss',
    './ideology-atlas-timeline.scss',
    './ideology-atlas-interaction.scss',
  ],
})
export class IdeologyAtlasComponent {
  private readonly repository = inject(ContentRepository);
  private readonly graph = this.repository.knowledgeGraph;
  private readonly timelineCarousel = viewChild<CardCarouselComponent>('timelineCarousel');
  readonly atlasId = input.required<string>();
  readonly rootEntityId = input.required<string>();
  readonly origin = input.required<string>();
  readonly openingTitle = input('Uma rede.');
  readonly openingSubtitle = input('Muitas entradas.');
  readonly embedded = input(false);
  readonly continuous = input(false);
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
    return items.map((entity) => {
      const position = layout.order[entity.id];
      const point =
        entity.id === this.rootEntityId()
          ? layout.center
          : layout.slots[position - (position > root ? 1 : 0)];
      return { entity, ...point };
    });
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
  readonly timelineKinds = computed(() => [
    ...new Set(this.timelineEntities().map((entity) => entity.kind)),
  ]);
  /** Consecutive records grouped by century; the strip keeps chronological order. */
  readonly timelinePeriods = computed(() =>
    this.timelineEntities().reduce<TimelinePeriod[]>((periods, entity) => {
      const label = centuryLabel(this.timelineYear(entity));
      const current = periods.at(-1);
      if (current?.label === label) current.entities.push(entity);
      else periods.push({ label, entities: [entity] });
      return periods;
    }, []),
  );
  readonly timelineId = signal<string | null>(null);
  readonly timelineSelected = computed(
    () =>
      this.timelineEntities().find((entity) => entity.id === this.timelineId()) ??
      this.timelineEntities()[0],
  );
  readonly timelineIndex = computed(() =>
    this.timelineEntities().findIndex((entity) => entity.id === this.timelineSelected()?.id),
  );

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
  }
  /** Moves the selection one record at a time and keeps it visible in the carousel. */
  stepTimeline(step: 1 | -1): void {
    const entities = this.timelineEntities();
    const index = Math.min(Math.max(this.timelineIndex() + step, 0), entities.length - 1);
    const next = entities[index];
    if (!next) return;
    this.selectTimeline(next.id);
    this.revealTimeline();
  }
  /** Selects the first record of a period and brings it into view. */
  jumpToPeriod(period: { entities: readonly Entity[] }): void {
    const first = period.entities[0];
    if (!first) return;
    this.selectTimeline(first.id);
    this.revealTimeline();
  }
  periodLabelOf(entity: Entity): string {
    return centuryLabel(this.timelineYear(entity));
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
  kindLabel(entity: Entity): string {
    return this.kindName(entity.kind);
  }
  kindName(kind: Entity['kind']): string {
    const labels: Record<Entity['kind'], string> = {
      person: 'Pessoa',
      ideology: 'Corrente ideológica',
      concept: 'Conceito',
      work: 'Obra',
      event: 'Acontecimento',
      'historical-polity': 'Formação política histórica',
      country: 'País',
      regime: 'Regime',
      place: 'Território',
      party: 'Partido',
      institution: 'Organização',
      government: 'Governo',
      policy: 'Política pública',
      article: 'Artigo',
    };
    return labels[kind];
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
  /** Scrolls only the timeline carousel, so the page does not jump. */
  private revealTimeline(): void {
    this.timelineCarousel()?.revealIndex(this.timelineIndex());
  }
}
