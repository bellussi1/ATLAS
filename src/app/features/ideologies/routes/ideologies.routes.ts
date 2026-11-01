import { type Routes } from '@angular/router';

export const ideologyRoutes: Routes = [
  {
    path: 'marxismo',
    loadComponent: () =>
      import('@ideologies/pages/ideology/ideology-page.component').then(
        (m) => m.IdeologyPageComponent,
      ),
    title: 'Marxismo: ideias e divergências — ATLAS',
    data: {
      breadcrumb: 'Marxismo',
      metaDescription: 'Conceitos, pensadores, cronologia, divergências e fontes do marxismo.',
    },
  },
  {
    path: 'liberalismo',
    loadComponent: () =>
      import('@ideologies/pages/liberalism/liberalism-atlas-page.component').then(
        (m) => m.LiberalismAtlasPage,
      ),
    title: 'Atlas do Liberalismo — ATLAS',
    data: { breadcrumb: 'Liberalismo' },
  },
];
