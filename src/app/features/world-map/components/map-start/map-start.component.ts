import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { WorldMapEraPreset } from '@core/content/queries/world-map-eras';
import { AtlasIconComponent } from '@shared/ui/icon/icon.component';

export interface MapStartTerritory {
  readonly id: string;
  readonly title: string;
  readonly kind: string;
}

/** First card of the map: how to read the globe and a few places and periods to start from. */
@Component({
  selector: 'app-map-start',
  imports: [AtlasIconComponent],
  templateUrl: './map-start.component.html',
  styleUrl: './map-start.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapStartComponent {
  readonly territories = input<readonly MapStartTerritory[]>([]);
  readonly presets = input<readonly WorldMapEraPreset[]>([]);
  readonly pickTerritory = output<string>();
  readonly pickPreset = output<WorldMapEraPreset>();
  readonly dismiss = output<void>();
}
