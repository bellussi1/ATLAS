import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { AtlasGeometricMosaicComponent } from '../geometric-mosaic/geometric-mosaic.component';
import type { MosaicPalette } from '../geometric-mosaic/mosaic-tiles';
import { composeIllustration, ILLUSTRATION_SIZE } from './illustration';

/**
 * Own geometric illustration for a record with no free picture. Static, square and sized by the
 * host (`--illustration-size`), so it reserves its space. Named for assistive technology unless
 * `decorative` is set, for places where the title already sits beside it.
 */
@Component({
  selector: 'app-geometric-illustration',
  imports: [AtlasGeometricMosaicComponent],
  templateUrl: './geometric-illustration.component.html',
  styleUrl: './geometric-illustration.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.role]': 'decorative() ? null : "img"',
    '[attr.aria-label]': 'decorative() ? null : label()',
    '[attr.aria-hidden]': 'decorative() ? "true" : null',
  },
})
export class AtlasGeometricIllustrationComponent {
  readonly entityId = input.required<string>();
  readonly kind = input<string>('record');
  readonly title = input<string>('');
  readonly palette = input<MosaicPalette>('atlas');
  readonly decorative = input(false);

  protected readonly size = ILLUSTRATION_SIZE;
  readonly tiles = computed(() =>
    composeIllustration(this.entityId(), this.kind(), this.palette()),
  );
  readonly label = computed(() => `Ilustração geométrica de ${this.title() || this.entityId()}`);
}
