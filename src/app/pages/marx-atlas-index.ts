import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ContentRepository } from '../core/content-repository';
import { AtlasDiscoveryPreviewDirective } from '../shared/discovery-preview';
import { AtlasEditorialMarkComponent } from '../shared/editorial-mark';
import { reproducibleAsset } from '../shared/licensed-asset';
import { MarxAtlasPage } from './marx-atlas-page';

@Component({
  selector: 'app-marx-atlas-index',
  imports: [RouterLink, AtlasDiscoveryPreviewDirective, AtlasEditorialMarkComponent, MarxAtlasPage],
  templateUrl: './marx-atlas-index.html',
  styleUrl: './marx-atlas-index.scss',
})
export class MarxAtlasIndex {
  private readonly repository = inject(ContentRepository);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  // Keep previously shared argument URLs functional; new links use the dedicated debate route.
  readonly legacyDebate = computed(() =>
    ['marx', 'smith'].includes(this.params().get('argumento') ?? ''),
  );
  readonly atlas = this.repository.knowledgeGraph.atlases.find(
    (item) => item.id === 'atlas-marx-valor',
  );
  readonly people = [
    {
      id: 'person-karl-marx',
      name: 'Karl Marx',
      slug: 'karl-marx',
      image: 'karl-marx',
      argument: 'marx',
      role: 'Crítica da economia política',
      work: 'O capital: volume I',
      workSlug: 'o-capital-volume-i',
      year: '1867',
    },
    {
      id: 'person-adam-smith',
      name: 'Adam Smith',
      slug: 'adam-smith',
      image: 'adam-smith',
      argument: 'smith',
      role: 'Economia política clássica',
      work: 'A riqueza das nações',
      workSlug: 'a-riqueza-das-nacoes',
      year: '1776',
    },
  ].map((person) => ({
    ...person,
    asset: reproducibleAsset(this.atlas, '/images/atlas/' + person.image + '.jpg'),
    entry: this.repository.discoveryIndex.find((item) => item.id === person.id),
  }));
}
