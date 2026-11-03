import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AtlasKindIconComponent, type IconKind } from '@shared/ui/kind-icon/kind-icon.component';

/**
 * Uniform record card on a native button: kind (glyph and label), title, period and a
 * closing note (relations, classification). The licensed picture replaces the glyph
 * corner. The host stays a button so opening directives can sit on it.
 */
@Component({
  // Attribute selector so the host stays a native button that opening directives can share.
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[appRecordCard]',
  imports: [AtlasKindIconComponent],
  templateUrl: './record-card.component.html',
  styleUrl: './record-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'record-card', type: 'button', '[attr.data-kind]': 'tone() ?? icon()' },
})
export class RecordCardComponent {
  readonly icon = input.required<IconKind>();
  readonly kindLabel = input.required<string>();
  readonly title = input.required<string>();
  readonly period = input<string>('');
  readonly note = input<string>('');
  readonly picture = input<string | null>(null);
  /** Colour family of the top rule; defaults to the glyph family. */
  readonly tone = input<string | null>(null);
}
