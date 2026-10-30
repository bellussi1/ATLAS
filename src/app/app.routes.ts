import { Routes } from '@angular/router';
import { AboutPage } from './pages/about-page';
import { ContentTypePage } from './pages/content-type-page';
import { EditorialDetailPage } from './pages/editorial-detail-page';
import { ExplorePage } from './pages/explore-page';
import { HomePage } from './pages/home-page';
import { NotFoundPage } from './pages/not-found-page';
import { StudyPage } from './pages/study-page';
import {
  contentTypeBreadcrumbResolver,
  contentTypeTitleResolver,
  editorialTypeResolver,
  editorialEntryTitleResolver,
  trailTitleResolver,
} from './content/route-resolvers';

export const routes: Routes = [
  { path: '', component: HomePage, title: 'ATLAS — compreender o mundo' },
  {
    path: 'explorar',
    data: { breadcrumb: 'Explorar' },
    children: [
      { path: '', component: ExplorePage, title: 'Explorar conteúdos — ATLAS' },
      {
        path: ':tipo',
        resolve: {
          editorialType: editorialTypeResolver,
          breadcrumb: contentTypeBreadcrumbResolver,
        },
        children: [
          {
            path: '',
            component: ContentTypePage,
            title: contentTypeTitleResolver,
          },
          {
            path: ':slug',
            component: EditorialDetailPage,
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
      { path: '', component: StudyPage, title: 'Estudar — ATLAS' },
      {
        path: ':slug',
        component: EditorialDetailPage,
        data: { editorialType: 'trilha' },
        resolve: { breadcrumb: trailTitleResolver },
        title: trailTitleResolver,
      },
    ],
  },
  {
    path: 'sobre',
    component: AboutPage,
    data: { breadcrumb: 'Sobre o ATLAS' },
    title: 'Sobre o ATLAS',
  },
  {
    path: '**',
    component: NotFoundPage,
    data: { breadcrumb: 'Página não encontrada' },
    title: 'Página não encontrada — ATLAS',
  },
];
