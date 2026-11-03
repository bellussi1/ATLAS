import { type Routes } from '@angular/router';
import { knowledgeContentResolver } from '@core/routing/knowledge-content.resolver';

/**
 * Each tradition is one page. The old
 * `/:slug/mesa` desk address redirects to the page.
 */
function ideologyRoutesFor(slug: string, label: string, metaDescription: string): Routes {
  return [
    {
      path: slug,
      title: `${label}: ideias e divergências — ATLAS`,
      data: { slug, breadcrumb: label, metaDescription },
      resolve: { knowledge: knowledgeContentResolver },
      loadComponent: () =>
        import('@ideologies/pages/ideology/ideology-page.component').then(
          (m) => m.IdeologyPageComponent,
        ),
    },
    { path: `${slug}/mesa`, redirectTo: `/${slug}`, pathMatch: 'full' },
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
