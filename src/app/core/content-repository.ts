import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import methodologyAtlasData from '../../content/atlas.json';
import { Observable, map, of, shareReplay } from 'rxjs';
import { atlasSchema } from './content-schema';
import type { Atlas, Entity } from './content-schema';

export const methodologyAtlas = atlasSchema.parse(methodologyAtlasData);

@Injectable({ providedIn: 'root' })
export class ContentRepository {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private atlasRequest?: Observable<Atlas>;
  readonly atlas = methodologyAtlas;

  loadAtlas(): Observable<Atlas> {
    if (!isPlatformBrowser(this.platformId)) return of(this.atlas);

    this.atlasRequest ??= this.http.get<unknown>('/content/atlas.json').pipe(
      map((data) => atlasSchema.parse(data)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.atlasRequest;
  }

  findBySlug(slug: string | null, atlas: Atlas = this.atlas): Entity | undefined {
    if (!slug) return undefined;
    return atlas.entities.find((entity) => entity.slug === slug);
  }
}
