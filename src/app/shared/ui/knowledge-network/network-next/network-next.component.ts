import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AtlasKindIconComponent, type IconKind } from '@shared/ui/kind-icon/kind-icon.component';

export interface NetworkNextStep {
  readonly id: string;
  readonly title: string;
  readonly icon: IconKind;
  /** How the selected record relates to this one: "influenciou", "foi influenciado por". */
  readonly verb: string;
  readonly degree: number;
}

/** "Para onde seguir": the best-connected neighbours of the selected record, one click away. */
@Component({
  selector: 'app-network-next',
  imports: [AtlasKindIconComponent],
  templateUrl: './network-next.component.html',
  styleUrl: './network-next.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtlasNetworkNextComponent {
  readonly steps = input<readonly NetworkNextStep[]>([]);
  readonly pick = output<string>();
}
