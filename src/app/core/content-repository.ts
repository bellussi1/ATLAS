import { Injectable } from '@angular/core';
import methodologyAtlasData from '../../content/atlas.json';
import { atlasSchema } from './content-schema';
import type { Entity } from './content-schema';

export const methodologyAtlas = atlasSchema.parse(methodologyAtlasData);

@Injectable({ providedIn: 'root' })
export class ContentRepository {
  readonly atlas = methodologyAtlas;

  findBySlug(slug: string | null): Entity | undefined {
    if (!slug) return undefined;
    return this.atlas.entities.find((entity) => entity.slug === slug);
  }
}
