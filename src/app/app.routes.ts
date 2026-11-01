import { type Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home-page').then((m) => m.HomePage),
    title: 'ATLAS — compreender o mundo',
  },
  {
    path: 'marxismo',
    loadComponent: () => import('./pages/ideology-page').then((m) => m.IdeologyPageComponent),
    title: 'Marxismo: ideias e divergências — ATLAS',
    data: {
      breadcrumb: 'Marxismo',
      metaDescription: 'Conceitos, pensadores, cronologia, divergências e fontes do marxismo.',
    },
  },
  {
    path: 'liberalismo',
    loadComponent: () => import('./pages/liberalism-atlas-page').then((m) => m.LiberalismAtlasPage),
    title: 'Atlas do Liberalismo — ATLAS',
    data: { breadcrumb: 'Liberalismo' },
  },
  { path: '**', redirectTo: '' },
];
