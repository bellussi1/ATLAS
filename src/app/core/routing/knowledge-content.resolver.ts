import { inject, Injector } from '@angular/core';
import { type ResolveFn } from '@angular/router';
import { firstValueFrom } from 'rxjs';

export const knowledgeContentResolver: ResolveFn<unknown> = () => {
  const injector = inject(Injector);
  return import('@core/content/repositories/content-repository.service').then(
    ({ ContentRepository }) => firstValueFrom(injector.get(ContentRepository).loadKnowledgeGraph()),
  );
};

/**
 * Readings and records need the graph, relations and the id index, not the explorer's full-text
 * index; the release's lean bundle carries them without that weight.
 */
export const readingContentResolver: ResolveFn<unknown> = () => {
  const injector = inject(Injector);
  return import('@core/content/repositories/content-repository.service').then(
    ({ ContentRepository }) => firstValueFrom(injector.get(ContentRepository).loadReadingGraph()),
  );
};

/** /grafos needs the collections and layouts; search and adjacency stay on the release. */
export const networkContentResolver: ResolveFn<unknown> = () => {
  const injector = inject(Injector);
  return import('@core/content/repositories/content-repository.service').then(
    ({ ContentRepository }) => firstValueFrom(injector.get(ContentRepository).loadNetworkGraph()),
  );
};
