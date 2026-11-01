import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { ContentLayouts } from '@core/content/models/content-artifacts';
import type { Entity, Relation } from '@core/content/models/content-schema';

@Component({
  selector: 'app-knowledge-network',
  templateUrl: './knowledge-network.component.html',
  styleUrl: './knowledge-network.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KnowledgeNetworkComponent {
  readonly entities = input.required<readonly Entity[]>();
  readonly relations = input.required<readonly Relation[]>();
  readonly layout = input.required<ContentLayouts['exploration']['networks'][string]>();
  readonly selectedId = input<string>();
  readonly selected = output<string>();
  choose(event: Event, id: string): void {
    event.preventDefault();
    this.selected.emit(id);
  }
}
