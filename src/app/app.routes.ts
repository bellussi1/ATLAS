import { type Routes } from '@angular/router';
import { explorationRoutes } from '@exploration/routes/exploration.routes';

import { ideologyRoutes } from './features/ideologies/routes/ideologies.routes';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home/home-page.component').then((m) => m.HomePage),
    title: 'ATLAS — compreender o mundo',
  },
  ...ideologyRoutes,
  ...explorationRoutes,
  { path: '**', redirectTo: '' },
];
