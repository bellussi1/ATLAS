import { Dialog } from '@angular/cdk/dialog';
import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Entity, Relation } from '@core/content/models/content-schema';
import { entityContext } from '@core/content/queries/entity-context';
import type { KnowledgeRelationResult } from '@core/content/queries/knowledge-graph';
import { queryKnowledgeRelations } from '@core/content/queries/knowledge-graph';
import {
  ContentRepository,
  methodologyKnowledgeGraph,
} from '@core/content/repositories/content-repository.service';
import { KnowledgeContextComponent } from '@shared/ui/knowledge-context/knowledge-context.component';

import { KnowledgeTextComponent } from '../knowledge-text/knowledge-text.component';

const graph = methodologyKnowledgeGraph;

type ViewMode = 'rede' | 'tempo' | 'imagens';
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
interface RelationReference {
  id: string;
  title: string;
  url: string | null;
  locator?: string;
}

@Component({
  selector: 'app-ideology-atlas',
  imports: [RouterLink, KnowledgeTextComponent],
  templateUrl: './ideology-atlas.component.html',
  styleUrls: [
    './ideology-atlas.component.scss',
    './ideology-atlas-visual.scss',
    './ideology-atlas-interaction.scss',
  ],
})
export class IdeologyAtlasComponent {
  private readonly document = inject(DOCUMENT);
  private readonly dialog = inject(Dialog);
  private readonly repository = inject(ContentRepository);
  readonly atlasId = input.required<string>();
  readonly rootEntityId = input.required<string>();
  readonly origin = input.required<string>();
  readonly openingTitle = input('Uma rede.');
  readonly openingSubtitle = input('Muitas entradas.');
  readonly embedded = input(false);
  readonly continuous = input(false);
  readonly atlas = computed(
    () => graph.atlases.find((item) => item.id === this.atlasId()) ?? graph.atlases[0]!,
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
  readonly mode = signal<ViewMode>('rede');
  readonly relationFilter = signal<RelationFilter>('all');
  readonly selectedId = linkedSignal(() => this.rootEntityId());
  readonly search = signal('');
  readonly history = signal<string[]>([]);
  readonly expandedMediaId = signal<string | null>(null);
  readonly entities = computed(() => {
    return this.atlas().entities;
  });
  readonly allEntities = computed(() => graph.atlases.flatMap((item) => item.entities));
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
    queryKnowledgeRelations(graph, this.selectedId(), { atlasId: this.atlasId() }),
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
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    return items.map((entity) => {
      if (entity.id === this.rootEntityId()) return { entity, x: 460, y: 286 };
      const others = entities.filter((item) => item.id !== this.rootEntityId());
      const position = others.findIndex((item) => item.id === entity.id);
      const angle = -Math.PI / 2 + position * goldenAngle;
      return { entity, x: 460 + Math.cos(angle) * 350, y: 286 + Math.sin(angle) * 205 };
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
      .sort(
        (a, b) =>
          (a.temporalExtent?.startYear ?? a.temporalExtent?.endYear ?? 0) -
          (b.temporalExtent?.startYear ?? b.temporalExtent?.endYear ?? 0),
      ),
  );
  readonly media = computed(() =>
    this.atlas().assetLicenses.flatMap((asset) => {
      const entity = this.entities().find((item) => item.id === asset.entityId);
      return entity &&
        asset.status === 'known' &&
        asset.reproduction === 'allowed' &&
        asset.license &&
        asset.licenseUrl &&
        asset.attribution &&
        asset.filePageUrl
        ? [{ asset, entity }]
        : [];
    }),
  );

  setMode(mode: ViewMode): void {
    this.mode.set(mode);
  }
  setRelationFilter(value: string): void {
    if (value === 'all' || value === 'discovery' || value === 'structured') {
      this.relationFilter.set(value);
    }
  }
  setSearch(value: string): void {
    this.search.set(value);
  }
  openEntity(entityId: string): void {
    if (entityId !== this.selectedId()) {
      this.history.update((items) => [...items, this.selectedId()]);
      this.selectedId.set(entityId);
    }
    if (this.document.defaultView?.matchMedia?.('(max-width: 1100px)').matches) {
      this.dialog.open(KnowledgeContextComponent, {
        data: entityContext(this.repository, entityId),
        ariaLabelledBy: 'knowledge-context-title',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
        width: 'min(56rem, calc(100vw - 2rem))',
        height: 'min(44rem, calc(100dvh - 2rem))',
        panelClass: 'atlas-context-panel',
      });
    }
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
    const labels: Record<Entity['kind'], string> = {
      person: 'Pessoa',
      ideology: 'Corrente ideológica',
      concept: 'Conceito',
      work: 'Obra',
      event: 'Acontecimento',
      'historical-polity': 'Regime ou experiência histórica',
      place: 'Território',
      party: 'Partido',
      institution: 'Organização',
      government: 'Governo',
      policy: 'Política pública',
      article: 'Artigo',
    };
    return labels[entity.kind];
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
  relationSources(relation: KnowledgeRelationResult): RelationReference[] {
    const record = this.atlas().relations.find((item) => item.id === relation.relationId);
    if (!record) return [];

    const references = new Map<string, RelationReference>();
    const addReference = (reference: RelationReference) => {
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
  mediaFor(entity: Entity) {
    return this.media().find((item) => item.entity.id === entity.id);
  }
  nodePosition(entityId: string): GraphNode | undefined {
    return this.graphNodes().find((node) => node.entity.id === entityId);
  }
  toggleMedia(mediaId: string): void {
    this.expandedMediaId.update((current) => (current === mediaId ? null : mediaId));
  }
}
