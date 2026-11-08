import { type Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home/home-page.component').then((m) => m.HomePage),
    title: 'ATLAS — compreender o mundo',
  },
  {
    path: '',
    loadChildren: () =>
      import('./features/ideologies/routes/ideologies.routes').then((m) => m.ideologyRoutes),
  },
  {
    path: '',
    loadChildren: () =>
      import('./features/exploration/routes/exploration.routes').then((m) => m.explorationRoutes),
  },
  {
    path: '**',
    loadComponent: () =>
      import('@shared/ui/not-found-message/not-found-message.component').then(
        (m) => m.NotFoundMessageComponent,
      ),
    title: 'Página não encontrada — ATLAS',
  },
];
