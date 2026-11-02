import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { explorerCatalogues } from '@core/content/queries/knowledge-explorer';
import { AtlasEditorialMarkComponent } from '@shared/ui/editorial-mark/editorial-mark.component';

@Component({
  selector: 'app-site-footer',
  imports: [AtlasEditorialMarkComponent, RouterLink],
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.scss',
})
export class SiteFooterComponent {
  // The search entry is listed on its own; the rest are the catalogues behind it.
  readonly catalogues = explorerCatalogues.filter((catalogue) => catalogue.path !== 'conhecimento');
  readonly composition = signal(0);
  readonly instantComposition = signal(false);

  changeComposition(event: MouseEvent): void {
    this.instantComposition.set(!event.detail);
    this.composition.update((value) => (value + 1) % 3);
  }
}
