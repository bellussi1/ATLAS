import { Component, computed, signal } from '@angular/core';
import { methodologyKnowledgeGraph } from '../core/content-repository';
import { queryKnowledgeRelations } from '../core/knowledge-graph';
import type { KnowledgeRelationResult } from '../core/knowledge-graph';
import type { Entity, Relation } from '../core/content-schema';

const atlasId = 'atlas-liberalism';
const rootEntityId = 'ideology-liberalism';
const graph = methodologyKnowledgeGraph;
const atlas = graph.atlases.find(item => item.id === atlasId)!;

type ViewMode = 'rede' | 'tempo' | 'imagens';
interface GraphNode { entity: Entity; x: number; y: number; }
interface GraphEdge { relation: Relation; x1: number; y1: number; x2: number; y2: number; }

@Component({
  selector: 'app-liberalism-atlas-page',
  templateUrl: './liberalism-atlas-page.html',
  styleUrls: ['./liberalism-atlas-page.scss', './liberalism-atlas-page-visual.scss'],
})
export class LiberalismAtlasPage {
  readonly atlas = atlas;
  readonly discoveryLinkCount = atlas.relations.filter(relation => relation.type === 'encyclopedic-link').length;
  readonly structuredRelationCount = atlas.relations.length - this.discoveryLinkCount;
  readonly unconnectedEntityCount = computed(() => this.entities().filter(entity => !atlas.relations.some(relation => relation.fromEntityId === entity.id || relation.toEntityId === entity.id)).length);
  readonly mode = signal<ViewMode>('rede');
  readonly selectedId = signal(rootEntityId);
  readonly search = signal('');
  readonly history = signal<string[]>([]);
  readonly expandedMediaId = signal<string | null>(null);
  readonly entities = computed(() => {
    const referencedIds = new Set([...atlas.entityIds, ...atlas.relations.flatMap(relation => [relation.fromEntityId, relation.toEntityId])]);
    return graph.atlases.flatMap(item => item.entities).filter(entity => referencedIds.has(entity.id));
  });
  readonly selected = computed(() => this.entities().find(entity => entity.id === this.selectedId()) ?? this.entities()[0]);
  readonly filteredEntities = computed(() => {
    const query = this.search().trim().toLocaleLowerCase('pt-BR');
    return this.entities().filter(entity => !query || [entity.title, entity.summary, ...entity.aliases].some(value => value.toLocaleLowerCase('pt-BR').includes(query)));
  });
  readonly relations = computed(() => queryKnowledgeRelations(graph, this.selectedId(), { atlasId }));
  readonly graphNodes = computed<GraphNode[]>(() => {
    const items = this.entities();
    return items.map(entity => {
      if (entity.id === rootEntityId) return { entity, x: 460, y: 286 };
      const others = items.filter(item => item.id !== rootEntityId);
      const position = others.findIndex(item => item.id === entity.id);
      const angle = (-Math.PI / 2) + ((Math.PI * 2 * position) / Math.max(others.length, 1));
      return { entity, x: 460 + Math.cos(angle) * 350, y: 286 + Math.sin(angle) * 205 };
    });
  });
  readonly graphEdges = computed<GraphEdge[]>(() => {
    const positions = new Map(this.graphNodes().map(node => [node.entity.id, node]));
    return atlas.relations.flatMap(relation => {
      if (relation.fromEntityId !== this.selectedId() && relation.toEntityId !== this.selectedId()) return [];
      const from = positions.get(relation.fromEntityId);
      const to = positions.get(relation.toEntityId);
      return from && to ? [{ relation, x1: from.x, y1: from.y, x2: to.x, y2: to.y }] : [];
    });
  });
  readonly timelineEntities = computed(() => this.entities()
    .filter(entity => (entity.kind === 'person' || entity.kind === 'event') && entity.temporalExtent && (entity.temporalExtent.startYear !== null || entity.temporalExtent.endYear !== null))
    .sort((a, b) => (a.temporalExtent?.startYear ?? a.temporalExtent?.endYear ?? 0) - (b.temporalExtent?.startYear ?? b.temporalExtent?.endYear ?? 0)));
  readonly media = computed(() => atlas.assetLicenses.flatMap(asset => {
    const entity = this.entities().find(item => item.id === asset.entityId);
    return entity && asset.status === 'known' && asset.reproduction === 'allowed' && asset.license && asset.licenseUrl && asset.attribution && asset.filePageUrl
      ? [{ asset, entity }]
      : [];
  }));

  setMode(mode: ViewMode): void { this.mode.set(mode); }
  setSearch(value: string): void { this.search.set(value); }
  openEntity(entityId: string): void {
    if (entityId === this.selectedId()) return;
    this.history.update(items => [...items, this.selectedId()]);
    this.selectedId.set(entityId);
  }
  returnContext(): void {
    const previous = this.history().at(-1);
    if (!previous) { this.selectedId.set(rootEntityId); return; }
    this.history.update(items => items.slice(0, -1));
    this.selectedId.set(previous);
  }
  yearLabel(entity: Entity): string {
    const extent = entity.temporalExtent;
    if (!extent) return 'Data não informada';
    if (extent.startYear !== null && extent.endYear !== null) return `${extent.startYear}–${extent.endYear}`;
    if (extent.startYear !== null) return `a partir de ${extent.startYear}`;
    if (extent.endYear !== null) return `até ${extent.endYear}`;
    return extent.label ?? 'Data não informada';
  }
  relationName(relation: KnowledgeRelationResult): string {
    const labels: Record<string, string> = {
      'encyclopedic-link': 'link enciclopédico', related_to: 'classificação relacionada',
      influenced: 'influenciou', influenced_by: 'influenciado por', associated_with: 'associado a',
      reacted_against: 'reagiu contra', developed_into: 'desenvolveu-se em', participated_in: 'participou de',
      wrote: 'escreveu', authored: 'autoria', event_influenced_ideology: 'evento ligado a uma ideologia',
    };
    return labels[relation.relationType] ?? relation.relationType;
  }
  relationSourceLabel(relation: KnowledgeRelationResult): string {
    const provenance = atlas.relations.find(item => item.id === relation.relationId)?.provenance?.source;
    return provenance === 'wikipedia' ? 'Descoberta na Wikipedia'
      : provenance === 'wikidata' ? 'Afirmação estruturada no Wikidata'
        : 'Relação editorial';
  }
  relationStatusLabel(relation: KnowledgeRelationResult): string {
    const status = atlas.relations.find(item => item.id === relation.relationId)?.editorialStatus;
    return status === 'pending' ? 'revisão pendente'
      : status === 'verified' ? 'verificada editorialmente'
        : status === 'contested' ? 'controversa'
          : status === 'needs-update' ? 'precisa de atualização'
            : status === 'draft' ? 'rascunho'
              : 'estado editorial não informado';
  }
  relationTarget(relation: KnowledgeRelationResult): Entity | undefined { return this.entities().find(entity => entity.id === relation.relatedEntityId); }
  mediaFor(entity: Entity) { return this.media().find(item => item.entity.id === entity.id); }
  nodePosition(entityId: string): GraphNode | undefined { return this.graphNodes().find(node => node.entity.id === entityId); }
  toggleMedia(mediaId: string): void { this.expandedMediaId.update(current => current === mediaId ? null : mediaId); }
}
