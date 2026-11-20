import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type SealTone = 'accent' | 'mata' | 'neutral';

/**
 * Rubber-stamp mark for editorial and review status ("Com fontes · revisão pendente").
 * The label is real text, read as written; it never implies an approval that did not happen.
 */
@Component({
  selector: 'app-seal',
  templateUrl: './seal.component.html',
  styleUrl: './seal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-tone]': 'tone()' },
})
export class AtlasSealComponent {
  readonly label = input.required<string>();
  readonly tone = input<SealTone>('accent');
}
