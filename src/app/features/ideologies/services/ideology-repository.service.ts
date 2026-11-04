import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import {
  type IdeologyDossier,
  validateIdeologyDossier,
} from '@ideologies/models/ideology-page.schema';
import { from, map, type Observable, of, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class IdeologyRepository {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly transferState = inject(TransferState);
  private readonly content = inject(ContentRepository);

  /** Readings come from the pinned R2 release; the server transfers the validated dossier. */
  loadIdeology(slug: string): Observable<IdeologyDossier | null> {
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
    return from(this.content.loadIdeology(slug)).pipe(
      map((bundle) =>
        bundle
          ? validateIdeologyDossier(bundle.page, bundle.supplement, this.content.knowledgeGraph)
          : null,
      ),
      tap((dossier) => {
        if (!isPlatformBrowser(this.platformId)) this.transferState.set(stateKey, dossier);
      }),
    );
  }
}
