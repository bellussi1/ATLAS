import { type Routes } from '@angular/router';
import { explorerCatalogues } from '@core/content/queries/knowledge-explorer';
import { knowledgeContentResolver } from '@core/routing/knowledge-content.resolver';
import {
  editorialEntryTitleResolver,
  knowledgeEntryBreadcrumbResolver,
  knowledgeEntryCatalogueResolver,
  knowledgeEntryDescriptionResolver,
  knowledgeEntryTitleResolver,
} from '@core/routing/route-resolvers';

export const explorationRoutes: Routes = [
  // Retired tools: the archive search at /conhecimento replaces them.
  { path: 'rede', redirectTo: 'conhecimento', pathMatch: 'full' },
  { path: 'comparar', redirectTo: 'conhecimento', pathMatch: 'full' },
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
  {
    path: 'explorar/:tipo/:slug',
    title: editorialEntryTitleResolver,
    data: {
      breadcrumb: 'Metodologia',
      metaDescription: 'Exemplo de metodologia editorial do ATLAS.',
    },
    resolve: { knowledge: knowledgeContentResolver },
    loadComponent: () =>
      import('@exploration/pages/record/record.component').then((m) => m.RecordComponent),
  },
];
