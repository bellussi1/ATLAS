import { inject, Injector } from '@angular/core';
import { type ResolveFn } from '@angular/router';
import { firstValueFrom } from 'rxjs';

export const knowledgeContentResolver: ResolveFn<unknown> = () => {
  const injector = inject(Injector);
  return import('@core/content/repositories/content-repository.service').then(
    ({ ContentRepository }) => firstValueFrom(injector.get(ContentRepository).loadKnowledgeGraph()),
  );
};

/** /grafos needs the collections and layouts; search and adjacency stay on the release. */
export const networkContentResolver: ResolveFn<unknown> = () => {
  const injector = inject(Injector);
  return import('@core/content/repositories/content-repository.service').then(
    ({ ContentRepository }) => firstValueFrom(injector.get(ContentRepository).loadNetworkGraph()),
  );
};
