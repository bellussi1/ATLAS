import { type Routes } from '@angular/router';
import { explorerCatalogues } from '@core/content/queries/explorer-catalogues';
import {
  knowledgeContentResolver,
  networkContentResolver,
} from '@core/routing/knowledge-content.resolver';
import {
  knowledgeEntryBreadcrumbResolver,
  knowledgeEntryCatalogueResolver,
  knowledgeEntryDescriptionResolver,
  knowledgeEntryTitleResolver,
} from '@core/routing/route-resolvers';

export const explorationRoutes: Routes = [
  // /comparar is retired: the archive search at /acervo replaces it. /grafos is the full-screen graph.
  { path: 'grafo', redirectTo: 'grafos', pathMatch: 'full' },
  { path: 'rede', redirectTo: 'grafos', pathMatch: 'full' },
  { path: 'comparar', redirectTo: 'acervo', pathMatch: 'full' },
  { path: 'conhecimento', redirectTo: 'acervo', pathMatch: 'full' },
  {
    path: 'grafos',
    title: 'Grafo do acervo — ATLAS',
    data: {
      fullscreen: true,
      breadcrumb: 'Grafo',
      metaDescription:
        'Mapa interativo das ideologias, pessoas, obras e acontecimentos do acervo e das ligações entre eles, com legenda e filtros.',
    },
    resolve: { knowledge: networkContentResolver },
    loadComponent: () =>
      import('@shared/ui/knowledge-network/knowledge-network.component').then(
        (m) => m.KnowledgeNetworkComponent,
      ),
  },
  ...explorerCatalogues.map((catalogue) => ({
    path: catalogue.path === 'acervo' ? 'acervo' : `acervo/${catalogue.path}`,
    pathMatch: 'full' as const,
    title: catalogue.title + ' — ATLAS',
    data: {
      catalogue: catalogue.path,
      breadcrumb: catalogue.title,
      metaDescription: catalogue.description,
    },
    resolve: { knowledge: knowledgeContentResolver },
    loadComponent: () =>
      import('@exploration/pages/explorer/explorer.component').then((m) => m.ExplorerComponent),
  })),
  // The archive is the only catalogue entry point. Old top-level URLs keep working for links
  // already in the wild; Cloudflare also answers them with a 301 (public/_redirects).
  ...explorerCatalogues
    .filter((catalogue) => catalogue.path !== 'acervo')
    .map((catalogue) => ({
      path: catalogue.path,
      redirectTo: `acervo/${catalogue.path}`,
      pathMatch: 'full' as const,
    })),
  {
    path: 'verbete/:slug',
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
    title: knowledgeEntryTitleResolver,
    resolve: {
      knowledge: knowledgeContentResolver,
      breadcrumb: knowledgeEntryBreadcrumbResolver,
      breadcrumbParent: knowledgeEntryCatalogueResolver,
      metaDescription: knowledgeEntryDescriptionResolver,
    },
    loadComponent: () =>
      import('@exploration/pages/record/record.component').then((m) => m.RecordComponent),
  },
];
