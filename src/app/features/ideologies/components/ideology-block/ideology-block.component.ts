import { Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { reproducibleAsset } from '@core/content/media/asset-license';
import type { Entity, Source } from '@core/content/models/content-schema';
import { type KnowledgeContext } from '@core/content/models/knowledge-context';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { EditorialSourcesComponent } from '@ideologies/components/editorial-sources/editorial-sources.component';
import { KnowledgeTextComponent } from '@ideologies/components/knowledge-text/knowledge-text.component';
import { ValueDebateComponent } from '@ideologies/components/value-debate/value-debate.component';
import type {
  ExplorationItem,
  IdeologyDossier,
  IdeologyEdge,
  PageBlock,
} from '@ideologies/models/ideology-page.schema';
import { KnowledgeContextDirective } from '@shared/directives/knowledge-context/knowledge-context.directive';
import { AtlasRevealDirective } from '@shared/directives/reveal/reveal.directive';

@Component({
  selector: 'app-ideology-block',
  imports: [
    EditorialSourcesComponent,
    ValueDebateComponent,
    KnowledgeContextDirective,
    KnowledgeTextComponent,
    AtlasRevealDirective,
  ],
  templateUrl: './ideology-block.component.html',
  styleUrls: ['./ideology-block.component.scss', './ideology-exploration.scss'],
})
export class IdeologyBlockComponent {
  readonly block = input.required<PageBlock>();
  readonly dossier = input.required<IdeologyDossier>();
  readonly blockId = input.required<string>();
  readonly repository = inject(ContentRepository);
  readonly hoveredNode = signal<string | null>(null);
  readonly edgeFilter = signal('all');
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
  readonly selectedEdge = computed<IdeologyEdge | undefined>(
    () =>
      this.visibleEdges().find((e) => e.id === this.params().get('relacao')) ??
      this.visibleEdges()[0],
  );
  readonly edgeTypes = computed(() => [...new Set(this.edges().map((e) => e.type))]);
  readonly explorationItems = computed(() => {
    const block = this.block();
    return block.type === 'explorations' ? block.items : [];
  });
  readonly explorationMode = computed(() => {
    const block = this.block();
    return block.type === 'explorations' ? block.mode : 'principles';
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
  readonly graph = computed(
    () =>
      this.repository.layouts.editorial[this.dossier().page.slug]?.graphs[this.blockId()] ?? {
        nodes: [],
        height: 380,
        paths: [],
      },
  );
  readonly graphNodes = computed(() =>
    this.graph().nodes.map((node) => ({
      ...node,
      title: this.entity(node.id)?.title ?? node.id,
    })),
  );
  readonly graphPaths = computed(
    () => new Map(this.edges().map((edge, i) => [edge.id, this.graph().paths[i]])),
  );
  readonly timelineAxis = computed(
    () =>
      this.repository.layouts.editorial[this.dossier().page.slug]?.timelines[this.blockId()] ??
      null,
  );
  readonly timeline = computed(() => {
    const period = this.params().get('periodo');
    return [...this.entities()]
      .filter((e) => {
        const year = e.temporalExtent?.startYear;
        return (
          year !== null &&
          year !== undefined &&
          (period === 'antes-1850' ? year < 1850 : period === 'desde-1850' ? year >= 1850 : true)
        );
      })
      .sort((a, b) => (a.temporalExtent?.startYear ?? 0) - (b.temporalExtent?.startYear ?? 0));
  });
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
    return this.atlas().assetLicenses.find(
      (asset) =>
        asset.entityId === entity.id &&
        asset.attribution &&
        asset.filePageUrl &&
        reproducibleAsset(this.atlas(), asset.assetPath),
    );
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
  highlightEdge(edge: IdeologyEdge): boolean {
    return this.hoveredNode()
      ? edge.from === this.hoveredNode() || edge.to === this.hoveredNode()
      : this.selectedEdge()?.id === edge.id;
  }
  selectNode(id: string): void {
    const edge = this.visibleEdges().find((e) => e.from === id || e.to === id);
    if (edge) this.update('relacao', edge.id);
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
