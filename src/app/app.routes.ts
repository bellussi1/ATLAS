import { type Routes } from '@angular/router';

import {
  contentTypeBreadcrumbResolver,
  contentTypeTitleResolver,
  editorialEntryTitleResolver,
  editorialTypeResolver,
  knowledgeEntryBreadcrumbResolver,
  knowledgeEntryDescriptionResolver,
  knowledgeEntryTitleResolver,
  trailTitleResolver,
} from './content/route-resolvers';

export const routes: Routes = [
  {
    path: 'atlas/marxismo/valor-e-trabalho',
    loadComponent: () => import('./pages/marx-atlas-page').then((module) => module.MarxAtlasPage),
    data: { breadcrumb: 'Valor e trabalho' },
    title: 'Valor e trabalho: Smith e Marx — ATLAS',
  },
  {
    path: 'atlas/marxismo',
    loadComponent: () => import('./pages/marx-atlas-index').then((module) => module.MarxAtlasIndex),
    data: { breadcrumb: 'Marxismo e economia política' },
    title: 'Marxismo e economia política — ATLAS',
  },
  {
    path: 'atlas/liberalismos',
    loadComponent: () =>
      import('./pages/liberalism-atlas-page').then((module) => module.LiberalismAtlasPage),
    data: { breadcrumb: 'Atlas do liberalismo' },
    title: 'Atlas do liberalismo — ATLAS',
  },
  ...[
    { path: 'relacoes', mode: 'relations', label: 'Relações' },
    { path: 'tempo-e-espaco', mode: 'time', label: 'Tempo e espaço' },
    { path: 'conhecimento', mode: 'knowledge', label: 'Conhecimento' },
  ].map(({ path, mode, label }) => ({
    path,
    loadComponent: () =>
      import('./pages/exploration-page').then((module) => module.ExplorationPage),
    data: { mode, breadcrumb: label },
    title: `${label} — ATLAS`,
  })),
  {
    path: '',
    loadComponent: () => import('./pages/home-page').then((module) => module.HomePage),
    title: 'ATLAS — compreender o mundo',
  },
  {
    path: 'sistema',
    loadComponent: () =>
      import('./pages/design-system-page').then((module) => module.DesignSystemPage),
    data: { breadcrumb: 'Sistema visual' },
    title: 'Sistema visual acessível — ATLAS',
  },
  {
    path: 'explorar',
    data: { breadcrumb: 'Explorar' },
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/explore-page').then((module) => module.ExplorePage),
        title: 'Explorar conteúdos — ATLAS',
      },
      {
        path: ':tipo',
        resolve: {
          editorialType: editorialTypeResolver,
          breadcrumb: contentTypeBreadcrumbResolver,
        },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/content-type-page').then((module) => module.ContentTypePage),
            title: contentTypeTitleResolver,
          },
          {
            path: ':slug',
            loadComponent: () =>
              import('./pages/editorial-detail-page').then((module) => module.EditorialDetailPage),
            resolve: { breadcrumb: editorialEntryTitleResolver },
            title: editorialEntryTitleResolver,
          },
        ],
      },
    ],
  },
  {
    path: 'estudar',
    data: { breadcrumb: 'Estudar' },
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/study-page').then((module) => module.StudyPage),
        title: 'Estudar — ATLAS',
      },
      {
        path: ':slug',
        loadComponent: () =>
          import('./pages/editorial-detail-page').then((module) => module.EditorialDetailPage),
        data: { editorialType: 'trilha' },
        resolve: { breadcrumb: trailTitleResolver },
        title: trailTitleResolver,
      },
    ],
  },
  {
    path: 'sobre',
    loadComponent: () => import('./pages/about-page').then((module) => module.AboutPage),
    data: { breadcrumb: 'Sobre o ATLAS' },
    title: 'Sobre o ATLAS',
  },
  {
    path: 'fontes',
    loadComponent: () =>
      import('./pages/source-library-page').then((module) => module.SourceLibraryPage),
    data: { breadcrumb: 'Fontes' },
    title: 'Biblioteca de fontes — ATLAS',
  },
  {
    path: 'verbete/:slug',
    resolve: {
      breadcrumb: knowledgeEntryBreadcrumbResolver,
      metaDescription: knowledgeEntryDescriptionResolver,
    },
    loadComponent: () => import('./features/entry/entry-page').then((module) => module.EntryPage),
    title: knowledgeEntryTitleResolver,
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found-page').then((module) => module.NotFoundPage),
    data: { breadcrumb: 'Página não encontrada' },
    title: 'Página não encontrada — ATLAS',
  },
];
