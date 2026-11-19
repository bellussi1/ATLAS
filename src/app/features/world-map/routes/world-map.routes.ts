import { type Routes } from '@angular/router';
import { networkContentResolver } from '@core/routing/knowledge-content.resolver';

export const worldMapRoutes: Routes = [
  { path: 'mapa-mundi', redirectTo: 'mapa', pathMatch: 'full' },
  {
    path: 'mapa',
    title: 'Mapa-múndi histórico — ATLAS',
    data: {
      fullscreen: true,
      breadcrumb: 'Mapa-múndi',
      metaDescription:
        'Mapa-múndi histórico e geopolítico interativo do ATLAS: países, entidades históricas, regimes políticos e conexões documentadas por período.',
    },
    resolve: { knowledge: networkContentResolver },
    loadComponent: () =>
      import('@world-map/pages/world-map-page/world-map-page.component').then(
        (m) => m.WorldMapPageComponent,
      ),
  },
];
