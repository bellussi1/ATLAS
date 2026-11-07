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
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { readerPredicate, readerProse } from '@core/content/editorial/reader-voice';
import { entityMedia } from '@core/content/media/asset-license';
import { type Entity, placeTypeOf, type Relation } from '@core/content/models/content-schema';
import type { KnowledgeRelationResult } from '@core/content/queries/knowledge-graph';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { EditorialSourcesComponent } from '@ideologies/components/editorial-sources/editorial-sources.component';
import { TimelineAxisComponent } from '@ideologies/components/timeline-axis/timeline-axis.component';
import type { EditorialReference } from '@ideologies/models/editorial-reference';
import { TimelineFocusService } from '@ideologies/services/timeline-focus.service';
import { axisItemOf, entityKindLabel } from '@ideologies/utils/timeline-axis-items';
import { CardCarouselComponent } from '@shared/ui/card-carousel/card-carousel.component';
import { iconKind } from '@shared/ui/kind-icon/kind-icon.component';
import { KnowledgeNetworkComponent } from '@shared/ui/knowledge-network/knowledge-network.component';
import { RecordCardComponent } from '@shared/ui/record-card/record-card.component';

import { KnowledgeTextComponent } from '../knowledge-text/knowledge-text.component';

@Component({
  selector: 'app-ideology-atlas',
  imports: [
    RecordCardComponent,
    EditorialSourcesComponent,
    RouterLink,
    KnowledgeTextComponent,
    CardCarouselComponent,
    TimelineAxisComponent,
    KnowledgeNetworkComponent,
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
  private readonly entityReading = viewChild<ElementRef<HTMLElement>>('entityReading');
  private readonly contextTitle = viewChild<ElementRef<HTMLElement>>('contextTitle');
  readonly atlasId = input.required<string>();
  readonly rootEntityId = input.required<string>();
  readonly origin = input.required<string>();
  readonly openingTitle = input('Uma rede.');
  readonly openingSubtitle = input('Muitas entradas.');
  readonly embedded = input(false);
  readonly continuous = input(false);
  /** On narrow columns the textual list opens by default, even though the graph stays available. */
  readonly narrow = signal(false);
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
  readonly visibleRelations = computed(() => this.relations());
  /** The textual list carries each relation's evidence, so it opens folded past this many. */
  readonly relationPreview = 5;
  readonly showAllRelations = signal(false);
  readonly shownRelations = computed(() =>
    this.showAllRelations()
      ? this.visibleRelations()
      : this.visibleRelations().slice(0, this.relationPreview),
  );
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

  readonly prose = readerProse;
  readonly predicate = readerPredicate;

  constructor() {
    const view = inject(DOCUMENT).defaultView;
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    if (!view?.ResizeObserver) return;
    const observer = new view.ResizeObserver(([entry]) =>
      this.narrow.set(entry.contentRect.width < 640),
    );
    observer.observe(host);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  openEntity(entityId: string): void {
    if (entityId === this.selectedId()) return;
    this.history.update((items) => [...items, this.selectedId()]);
    this.selectedId.set(entityId);
  }
  openPicked(entityId: string | null): void {
    if (entityId) this.openEntity(entityId);
  }
  /** Takes the reader from the map to the record it just opened, with focus on the title. */
  showRecord(): void {
    const section = this.entityReading()?.nativeElement;
    if (!section) return;
    const reduce = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    section.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    this.contextTitle()?.nativeElement.focus({ preventScroll: true });
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
  setSearch(value: string): void {
    this.search.set(value);
  }
  selectTimeline(entityId: string): void {
    this.timelineId.set(entityId);
    this.focus.entityId.set(entityId);
    this.openEntity(entityId);
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
    return iconKind(entity.kind, placeTypeOf(entity));
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
    return entityKindLabel(entity.kind, placeTypeOf(entity));
  }
  relationName(relation: KnowledgeRelationResult): string {
    const labels: Record<string, string> = {
      'encyclopedic-link': 'pista de leitura',
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
      ? 'Ligação entre verbetes'
      : provenance === 'wikidata'
        ? 'Classificação de catálogo'
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
              ? 'versão preliminar'
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
        title: record.provenance.source === 'wikipedia' ? 'Wikipédia' : 'Wikidata',
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
}
