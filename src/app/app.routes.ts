import { Routes } from '@angular/router';
import {
  contentTypeBreadcrumbResolver,
  contentTypeTitleResolver,
  editorialTypeResolver,
  editorialEntryTitleResolver,
  trailTitleResolver,
} from './content/route-resolvers';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home-page').then((module) => module.HomePage), title: 'ATLAS — compreender o mundo' },
  {
    path: 'laboratorio',
    data: { breadcrumb: 'Laboratório visual' },
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/visual-lab-page').then((module) => module.VisualLabPage),
        title: 'Laboratório visual — ATLAS',
      },
      {
        path: ':proposta/:pagina',
        loadComponent: () => import('./pages/visual-lab-page').then((module) => module.VisualLabPage),
        title: 'Laboratório de direção visual — ATLAS',
      },
    ],
  },
  {
    path: 'explorar',
    data: { breadcrumb: 'Explorar' },
    children: [
      { path: '', loadComponent: () => import('./pages/explore-page').then((module) => module.ExplorePage), title: 'Explorar conteúdos — ATLAS' },
      {
        path: ':tipo',
        resolve: {
          editorialType: editorialTypeResolver,
          breadcrumb: contentTypeBreadcrumbResolver,
        },
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/content-type-page').then((module) => module.ContentTypePage),
            title: contentTypeTitleResolver,
          },
          {
            path: ':slug',
            loadComponent: () => import('./pages/editorial-detail-page').then((module) => module.EditorialDetailPage),
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
      { path: '', loadComponent: () => import('./pages/study-page').then((module) => module.StudyPage), title: 'Estudar — ATLAS' },
      {
        path: ':slug',
        loadComponent: () => import('./pages/editorial-detail-page').then((module) => module.EditorialDetailPage),
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
    path: 'verbete/:slug',
    data: { breadcrumb: 'Verbete' },
    loadComponent: () => import('./features/entry/entry-page').then((module) => module.EntryPage),
    title: 'Verbete — ATLAS',
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found-page').then((module) => module.NotFoundPage),
    data: { breadcrumb: 'Página não encontrada' },
    title: 'Página não encontrada — ATLAS',
  },
];
