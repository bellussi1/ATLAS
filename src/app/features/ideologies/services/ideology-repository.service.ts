import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { publishedIdeologies } from '@ideologies/data/published-ideologies';
import {
  type IdeologyDossier,
  validateIdeologyDossier,
} from '@ideologies/models/ideology-page.schema';
import { forkJoin, from, map, type Observable, of, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class IdeologyRepository {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly transferState = inject(TransferState);
  private readonly content = inject(ContentRepository);
  loadIdeology(slug: string): Observable<IdeologyDossier | null> {
    // Only published snapshots are routable; draft examples stay outside the registry.
    const snapshot = Object.hasOwn(publishedIdeologies, slug)
      ? publishedIdeologies[slug]
      : undefined;
    if (!snapshot) return of(null);
    const stateKey = makeStateKey<IdeologyDossier | null>('ideology-' + slug);
    const transferred = this.transferState.get(stateKey, null);
    if (transferred) {
      this.transferState.remove(stateKey);
      return of(
        validateIdeologyDossier(
          transferred.page,
          transferred.supplement,
          this.content.knowledgeGraph,
        ),
      );
    }
    if (!isPlatformBrowser(this.platformId)) {
      return from(Promise.all([snapshot.loadPage(), snapshot.loadSupplement()])).pipe(
        map(([page, supplement]) =>
          validateIdeologyDossier(page.default, supplement.default, this.content.knowledgeGraph),
        ),
        tap((dossier) => this.transferState.set(stateKey, dossier)),
      );
    }
    return forkJoin({
      page: this.http.get<unknown>(snapshot.pageUrl),
      supplement: this.http.get<unknown>(snapshot.supplementUrl),
    }).pipe(
      map(({ page, supplement }) =>
        validateIdeologyDossier(page, supplement, this.content.knowledgeGraph),
      ),
    );
  }
}
