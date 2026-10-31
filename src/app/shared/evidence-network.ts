import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentRepository } from '../core/content-repository';
import { AtlasEditorialLinkDirective } from './ui-primitives';
interface NodeRecord { id: string; title: string; kind: string; description: string; path: string; }
@Component({
  selector: 'app-evidence-network',
  imports: [RouterLink, AtlasEditorialLinkDirective],
  templateUrl: './evidence-network.html',
  styleUrl: './evidence-network.scss',
})
export class AtlasEvidenceNetworkComponent {
  readonly atlas = inject(ContentRepository).atlas;
  readonly kind = signal('Todos');
  readonly listView = signal(false);
  readonly selectedId = signal(this.atlas.entities[0].id);
  readonly nodes: NodeRecord[] = [
    ...this.atlas.entities.map(entity => ({ id: entity.id, title: entity.title, kind: 'Conceito', description: entity.summary, path: '/verbete/' + entity.slug })),
    ...this.atlas.claims.map(claim => ({ id: claim.id, title: claim.id === 'claim-contextual-evidence' ? 'Evidência contextual' : 'Afirmação', kind: 'Afirmação', description: claim.text, path: '/verbete/' + this.atlas.entities.find(entity => entity.id === claim.entityId)!.slug })),
    ...this.atlas.sources.map(source => ({ id: source.id, title: source.title, kind: 'Fonte', description: source.edition, path: '/verbete/' + this.atlas.entities[0].slug })),
  ];
  readonly edges = this.atlas.claims.flatMap(claim => [
    { from: claim.entityId, to: claim.id, label: 'é descrito pela afirmação' },
    ...claim.citationIds.flatMap(citationId => {
      const evidenceId = this.atlas.citations.find(citation => citation.id === citationId)?.evidenceId;
      const sourceId = this.atlas.evidences.find(evidence => evidence.id === evidenceId)?.sourceId;
      return sourceId ? [{ from: claim.id, to: sourceId, label: 'tem como referência' }] : [];
    }),
  ]);
  readonly visibleNodes = computed(() => this.nodes.filter(node => this.kind() === 'Todos' || node.kind === this.kind()));
  readonly visibleEdges = computed(() => this.edges.filter(edge => this.visibleNodes().some(node => node.id === edge.from) && this.visibleNodes().some(node => node.id === edge.to)));
  readonly selected = computed(() => this.visibleNodes().find(node => node.id === this.selectedId()));
  readonly connections = computed(() => this.edges.filter(edge => edge.from === this.selectedId() || edge.to === this.selectedId()));
  title(id: string): string { return this.nodes.find(node => node.id === id)?.title ?? id; }
  position(id: string): number { return this.visibleNodes().length === 1 ? 50 : [50, 24, 76][this.visibleNodes().findIndex(node => node.id === id) % 3]; }
  follow(id: string): void { this.kind.set('Todos'); this.selectedId.set(id); }
  filter(value: string): void { this.kind.set(value); this.selectedId.set(this.visibleNodes()[0]?.id ?? ''); }

  vertical(id: string): number { return this.visibleNodes().length === 1 ? 50 : [68, 22, 22][this.visibleNodes().findIndex(node => node.id === id) % 3]; }
}
