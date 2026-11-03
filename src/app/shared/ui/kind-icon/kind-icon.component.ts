import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Record families with their own geometric glyph. Unknown kinds fall back to `record`. */
export type IconKind =
  | 'person'
  | 'activist'
  | 'politician'
  | 'work'
  | 'event'
  | 'concept'
  | 'thesis'
  | 'ideology'
  | 'party'
  | 'institution'
  | 'place'
  | 'polity'
  | 'record';

const known = new Set<string>([
  'person',
  'activist',
  'politician',
  'work',
  'event',
  'concept',
  'thesis',
  'ideology',
  'party',
  'institution',
  'place',
  'polity',
]);

/** Maps a graph kind (including `historical-polity`, `government`) to an icon family. */
export function iconKind(kind: string): IconKind {
  if (kind === 'historical-polity' || kind === 'government' || kind === 'country') return 'polity';
  if (kind === 'regime') return 'polity';
  return known.has(kind) ? (kind as IconKind) : 'record';
}

/**
 * Original geometric glyph for a record family, drawn on a 24-unit grid with the
 * current text colour. Decorative: the adjacent label always names the kind.
 */
@Component({
  selector: 'app-kind-icon',
  templateUrl: './kind-icon.component.html',
  styleUrl: './kind-icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', '[attr.data-kind]': 'kind()' },
})
export class AtlasKindIconComponent {
  readonly kind = input.required<IconKind>();
}
