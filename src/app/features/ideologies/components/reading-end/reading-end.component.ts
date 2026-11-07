import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { entityMedia } from '@core/content/media/asset-license';
import { ContentMediaPipe } from '@core/content/media/content-media.pipe';
import type { AssetLicense } from '@core/content/models/content-schema';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { readingPath } from '@core/routing/reading-routes';
import {
  readingPalette,
  readingRelationLabels,
  type ResolvedReadingConnection,
} from '@ideologies/data/ideology-readings';
import { AtlasGeometricMosaicComponent } from '@shared/ui/geometric-mosaic/geometric-mosaic.component';
import type { MosaicPalette } from '@shared/ui/geometric-mosaic/mosaic-tiles';

interface EndCard extends ResolvedReadingConnection {
  /** Wider composition, chosen by the curated `lead` flag. */
  lead: boolean;
  relationLabel: string;
  palette: MosaicPalette;
  seed: number;
  /** Licensed picture of the target, never a repeated portrait inside the same ending. */
  media: AssetLicense | null;
}

interface EndCredit {
  label: string;
  media: AssetLicense;
}

/**
 * Closing of a continuous reading: the statement ends and up to five curated paths continue.
 * Every card explains a relation with the reading just finished; the page home stays secondary.
 */
@Component({
  selector: 'app-ideology-reading-end',
  imports: [RouterLink, ContentMediaPipe, AtlasGeometricMosaicComponent],
  templateUrl: './reading-end.component.html',
  styleUrl: './reading-end.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeologyReadingEndComponent {
  private readonly repository = inject(ContentRepository);

  readonly connections = input.required<readonly ResolvedReadingConnection[]>();
  readonly lead = input<ResolvedReadingConnection | null>(null);
  readonly readingPath = readingPath;

  readonly cards = computed<EndCard[]>(() => {
    const graph = this.repository.knowledgeGraph;
    const lead = this.lead();
    return this.connections().map((connection, index) => ({
      ...connection,
      lead: connection.slug === lead?.slug,
      relationLabel: readingRelationLabels[connection.relation],
      palette: readingPalette(connection.slug),
      seed: index * 11 + 3,
      media: connection.imageEntityId
        ? (entityMedia(graph, { id: connection.imageEntityId }) ?? null)
        : null,
    }));
  });

  readonly credits = computed<EndCredit[]>(() =>
    this.cards().flatMap((card) => (card.media ? [{ label: card.label, media: card.media }] : [])),
  );
}
