import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { explorerCatalogues } from '@core/content/queries/knowledge-explorer';
import { AtlasRevealDirective } from '@shared/directives/reveal/reveal.directive';

import { headerReadings } from '../site-header/site-header.component';

@Component({
  selector: 'app-site-footer',
  imports: [AtlasRevealDirective, RouterLink],
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.scss',
})
export class SiteFooterComponent {
  readonly readings = headerReadings;
  // The search entry is listed on its own; the rest are the catalogues behind it.
  readonly catalogues = explorerCatalogues.filter((catalogue) => catalogue.path !== 'conhecimento');
}
