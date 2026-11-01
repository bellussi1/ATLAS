import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { IdeologyAtlasComponent } from '@ideologies/components/ideology-atlas/ideology-atlas.component';
import { IdeologyReadingComponent } from '@ideologies/components/ideology-reading/ideology-reading.component';
import { KnowledgeTextComponent } from '@ideologies/components/knowledge-text/knowledge-text.component';
import { liberalismAtlas } from '@ideologies/data/liberalism-atlas';
import { AtlasGeometricMosaicComponent } from '@shared/ui/geometric-mosaic/geometric-mosaic.component';

@Component({
  selector: 'app-liberalism-atlas-page',
  imports: [
    IdeologyAtlasComponent,
    KnowledgeTextComponent,
    IdeologyReadingComponent,
    RouterLink,
    AtlasGeometricMosaicComponent,
  ],
  templateUrl: './liberalism-atlas-page.component.html',
  styleUrl: './liberalism-atlas-page.component.scss',
})
export class LiberalismAtlasPage {
  private readonly repository = inject(ContentRepository);
  readonly config = liberalismAtlas;
  readonly chapters = [
    { anchor: 'atlas-section-rede', title: 'Rede' },
    { anchor: 'atlas-section-tempo', title: 'Tempo' },
    { anchor: 'atlas-section-imagens', title: 'Imagens e documentos' },
  ] as const;
  readonly atlas = this.repository.knowledgeGraph.atlases.find(
    (item) => item.id === this.config.atlasId,
  )!;
}
