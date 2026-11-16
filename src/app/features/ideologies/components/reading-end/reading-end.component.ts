import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
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
}

/**
 * Closing of a continuous reading: the statement ends and up to five curated paths continue.
 * Every card explains a relation with the reading just finished; the page home stays secondary.
 */
@Component({
  selector: 'app-ideology-reading-end',
  imports: [RouterLink, AtlasGeometricMosaicComponent],
  templateUrl: './reading-end.component.html',
  styleUrl: './reading-end.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeologyReadingEndComponent {
  readonly connections = input.required<readonly ResolvedReadingConnection[]>();
  readonly lead = input<ResolvedReadingConnection | null>(null);
  readonly readingPath = readingPath;

  readonly cards = computed<EndCard[]>(() => {
    const lead = this.lead();
    return this.connections().map((connection, index) => ({
      ...connection,
      lead: connection.slug === lead?.slug,
      relationLabel: readingRelationLabels[connection.relation],
      palette: readingPalette(connection.slug),
      seed: index * 11 + 3,
    }));
  });
}
