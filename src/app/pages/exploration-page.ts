import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ContentRepository } from '../core/content-repository';
import { editorialEntries, getEntryPath } from '../content/editorial-entries';
import { AtlasEditorialLinkDirective, AtlasNoticeComponent, AtlasTextFieldComponent } from '../shared/ui-primitives';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
interface NodeRecord { id: string; title: string; kind: string; description: string; path: string; }

@Component({
  selector: 'app-exploration-page',
  imports: [RouterLink, AtlasEditorialLinkDirective, AtlasNoticeComponent, AtlasTextFieldComponent],
  templateUrl: './exploration-page.html',
  styleUrl: './exploration-page.scss',
})
export class ExplorationPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly data = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly mode = computed(() => this.data()['mode'] as string);
  readonly query = computed(() => this.params().get('q') ?? '');
  readonly atlas = inject(ContentRepository).atlas;
  readonly kind = signal('Todos');
  readonly selectedId = signal(this.atlas.entities[0].id);
  readonly results = computed(() => {
    const query = normalize(this.query().trim());
    return [
      ...this.atlas.entities.map(entity => ({ title: entity.title, summary: entity.summary, label: 'Verbete com evidências', path: '/verbete/' + entity.slug, text: JSON.stringify(entity) })),
      ...editorialEntries.map(entry => ({ title: entry.title, summary: entry.summary, label: entry.statusLabel, path: getEntryPath(entry.type, entry.slug), text: JSON.stringify(entry) })),
    ].filter(entry => normalize(entry.text).includes(query));
  });
  readonly nodes: NodeRecord[] = [
    ...this.atlas.entities.map(entity => ({ id: entity.id, title: entity.title, kind: 'Conceito', description: entity.summary, path: '/verbete/' + entity.slug })),
    ...this.atlas.claims.map(claim => ({ id: claim.id, title: 'Evidência contextual', kind: 'Afirmação', description: claim.text, path: '/verbete/' + this.atlas.entities.find(entity => entity.id === claim.entityId)!.slug })),
    ...this.atlas.sources.map(source => ({ id: source.id, title: source.title, kind: 'Fonte', description: source.reference, path: '/verbete/' + this.atlas.entities[0].slug })),
  ];
  readonly edges = this.atlas.claims.flatMap(claim => [
    { from: claim.entityId, to: claim.id, label: 'é descrito pela afirmação' },
    ...claim.sourceIds.map(id => ({ from: claim.id, to: id, label: 'tem como referência' })),
  ]);
  readonly visibleNodes = computed(() => this.nodes.filter(node => this.kind() === 'Todos' || node.kind === this.kind()));
  readonly visibleEdges = computed(() => this.edges.filter(edge => this.visibleNodes().some(node => node.id === edge.from) && this.visibleNodes().some(node => node.id === edge.to)));
  readonly selected = computed(() => this.visibleNodes().find(node => node.id === this.selectedId()));
  readonly connections = computed(() => this.edges.filter(edge => edge.from === this.selectedId() || edge.to === this.selectedId()));
  title(id: string): string { return this.nodes.find(node => node.id === id)?.title ?? id; }
  position(id: string): number { return 18 + this.visibleNodes().findIndex(node => node.id === id) * 64 / Math.max(1, this.visibleNodes().length - 1); }
  filter(value: string): void { this.kind.set(value); this.selectedId.set(this.visibleNodes()[0]?.id ?? ''); }
  search(value: string): void { void this.router.navigate([], { relativeTo: this.route, queryParams: { q: value || null }, replaceUrl: true }); }
}
