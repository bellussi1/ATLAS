import { Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { entityMedia } from '@core/content/media/asset-license';
import type { Entity, Source } from '@core/content/models/content-schema';
import { type KnowledgeContext } from '@core/content/models/knowledge-context';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { EditorialSourcesComponent } from '@ideologies/components/editorial-sources/editorial-sources.component';
import {
  EraChartComponent,
  type EraChartEpoch,
} from '@ideologies/components/era-chart/era-chart.component';
import { IdeologyAtlasComponent } from '@ideologies/components/ideology-atlas/ideology-atlas.component';
import { KnowledgeTextComponent } from '@ideologies/components/knowledge-text/knowledge-text.component';
import { PositionsEstimateComponent } from '@ideologies/components/positions-estimate/positions-estimate.component';
import { ReadingPathComponent } from '@ideologies/components/reading-path/reading-path.component';
import { ValueDebateComponent } from '@ideologies/components/value-debate/value-debate.component';
import type {
  ExplorationItem,
  IdeologyDossier,
  IdeologyEdge,
  PageBlock,
} from '@ideologies/models/ideology-page.schema';
import {
  relationSentence,
  type RelationType,
  relationTypes,
} from '@ideologies/models/relation-types';
import { type PageMedia } from '@ideologies/utils/page-media-plan';
import { timelineStops } from '@ideologies/utils/timeline-stops';
import { KnowledgeContextDirective } from '@shared/directives/knowledge-context/knowledge-context.directive';
import { AtlasRevealDirective } from '@shared/directives/reveal/reveal.directive';
import { type IconKind, iconKind } from '@shared/ui/kind-icon/kind-icon.component';
import { RecordCardComponent } from '@shared/ui/record-card/record-card.component';

@Component({
  selector: 'app-ideology-block',
  imports: [
    RecordCardComponent,
    EditorialSourcesComponent,
    ValueDebateComponent,
    KnowledgeContextDirective,
    KnowledgeTextComponent,
    AtlasRevealDirective,
    EraChartComponent,
    IdeologyAtlasComponent,
    ReadingPathComponent,
    PositionsEstimateComponent,
  ],
  templateUrl: './ideology-block.component.html',
  styleUrls: [
    './ideology-block.component.scss',
    './ideology-exploration.scss',
    './ideology-media.scss',
    './ideology-relations.scss',
  ],
})
export class IdeologyBlockComponent {
  readonly block = input.required<PageBlock>();
  readonly dossier = input.required<IdeologyDossier>();
  readonly blockId = input.required<string>();
  readonly repository = inject(ContentRepository);
  readonly edgeFilter = signal('all');
  readonly showAllEntities = signal(false);
  readonly entityPreviewCount = 6;
  readonly entityNoun = computed(() => {
    const block = this.block();
    return block.type === 'entities' && block.mode === 'thinkers' ? 'pensadores' : 'registros';
  });
  readonly phases = [
    { key: 'defence', label: 'Defesa' },
    { key: 'criticism', label: 'Crítica' },
    { key: 'response', label: 'Resposta' },
    { key: 'limits', label: 'Limites' },
  ] as const;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  /** Entities named by a positions block, with the titles shown to the reader. */
  readonly positionEntities = computed(() => {
    const block = this.block();
    return block.type === 'positions'
      ? block.entityIds.map((id) => ({ id, title: this.entity(id)?.title ?? id }))
      : [];
  });
  readonly entities = computed(() => {
    const block = this.block();
    const ids = 'entityIds' in block ? block.entityIds : [];
    return ids.flatMap((id) => this.entity(id) ?? []);
  });
  readonly edges = computed(() => {
    const block = this.block();
    return block.type === 'graph'
      ? this.dossier().supplement.edges.filter((e) => block.edgeIds.includes(e.id))
      : [];
  });
  readonly visibleEdges = computed(() =>
    this.edges().filter((e) => this.edgeFilter() === 'all' || e.type === this.edgeFilter()),
  );
  readonly edgeTypes = computed(() => [...new Set(this.edges().map((e) => e.type))]);
  /** The legend explains only the kind being shown. */
  readonly legendTypes = computed(() => {
    const filter = this.edgeFilter();
    return filter === 'all' ? this.edgeTypes() : [filter];
  });
  readonly eraEpochs = computed<EraChartEpoch[]>(() => {
    const block = this.block();
    if (block.type !== 'chronology') return [];
    const items = this.dossier().page.chapters.flatMap((c) =>
      c.blocks.flatMap((b) => (b.type === 'explorations' ? b.items : [])),
    );
    return block.epochs.flatMap((epoch) => {
      const item = items.find((i) => i.id === epoch.itemId);
      return item
        ? [
            {
              id: item.id,
              title: item.title,
              kicker: item.kicker,
              summary: item.summary,
              start: epoch.start,
              end: epoch.end,
              context: this.explorationContext(item),
            },
          ]
        : [];
    });
  });
  readonly eraMarkers = computed(() => {
    const block = this.block();
    return block.type === 'chronology'
      ? block.markerIds.flatMap((id) => this.entity(id) ?? [])
      : [];
  });
  readonly explorationItems = computed(() => {
    const block = this.block();
    return block.type === 'explorations' ? block.items : [];
  });
  readonly debateTopics = computed(() => {
    const block = this.block();
    return block.type === 'debate' ? block.topics : [];
  });
  readonly selectedTopic = computed<
    Extract<PageBlock, { type: 'debate' }>['topics'][number] | undefined
  >(
    () =>
      this.debateTopics().find((t) => t.id === this.params().get('debate')) ??
      this.debateTopics()[0],
  );
  readonly timeline = computed(() =>
    [...this.entities()]
      .filter(
        (e) => e.temporalExtent?.startYear !== null && e.temporalExtent?.startYear !== undefined,
      )
      .sort((a, b) => (a.temporalExtent?.startYear ?? 0) - (b.temporalExtent?.startYear ?? 0)),
  );
  /** Markers of the scale: the same records as the list, so both always agree. */
  readonly timelineStops = computed(() =>
    timelineStops(
      this.timeline().map((e) => ({ id: e.id, year: e.temporalExtent?.startYear ?? 0 })),
    ),
  );
  readonly selectedTimeline = computed<Entity | undefined>(
    () => this.timeline().find((e) => e.id === this.params().get('evento')) ?? this.timeline()[0],
  );
  readonly selectedTimelineIndex = computed(() =>
    this.timeline().findIndex((e) => e.id === this.selectedTimeline()?.id),
  );
  readonly sourceList = computed(() => {
    const block = this.block();
    const ids = block.type === 'sources' ? block.sourceIds : [];
    const query = this.params().get('bibliografia')?.toLocaleLowerCase('pt-BR') ?? '';
    return ids
      .flatMap((id) => this.source(id) ?? [])
      .filter((s) => s.title.toLocaleLowerCase('pt-BR').includes(query));
  });
  readonly atlas = computed(() =>
    this.repository.knowledgeGraph.atlases.find((a) => a.id === this.dossier().page.atlasId)!,
  );
  /** Card pictures planned for the whole page; see `planPageMedia`. */
  readonly mediaPlan = input<ReadonlyMap<string, PageMedia>>(new Map());

  note(id: string): string | undefined {
    const block = this.block();
    return block.type === 'entities' ? block.notes[id] : undefined;
  }
  entity(id: string): Entity | undefined {
    return this.repository.knowledgeGraph.atlases
      .flatMap((a) => a.entities)
      .find((e) => e.id === id);
  }
  source(id: string): Source | undefined {
    return [
      ...this.dossier().supplement.sources,
      ...this.repository.knowledgeGraph.atlases.flatMap((a) => a.sources),
    ].find((s) => s.id === id);
  }
  media(entity: Entity) {
    return entityMedia(this.repository.knowledgeGraph, entity);
  }
  entityPicture(entity: Entity) {
    return this.mediaPlan().get(`${this.blockId()}/${entity.id}`);
  }
  itemMedia(item: ExplorationItem) {
    return this.mediaPlan().get(`${this.blockId()}/${item.id}`);
  }
  /** Glyph and period of an exploration card, read from the first record it names. */
  itemCard(item: ExplorationItem): { icon: IconKind; period: string } {
    const entity = item.entityIds.map((id) => this.entity(id)).find(Boolean);
    const extent = entity?.temporalExtent;
    const period =
      extent?.label ??
      (extent?.startYear != null
        ? extent.endYear && extent.endYear !== extent.startYear
          ? `${extent.startYear}–${extent.endYear}`
          : `${extent.startYear}`
        : '');
    const icon =
      item.classification === 'tese atribuída' || !entity ? 'thesis' : iconKind(entity.kind);
    return { icon, period };
  }
  explorationContext(item: ExplorationItem): KnowledgeContext {
    return {
      title: item.title,
      kind: `${item.kicker} · ${item.classification}`,
      summary: item.summary,
      paragraphs: item.paragraphs,
      sources: item.sourceIds.flatMap((id) => this.source(id) ?? []),
      connections: item.entityIds.map((id) => ({
        entityId: id,
        label: `${this.entity(id)?.title ?? id} · abrir contexto relacionado`,
      })),
    };
  }
  relation(edge: IdeologyEdge) {
    return relationTypes[edge.type];
  }
  sentence(edge: IdeologyEdge) {
    return relationSentence(edge);
  }
  relationOf(type: string) {
    return relationTypes[type as RelationType];
  }
  countOf(type: string): number {
    return this.edges().filter((e) => e.type === type).length;
  }
  /** Arrow keys walk the markers and open each record, like the epoch tabs. */
  stepStop(event: KeyboardEvent, index: number): void {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    const stops = this.timelineStops();
    const next = stops[index + delta];
    if (!delta || !next) return;
    event.preventDefault();
    this.update('evento', next.id);
    const buttons = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll('button');
    buttons?.[index + delta]?.focus();
  }
  toggleEntities(): void {
    this.showAllEntities.update((open) => !open);
  }
  period(entity: Entity): string {
    const t = entity.temporalExtent;
    return (
      t?.label ??
      (t?.startYear
        ? `${t.startYear}${t.endYear && t.endYear !== t.startYear ? '–' + t.endYear : ''}`
        : 'Período não informado')
    );
  }
  update(key: string, value: string | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [key]: value },
      queryParamsHandling: 'merge',
      preserveFragment: true,
      replaceUrl: true,
      scroll: 'manual',
    });
  }
  entitySources(entity: Entity): Source[] {
    const graph = this.repository.knowledgeGraph;
    const sources = graph.atlases.flatMap((a) => a.sources);
    const evidenceIds = new Set(
      graph.atlases
        .flatMap((a) =>
          a.claims.filter((c) => c.entityId === entity.id).flatMap((c) => c.citationIds),
        )
        .flatMap(
          (id) =>
            graph.atlases.flatMap((a) => a.citations).find((c) => c.id === id)?.evidenceId ?? [],
        ),
    );
    const sourceIds = new Set(
      graph.atlases
        .flatMap((a) => a.evidences)
        .filter((e) => evidenceIds.has(e.id))
        .map((e) => e.sourceId),
    );
    return sources.filter((s) => sourceIds.has(s.id));
  }
}
