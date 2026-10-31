import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentRepository } from '../core/content-repository';
import { queryKnowledgeRelations } from '../core/knowledge-graph';
import type { KnowledgeGraph } from '../core/content-schema';
import { AtlasEditorialLinkDirective } from './ui-primitives';
interface NodeRecord { id: string; title: string; kind: string; description: string; path: string; fragment?: string; }
interface GraphEdge { from: string; to: string; label: string; periodLabel: string; evidenceIds: string[]; }
@Component({
  selector: 'app-evidence-network',
  imports: [RouterLink, AtlasEditorialLinkDirective],
  templateUrl: './evidence-network.html',
  styleUrl: './evidence-network.scss',
})
export class AtlasEvidenceNetworkComponent {
  readonly compact = input(false);
  readonly repository = inject(ContentRepository);
  readonly graph: KnowledgeGraph = this.repository.knowledgeGraph;
  readonly kind = signal('Todos');
  readonly listView = signal(false);
  readonly nodes: NodeRecord[] = this.graph.atlases.flatMap(atlas => [
    ...atlas.entities.map(entity => ({ id: entity.id, title: entity.title, kind: this.kindLabel(entity.kind), description: entity.summary, path: '/verbete/' + entity.slug })),
    ...atlas.claims.map(claim => ({ id: claim.id, title: 'Afirmação', kind: 'Afirmação', description: claim.text, path: '/verbete/' + atlas.entities.find(entity => entity.id === claim.entityId)!.slug })),
    ...atlas.sources.map(source => ({ id: source.id, title: source.title, kind: 'Fonte', description: source.edition, path: '/fontes', fragment: 'source-' + source.id })),
  ]);
  readonly selectedId = signal(this.nodes[0]?.id ?? '');
  readonly edges: GraphEdge[] = [
    ...this.graph.atlases.flatMap(atlas => [
      ...atlas.claims.flatMap(claim => [
        { from: claim.entityId, to: claim.id, label: 'é descrito pela afirmação', periodLabel: atlas.entities.find(entity => entity.id === claim.entityId)?.temporalExtent?.label ?? 'Período não informado', evidenceIds: claim.citationIds.flatMap(citationId => {
          const evidenceId = atlas.citations.find(citation => citation.id === citationId)?.evidenceId;
          return evidenceId ? [evidenceId] : [];
        }) },
        ...claim.citationIds.flatMap(citationId => {
          const evidenceId = atlas.citations.find(citation => citation.id === citationId)?.evidenceId;
          const sourceId = atlas.evidences.find(evidence => evidence.id === evidenceId)?.sourceId;
          return sourceId ? [{ from: claim.id, to: sourceId, label: 'tem como referência', periodLabel: 'Período não informado', evidenceIds: evidenceId ? [evidenceId] : [] }] : [];
        }),
      ]),
      ...atlas.relations.map(relation => ({ from: relation.fromEntityId, to: relation.toEntityId, label: relation.label, periodLabel: relation.temporalExtent?.label ?? 'Período não informado', evidenceIds: relation.evidenceIds })),
    ]),
  ];
  readonly visibleNodes = computed(() => this.nodes.filter(node => this.kind() === 'Todos' || node.kind === this.kind()));
  readonly visibleEdges = computed(() => this.edges.filter(edge => this.visibleNodes().some(node => node.id === edge.from) && this.visibleNodes().some(node => node.id === edge.to)));
  readonly selected = computed(() => this.visibleNodes().find(node => node.id === this.selectedId()));
  readonly connections = computed(() => {
    const selectedId = this.selectedId();
    const relations = queryKnowledgeRelations(this.graph, selectedId).map(relation => ({
      from: selectedId,
      label: relation.label,
      to: relation.relatedEntityId,
      typeLabel: this.relationTypeLabel(relation.relationType),
      followId: relation.relatedEntityId,
      periodLabel: relation.temporalExtent?.label ?? 'Período não informado',
      evidenceIds: relation.evidenceIds,
    }));
    const otherEdges = this.edges.filter(edge => (edge.from === selectedId || edge.to === selectedId)
      && !this.graph.atlases.some(atlas => atlas.relations.some(relation => relation.fromEntityId === edge.from && relation.toEntityId === edge.to)))
      .map(edge => ({ ...edge, typeLabel: edge.from.includes('claim-') ? 'Evidência editorial' : 'Relação', followId: edge.from === selectedId ? edge.to : edge.from }));
    return [...relations, ...otherEdges];
  });
  title(id: string): string { return this.nodes.find(node => node.id === id)?.title ?? id; }
  readonly rowCount = computed(() => Math.max(1, Math.ceil(this.visibleNodes().length / 3)));
  position(id: string): number { return this.visibleNodes().length === 1 ? 50 : [17, 50, 83][this.visibleNodes().findIndex(node => node.id === id) % 3]; }
  follow(id: string): void { this.kind.set('Todos'); this.selectedId.set(id); }
  filter(value: string): void { this.kind.set(value); this.selectedId.set(this.visibleNodes()[0]?.id ?? ''); }

  vertical(id: string): number {
    return (Math.floor(this.visibleNodes().findIndex(node => node.id === id) / 3) + .5) / this.rowCount() * 100;
  }


  readonly kinds = computed(() => ['Todos', ...new Set(this.nodes.map(node => node.kind))]);
  readonly selectedAction = computed(() => this.selected()?.kind === 'Fonte' ? 'Consultar fonte e localizadores' : 'Ler o verbete e suas evidências');
  sourcesForEvidence(evidenceIds: string[]): { id: string; title: string }[] {
    const ids = new Set(evidenceIds.flatMap(id => this.graph.atlases.flatMap(atlas => atlas.evidences
      .filter(evidence => evidence.id === id).map(evidence => evidence.sourceId))));
    return [...ids].flatMap(id => this.graph.atlases.flatMap(atlas => atlas.sources
      .filter(source => source.id === id).map(source => ({ id: source.id, title: source.title }))));
  }
  kindLabel(kind: string): string {
    return ({ person: 'Pessoa', ideology: 'Ideologia', concept: 'Conceito', work: 'Obra', event: 'Evento', 'historical-polity': 'Formação política histórica', place: 'Lugar', party: 'Partido', institution: 'Instituição', government: 'Governo', policy: 'Política', article: 'Artigo' } as Record<string, string>)[kind] ?? kind;
  }
  relationTypeLabel(type: string): string {
    return ({ 'editorial-link': 'Ligação editorial', 'documented-association': 'Associação documentada', influence: 'Influência documentada', 'causal-claim': 'Alegação causal documentada' } as Record<string, string>)[type] ?? type;
  }
}
