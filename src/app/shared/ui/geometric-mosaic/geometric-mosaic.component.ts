import { Component, computed, input } from '@angular/core';

import { composeMosaic, type MosaicPalette, type MosaicTile } from './mosaic-tiles';

/**
 * Decorative poster mosaic. The SVG keeps a fixed aspect ratio, so recomposing
 * never changes layout; meaning always comes from the adjacent text.
 */
@Component({
  selector: 'app-geometric-mosaic',
  templateUrl: './geometric-mosaic.component.html',
  styleUrl: './geometric-mosaic.component.scss',
  host: { '[class.is-interactive]': 'interactive()' },
})
export class AtlasGeometricMosaicComponent {
  readonly columns = input(4);
  readonly rows = input(4);
  readonly palette = input<MosaicPalette>('atlas');
  readonly seed = input(7);
  readonly interactive = input(false);
  /** Ready-made composition; when set it replaces the seeded one. */
  readonly composition = input<readonly MosaicTile[] | null>(null);

  readonly tiles = computed(
    () =>
      this.composition() ?? composeMosaic(this.columns(), this.rows(), this.palette(), this.seed()),
  );
  readonly viewBox = computed(() => `0 0 ${this.columns() * 100} ${this.rows() * 100}`);
}
