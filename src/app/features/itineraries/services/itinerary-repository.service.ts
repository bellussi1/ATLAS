import { inject, Injectable } from '@angular/core';
import { CONTENT_INITIAL_PACKAGE } from '@core/content/repositories/content-assets';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { type Itinerary, itinerarySchema } from '@itineraries/models/itinerary.schema';
import { firstValueFrom } from 'rxjs';

/**
 * Loads verified itineraries from the pinned release (`ContentRepository`), sharing its
 * manifest/bundle cache, SHA-256 verification and `TransferState`.
 */
@Injectable({ providedIn: 'root' })
export class ItineraryRepository {
  private readonly content = inject(ContentRepository);
  private readonly initialPackage = inject(CONTENT_INITIAL_PACKAGE);
  private readonly cache = new Map<string, Promise<Itinerary | null>>();
  private listCache?: Promise<readonly Itinerary[]>;

  /** All verified itineraries in the current release; empty when the release predates itineraries. */
  list(): Promise<readonly Itinerary[]> {
    this.listCache ??= (async () => {
      if (this.initialPackage) {
        return Object.values(this.initialPackage.itineraries ?? {}).map((item) =>
          itinerarySchema.parse(item),
        );
      }
      if (this.content.bundledItineraries) {
        return Object.values(this.content.bundledItineraries).map((item) =>
          itinerarySchema.parse(item),
        );
      }
      const manifest = await this.content.manifestSnapshot();
      const entries = manifest.itineraries ?? [];
      if (!entries.length) return [];
      if (await this.content.hasPublishedArtifacts(entries)) {
        const loaded = await Promise.all(
          entries.map(async (entry) => {
            const raw = await this.content.verifiedResource(entry, `itinerary-${entry.slug}`);
            return itinerarySchema.parse(raw);
          }),
        );
        return loaded;
      }
      await firstValueFrom(this.content.loadKnowledgeGraph());
      return Object.values(this.content.bundledItineraries ?? {}).map((item) =>
        itinerarySchema.parse(item),
      );
    })().catch((error: unknown) => {
      this.listCache = undefined;
      throw error;
    });
    return this.listCache;
  }

  /** Loads one verified itinerary by slug; null when absent or not verified in the release. */
  bySlug(slug: string): Promise<Itinerary | null> {
    let entry = this.cache.get(slug);
    if (!entry) {
      entry = (async () => {
        const items = await this.list();
        return items.find((item) => item.slug === slug) ?? null;
      })();
      this.cache.set(slug, entry);
      entry.catch(() => this.cache.delete(slug));
    }
    return entry;
  }
}
