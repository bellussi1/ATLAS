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
    path: '',
    loadChildren: () =>
      import('./features/itineraries/routes/itineraries.routes').then((m) => m.itineraryRoutes),
  },
  {
    path: '',
    loadChildren: () =>
      import('./features/world-map/routes/world-map.routes').then((m) => m.worldMapRoutes),
  },
  {
    path: 'privacidade',
    loadComponent: () =>
      import('./pages/privacy/privacy-page.component').then((m) => m.PrivacyPageComponent),
    title: 'Privacidade — ATLAS',
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
