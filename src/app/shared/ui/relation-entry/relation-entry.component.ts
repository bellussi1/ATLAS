import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { RelationEvidence } from '@core/content/editorial/reader-voice';

/**
 * One relation, the same way everywhere: the sentence saying who acted on whom (projected, since
 * each page opens the parties its own way), then its nature, what is known and the evidence.
 */
@Component({
  selector: 'app-relation-entry',
  templateUrl: './relation-entry.component.html',
  styleUrl: './relation-entry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RelationEntryComponent {
  readonly nature = input<string | null | undefined>(null);
  readonly meta = input<string | null | undefined>(null);
  readonly prose = input<string | null | undefined>(null);
  readonly evidence = input<readonly RelationEvidence[]>([]);
}
