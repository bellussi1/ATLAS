import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catalogueUrl, explorerCatalogues } from '@core/content/queries/explorer-catalogues';
import { HomeLinkDirective } from '@layouts/home-link.directive';
import { AtlasRevealDirective } from '@shared/directives/reveal/reveal.directive';
import { AtlasIconComponent } from '@shared/ui/icon/icon.component';

import { version as appVersion } from '../../../../package.json';
import { headerReadings } from '../site-header/site-header.component';

@Component({
  selector: 'app-site-footer',
  imports: [AtlasIconComponent, AtlasRevealDirective, HomeLinkDirective, RouterLink],
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.scss',
})
export class SiteFooterComponent {
  readonly version = appVersion;
  readonly readings = headerReadings;
  // The search entry is listed on its own; the rest are the catalogues behind it.
  readonly catalogues = explorerCatalogues.filter((catalogue) => catalogue.path !== 'acervo');
  readonly catalogueUrl = catalogueUrl;
}
