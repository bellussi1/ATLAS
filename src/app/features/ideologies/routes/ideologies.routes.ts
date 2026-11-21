import { type Routes } from '@angular/router';
import { readingContentResolver } from '@core/routing/knowledge-content.resolver';
import { READING_ROOT } from '@core/routing/reading-routes';
import { ideologyReadings } from '@ideologies/data/ideology-readings';

/**
 * Each tradition is one continuous reading under `/leitura/:slug`. The old top-level address
 * redirects to the canonical one; the obsolete `/:slug/mesa` desk alias was removed.
 */
function ideologyRoutesFor(slug: string, label: string, metaDescription: string): Routes {
  return [
    {
      path: `${READING_ROOT}/${slug}`,
      title: `${label}: ideias e divergências — ATLAS`,
      data: { slug, breadcrumb: label, metaDescription },
      resolve: { knowledge: readingContentResolver },
      loadComponent: () =>
        import('@ideologies/pages/ideology/ideology-page.component').then(
          (m) => m.IdeologyPageComponent,
        ),
    },
    { path: slug, pathMatch: 'full', redirectTo: `/${READING_ROOT}/${slug}` },
  ];
}

export const ideologyRoutes: Routes = [
  {
    path: 'leituras',
    title: 'Leituras contínuas — ATLAS',
    data: { breadcrumb: 'Leituras' },
    loadComponent: () =>
      import('@ideologies/pages/readings-index/readings-index.component').then(
        (m) => m.ReadingsIndexComponent,
      ),
  },
  ...ideologyReadings.flatMap((reading) =>
    ideologyRoutesFor(reading.slug, reading.label, reading.metaDescription),
  ),
];
