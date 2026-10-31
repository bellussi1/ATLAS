import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AtlasEvidenceNetworkComponent } from '../shared/evidence-network';
import { ContentRepository } from '../core/content-repository';
import { editorialEntries, getEntryPath } from '../content/editorial-entries';
import { AtlasEditorialLinkDirective, AtlasNoticeComponent, AtlasTextFieldComponent } from '../shared/ui-primitives';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');


@Component({
  selector: 'app-exploration-page',
  imports: [RouterLink, AtlasEditorialLinkDirective, AtlasNoticeComponent, AtlasTextFieldComponent, AtlasEvidenceNetworkComponent],
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
  readonly graph = inject(ContentRepository).knowledgeGraph;
  readonly results = computed(() => {
    const query = normalize(this.query().trim());
    return [
      ...this.graph.atlases.flatMap(atlas => atlas.entities.map(entity => ({ title: entity.title, summary: entity.summary, label: 'Verbete com evidências', path: '/verbete/' + entity.slug, text: JSON.stringify(entity) }))),
      ...editorialEntries.map(entry => ({ title: entry.title, summary: entry.summary, label: entry.statusLabel, path: getEntryPath(entry.type, entry.slug), text: JSON.stringify(entry) })),
    ].filter(entry => normalize(entry.text).includes(query));
  });
  search(value: string): void { void this.router.navigate([], { relativeTo: this.route, queryParams: { q: value || null }, replaceUrl: true }); }
}
