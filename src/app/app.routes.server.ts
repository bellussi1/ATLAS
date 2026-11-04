import { inject } from '@angular/core';
import { PrerenderFallback, RenderMode, type ServerRoute } from '@angular/ssr';
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
  { path: '**', renderMode: RenderMode.Prerender },
];
