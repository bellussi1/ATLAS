import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

export type StampTone = 'cal' | 'ocre' | 'mata' | 'rosa' | 'urucum';
export type StampShadow = 'none' | 'sm' | 'md' | 'lg';

/**
 * Perforated paper for citable objects (record, source, entry, reading card).
 * Not a layout container: forms, prose blocks and page sections stay unframed.
 * The perforation is a mask on the inner paper: the offset shadow lives on the host,
 * and the padding keeps inner focus rings clear of the holes. To make the whole
 * stamp a link, wrap it in the anchor so the ring stays outside the mask.
 */
@Component({
  selector: 'app-stamp',
  templateUrl: './stamp.component.html',
  styleUrl: './stamp.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-tone]': 'tone()',
    '[attr.data-shadow]': 'shadow()',
  },
})
export class AtlasStampComponent {
  readonly tone = input<StampTone>('cal');
  readonly shadow = input<StampShadow>('md');
  /** Paper grain, for poster compositions only; never behind running text. */
  readonly grain = input(false, { transform: booleanAttribute });
}
