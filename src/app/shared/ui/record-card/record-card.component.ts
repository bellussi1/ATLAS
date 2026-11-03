import { ChangeDetectionStrategy, Component, ElementRef, inject, input } from '@angular/core';
import { AtlasKindIconComponent, type IconKind } from '@shared/ui/kind-icon/kind-icon.component';

/**
 * Uniform record card on a native button or link: kind (glyph and label), title, period and a
 * closing note (relations, classification). The licensed picture replaces the glyph
 * corner. The host stays a native control so opening directives or router links sit on it.
 */
@Component({
  // Attribute selector so the host stays a native button or link.
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[appRecordCard], a[appRecordCard]',
  imports: [AtlasKindIconComponent],
  templateUrl: './record-card.component.html',
  styleUrl: './record-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'record-card',
    '[attr.type]': "isButton ? 'button' : null",
    '[attr.data-kind]': 'tone() ?? icon()',
  },
})
export class RecordCardComponent {
  readonly isButton = inject(ElementRef).nativeElement.tagName === 'BUTTON';
  readonly icon = input.required<IconKind>();
  readonly kindLabel = input.required<string>();
  readonly title = input.required<string>();
  readonly period = input<string>('');
  readonly note = input<string>('');
  readonly picture = input<string | null>(null);
  /** Colour family of the top rule; defaults to the glyph family. */
  readonly tone = input<string | null>(null);
}
