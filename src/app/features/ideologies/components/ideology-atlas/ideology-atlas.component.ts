import { DOCUMENT } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { readerPredicate, readerProse } from '@core/content/editorial/reader-voice';
import { type Entity, type Relation } from '@core/content/models/content-schema';
import type { KnowledgeRelationResult } from '@core/content/queries/knowledge-graph';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { EditorialSourcesComponent } from '@ideologies/components/editorial-sources/editorial-sources.component';
import type { EditorialReference } from '@ideologies/models/editorial-reference';
import { ContextPanelService } from '@shared/ui/knowledge-context/context-panel.service';
import { KnowledgeNetworkComponent } from '@shared/ui/knowledge-network/knowledge-network.component';

@Component({
  selector: 'app-ideology-atlas',
  imports: [EditorialSourcesComponent, RouterLink, KnowledgeNetworkComponent],
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
  private readonly panel = inject(ContextPanelService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly network = viewChild(KnowledgeNetworkComponent);
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
  readonly entities = computed(() => {
    return this.atlas().entities;
  });
  readonly allEntities = computed(() => this.graph.atlases.flatMap((item) => item.entities));
  readonly selected = computed(
    () =>
      this.allEntities().find((entity) => entity.id === this.selectedId()) ?? this.entities()[0],
  );
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

  readonly prose = readerProse;
  readonly predicate = readerPredicate;

  constructor() {
    // Following a relation inside the shared sheet keeps the graph's selection in step.
    effect(() => {
      const id = this.panel.entityId();
      if (id && id !== this.selectedId() && this.entities().some((entity) => entity.id === id))
        this.selectedId.set(id);
    });
    const view = inject(DOCUMENT).defaultView;
    const host = this.host.nativeElement;
    if (!view?.ResizeObserver) return;
    const observer = new view.ResizeObserver(([entry]) =>
      this.narrow.set(entry.contentRect.width < 640),
    );
    observer.observe(host);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  openPicked(entityId: string | null): void {
    if (!entityId) return;
    this.openContext(entityId, this.network()?.selectedTrigger() ?? undefined);
  }
  /** Opens the shared context sheet; the graph remains selected behind it. */
  openContext(entityId: string, trigger?: HTMLElement): void {
    this.selectedId.set(entityId);
    const target = trigger ?? this.network()?.selectedTrigger() ?? this.host.nativeElement;
    void this.panel.open({ entityId }, target, []);
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
