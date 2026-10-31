import { RenderMode, ServerRoute } from '@angular/ssr';
import { editorialEntries } from './content/editorial-entries';
import { editorialTypes } from './content/content-types';
import { methodologyAtlas } from './core/content-repository';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'explorar/:tipo',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return editorialTypes.map((type) => ({ tipo: type.slug }));
    },
  },
  {
    path: 'explorar/:tipo/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return editorialEntries.map((entry) => ({ tipo: entry.type, slug: entry.slug }));
    },
  },
  {
    path: 'estudar/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return [{ slug: 'como-usar-trilhas' }];
    },
  },
  {
    path: 'verbete/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return methodologyAtlas.entities
        .filter((entity) => entity.kind === 'concept')
        .map((entity) => ({ slug: entity.slug }));
    },
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  }
];
