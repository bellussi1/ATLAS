import { type Routes } from '@angular/router';
import { explorerCatalogues } from '@core/content/queries/knowledge-explorer';
import { knowledgeContentResolver } from '@core/routing/knowledge-content.resolver';
import {
  knowledgeEntryBreadcrumbResolver,
  knowledgeEntryCatalogueResolver,
  knowledgeEntryDescriptionResolver,
  knowledgeEntryTitleResolver,
} from '@core/routing/route-resolvers';

export const explorationRoutes: Routes = [
  // /comparar is retired: the archive search at /conhecimento replaces it. /rede is the full-screen graph.
  { path: 'grafo', redirectTo: 'rede', pathMatch: 'full' },
  { path: 'comparar', redirectTo: 'conhecimento', pathMatch: 'full' },
  {
    path: 'rede',
    title: 'Rede do acervo — ATLAS',
    data: {
      fullscreen: true,
      breadcrumb: 'Rede',
      metaDescription:
        'Mapa interativo das ideologias, pessoas, obras e acontecimentos do acervo e das ligações entre eles, com legenda e filtros.',
    },
    resolve: { knowledge: knowledgeContentResolver },
    loadComponent: () =>
      import('@exploration/pages/graph/graph.component').then((m) => m.GraphComponent),
  },
  ...explorerCatalogues.map((catalogue) => ({
    path: catalogue.path,
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
