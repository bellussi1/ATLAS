import { type Route, type Routes } from '@angular/router';
import { knowledgeContentResolver } from '@core/routing/knowledge-content.resolver';

/** Each tradition has a reading (percurso) and an exploration desk (mesa), both prerendered. */
function ideologyRoutesFor(slug: string, label: string, metaDescription: string): Routes {
  const base: Route = {
    resolve: { knowledge: knowledgeContentResolver },
    loadComponent: () =>
      import('@ideologies/pages/ideology/ideology-page.component').then(
        (m) => m.IdeologyPageComponent,
      ),
  };
  return [
    {
      ...base,
      path: slug,
      title: `${label}: ideias e divergências — ATLAS`,
      data: { slug, breadcrumb: label, metaDescription, mode: 'percurso' },
    },
    {
      ...base,
      path: `${slug}/mesa`,
      title: `${label}: mesa de exploração — ATLAS`,
      data: { slug, breadcrumb: label, metaDescription, mode: 'mesa' },
    },
  ];
}

export const ideologyRoutes: Routes = [
  ...ideologyRoutesFor(
    'marxismo',
    'Marxismo',
    'Conceitos, pensadores, cronologia, divergências e fontes do marxismo.',
  ),
  ...ideologyRoutesFor(
    'liberalismo',
    'Liberalismo',
    'Conceitos, pensadores, épocas, lugares, vertentes, críticas e fontes do liberalismo.',
  ),
];
