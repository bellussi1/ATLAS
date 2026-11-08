import { Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { readerProse, type RelationEvidence } from '@core/content/editorial/reader-voice';
import type { Entity, Source } from '@core/content/models/content-schema';
import { type KnowledgeContext } from '@core/content/models/knowledge-context';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { readingPath } from '@core/routing/reading-routes';
import { EditorialSourcesComponent } from '@ideologies/components/editorial-sources/editorial-sources.component';
import {
  EraChartComponent,
  type EraChartEpoch,
} from '@ideologies/components/era-chart/era-chart.component';
import { IdeologyAtlasComponent } from '@ideologies/components/ideology-atlas/ideology-atlas.component';
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
import { eraTemporalNotesForPeople } from '@ideologies/utils/chronology-temporal-notes';
import { type PageMedia } from '@ideologies/utils/page-media-plan';
import { KnowledgeContextDirective } from '@shared/directives/knowledge-context/knowledge-context.directive';
import { AtlasRevealDirective } from '@shared/directives/reveal/reveal.directive';
import { type IconKind, iconKind } from '@shared/ui/kind-icon/kind-icon.component';
import { RecordCardComponent } from '@shared/ui/record-card/record-card.component';
import { RelationEntryComponent } from '@shared/ui/relation-entry/relation-entry.component';

@Component({
  selector: 'app-ideology-block',
  imports: [
    RecordCardComponent,
    RelationEntryComponent,
    EditorialSourcesComponent,
    ValueDebateComponent,
    KnowledgeContextDirective,
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
  readonly readingPath = readingPath;
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
  /** Editorial reason for each transformative record, kept in the chronology block. */
  readonly eraMarkerNotes = computed(() => {
    const block = this.block();
    return new Map<string, string>(
      block.type === 'chronology' ? Object.entries(block.markerNotes) : [],
    );
  });
  /** Dated works and documented participation come from relations already in the atlas. */
  readonly eraTemporalNotes = computed(() =>
    eraTemporalNotesForPeople(this.atlas(), this.entities()),
  );
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
  readonly sourceList = computed(() => {
    const block = this.block();
    const ids = block.type === 'sources' ? block.sourceIds : [];
    const query = this.params().get('bibliografia')?.toLocaleLowerCase('pt-BR') ?? '';
    const seen = new Set<string>();
    return ids
      .flatMap((id) => {
        if (seen.has(id)) return [];
        seen.add(id);
        return this.source(id) ?? [];
      })
      .filter((s) => s.title.toLocaleLowerCase('pt-BR').includes(query));
  });
  readonly atlas = computed(() =>
    this.repository.knowledgeGraph.atlases.find((a) => a.id === this.dossier().page.atlasId)!,
  );
  /** The chapter this block belongs to, so a record opened here says where it was met. */
  readonly chapterTitle = computed(() => {
    const id = this.blockId();
    return (
      this.dossier().page.chapters.find(
        (chapter) => chapter.id === id.slice(0, id.lastIndexOf('-')),
      )?.title ?? null
    );
  });
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
      relevance: { chapter: this.chapterTitle() },
      paragraphs: item.paragraphs,
      sources: item.sourceIds.flatMap((id) => this.source(id) ?? []),
      connections: item.entityIds.flatMap((id) => {
        const label = this.entity(id)?.title;
        return label ? [{ entityId: id, label }] : [];
      }),
    };
  }
  relation(edge: IdeologyEdge) {
    return relationTypes[edge.type];
  }
  sentence(edge: IdeologyEdge) {
    return relationSentence(edge);
  }
  /** Topic and certainty of an edge, in the same line as the nature of any other relation. */
  edgeMeta(edge: IdeologyEdge): string {
    const topic = this.sentence(edge).topic;
    return [topic && `tema: ${topic}`, `relação ${edge.certainty}`].filter(Boolean).join(' · ');
  }
  edgeProse(edge: IdeologyEdge): string | null {
    return readerProse(edge.context);
  }
  edgeEvidence(edge: IdeologyEdge): RelationEvidence[] {
    return edge.sources.flatMap((id) => {
      const source = this.source(id);
      return source
        ? [{ id, quote: null, locator: null, title: source.title, url: source.url }]
        : [];
    });
  }
  relationOf(type: string) {
    return relationTypes[type as RelationType];
  }
  countOf(type: string): number {
    return this.edges().filter((e) => e.type === type).length;
  }
  toggleEntities(): void {
    this.showAllEntities.update((open) => !open);
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
