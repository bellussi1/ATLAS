import { type Routes } from '@angular/router';

import { ideologyRoutes } from './features/ideologies/routes/ideologies.routes';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home/home-page.component').then((m) => m.HomePage),
    title: 'ATLAS — compreender o mundo',
  },
  ...ideologyRoutes,
  { path: '**', redirectTo: '' },
];
