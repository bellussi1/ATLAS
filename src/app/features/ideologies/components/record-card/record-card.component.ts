import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { type DeskEntity, kindLabel } from '@ideologies/utils/desk-graph';
import { AtlasKindIconComponent } from '@shared/ui/kind-icon/kind-icon.component';

/**
 * One record of a tradition as a card: kind (glyph and label), title, period and how
 * many documented relations it has. The licensed picture replaces the glyph corner.
 */
@Component({
  selector: 'app-record-card',
  imports: [AtlasKindIconComponent],
  templateUrl: './record-card.component.html',
  styleUrl: './record-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordCardComponent {
  readonly entity = input.required<DeskEntity>();
  readonly picture = input<string | null>(null);
  readonly pressed = input(false);
  readonly picked = output<string>();
  readonly kindLabel = kindLabel;
}
