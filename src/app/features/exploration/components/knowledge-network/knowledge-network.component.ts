import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
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
  readonly query = signal('');
  readonly matches = computed(() => {
    const query = this.query()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
    return this.entities().filter((entity) =>
      entity.title
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR')
        .includes(query),
    );
  });
  readonly neighbors = computed(
    () => new Set(this.relations().flatMap((r) => [r.fromEntityId, r.toEntityId])),
  );
  readonly visibleEntities = computed(() =>
    this.entities().filter(
      (entity) => entity.id === this.selectedId() || this.neighbors().has(entity.id),
    ),
  );
  choose(event: Event, id: string): void {
    event.preventDefault();
    this.selected.emit(id);
  }
}
