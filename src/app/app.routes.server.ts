import { inject } from '@angular/core';
import { PrerenderFallback, RenderMode, type ServerRoute } from '@angular/ssr';
import { editorialEntries } from '@core/content/editorial/editorial-entries';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { firstValueFrom } from 'rxjs';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'verbete/:slug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.None,
    async getPrerenderParams() {
      const repository = inject(ContentRepository);
      const graph = await firstValueFrom(repository.loadKnowledgeGraph());
      return graph.atlases.flatMap((a) => a.entities.map((e) => ({ slug: e.slug })));
    },
  },
  {
    path: 'explorar/:tipo/:slug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.None,
    async getPrerenderParams() {
      return editorialEntries.map((e) => ({ tipo: e.type, slug: e.slug }));
    },
  },
  { path: '**', renderMode: RenderMode.Prerender },
];
