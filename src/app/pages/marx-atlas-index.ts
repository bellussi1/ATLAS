import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ContentRepository } from '../core/content-repository';
import { AtlasEditorialMarkComponent } from '../shared/editorial-mark';
import { LiberalismAtlasPage } from './liberalism-atlas-page';
import { MarxAtlasPage } from './marx-atlas-page';

@Component({
  selector: 'app-marx-atlas-index',
  imports: [RouterLink, AtlasEditorialMarkComponent, MarxAtlasPage, LiberalismAtlasPage],
  templateUrl: './marx-atlas-index.html',
  styleUrl: './marx-atlas-index.scss',
})
export class MarxAtlasIndex {
  private readonly repository = inject(ContentRepository);
  readonly atlas = this.repository.knowledgeGraph.atlases.find(
    (item) => item.id === 'atlas-marx-valor',
  );
}
