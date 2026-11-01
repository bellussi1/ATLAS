import { type Provider } from '@angular/core';
import { type ContentPackage } from '@core/content/models/content-artifacts';
import { knowledgeGraphSchema } from '@core/content/models/content-schema';
import {
  CONTENT_ASSET_READER,
  CONTENT_INITIAL_PACKAGE,
} from '@core/content/repositories/content-assets';

import data from '../../generated/testing/content-fixture.json';

export const contentFixture: ContentPackage = {
  ...data,
  graph: knowledgeGraphSchema.parse(data.graph),
} as ContentPackage;
export const methodologyKnowledgeGraph = contentFixture.graph;
export const methodologyAtlas = methodologyKnowledgeGraph.atlases[0];
export const contentAssetFixture: Record<string, string> = {
  ...data.assets,
  '/content/manifest.json': JSON.stringify(data.manifest),
};
export const contentManifestFixture = data.manifest;
export function provideContentFixture(): Provider[] {
  return [
    { provide: CONTENT_INITIAL_PACKAGE, useValue: contentFixture },
    {
      provide: CONTENT_ASSET_READER,
      useValue: () => Promise.reject(new Error('Unexpected content request in seeded test')),
    },
  ];
}
