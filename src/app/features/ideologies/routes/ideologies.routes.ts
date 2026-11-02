import { type Routes } from '@angular/router';
import { knowledgeContentResolver } from '@core/routing/knowledge-content.resolver';

export const ideologyRoutes: Routes = [
  {
    path: 'marxismo',
    resolve: { knowledge: knowledgeContentResolver },
    loadComponent: () =>
      import('@ideologies/pages/ideology/ideology-page.component').then(
        (m) => m.IdeologyPageComponent,
      ),
    title: 'Marxismo: ideias e divergências — ATLAS',
    data: {
      slug: 'marxismo',
      breadcrumb: 'Marxismo',
      metaDescription: 'Conceitos, pensadores, cronologia, divergências e fontes do marxismo.',
    },
  },
  {
    path: 'liberalismo',
    resolve: { knowledge: knowledgeContentResolver },
    loadComponent: () =>
      import('@ideologies/pages/ideology/ideology-page.component').then(
        (m) => m.IdeologyPageComponent,
      ),
    title: 'Liberalismo: ideias e divergências — ATLAS',
    data: {
      slug: 'liberalismo',
      breadcrumb: 'Liberalismo',
      metaDescription:
        'Conceitos, pensadores, épocas, lugares, vertentes, críticas e fontes do liberalismo.',
    },
  },
];
