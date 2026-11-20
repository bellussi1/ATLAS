import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AtlasKindIconComponent, type IconKind } from '@shared/ui/kind-icon/kind-icon.component';

export interface NetworkStartEntry {
  readonly id: string;
  readonly title: string;
  readonly kind: string;
  readonly icon: IconKind;
}

export interface NetworkStartRoute {
  readonly from: NetworkStartEntry;
  readonly to: NetworkStartEntry;
}

/** First card of the graph: what the drawing shows and a few doors into it. */
@Component({
  selector: 'app-network-start',
  imports: [AtlasKindIconComponent],
  templateUrl: './network-start.component.html',
  styleUrl: './network-start.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtlasNetworkStartComponent {
  readonly entries = input<readonly NetworkStartEntry[]>([]);
  readonly route = input<NetworkStartRoute | null>(null);
  readonly pick = output<string>();
  readonly trace = output<NetworkStartRoute>();
  readonly dismiss = output<void>();
}
