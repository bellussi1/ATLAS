import { type Routes } from '@angular/router';

export const itineraryRoutes: Routes = [
  {
    path: 'itinerarios',
    title: 'Itinerários — ATLAS',
    data: {
      breadcrumb: 'Itinerários',
      metaDescription:
        'Percursos editoriais por leituras, verbetes e relações do acervo organizados por perguntas.',
    },
    loadComponent: () =>
      import('@itineraries/pages/itineraries-index/itineraries-index.component').then(
        (m) => m.ItinerariesIndexComponent,
      ),
  },
  {
    path: 'itinerario/:slug',
    title: 'Itinerário — ATLAS',
    data: {
      breadcrumb: 'Itinerário',
      metaDescription: 'Percurso editorial comentado com paradas e ramos no acervo do ATLAS.',
    },
    loadComponent: () =>
      import('@itineraries/pages/itinerary-page/itinerary-page.component').then(
        (m) => m.ItineraryPageComponent,
      ),
  },
];
