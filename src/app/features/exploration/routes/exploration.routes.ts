import { type Routes } from '@angular/router';
import { explorerCatalogues } from '@core/content/queries/knowledge-explorer';
import { knowledgeContentResolver } from '@core/routing/knowledge-content.resolver';
import {
  editorialEntryTitleResolver,
  knowledgeEntryBreadcrumbResolver,
  knowledgeEntryDescriptionResolver,
  knowledgeEntryTitleResolver,
} from '@core/routing/route-resolvers';

export const explorationRoutes: Routes = [
  ...[
    { path: 'rede', title: 'Rede de conhecimento', analysis: 'network' },
    { path: 'comparar', title: 'Comparar registros', analysis: 'comparison' },
  ].map((page) => ({
    path: page.path,
    title: page.title + ' — ATLAS',
    data: {
      analysis: page.analysis,
      breadcrumb: page.title,
      metaDescription:
        'Investigue vínculos e compare registros com fontes, método e limites explícitos.',
    },
    resolve: { knowledge: knowledgeContentResolver },
    loadComponent: () =>
      import('@exploration/pages/analysis/analysis.component').then((m) => m.AnalysisComponent),
  })),
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
    title: knowledgeEntryTitleResolver,
    resolve: {
      knowledge: knowledgeContentResolver,
      breadcrumb: knowledgeEntryBreadcrumbResolver,
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
