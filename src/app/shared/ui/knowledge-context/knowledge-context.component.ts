import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { afterNextRender, Component, ElementRef, inject, Injector, signal } from '@angular/core';
import {
  type ContextConnection,
  type KnowledgeContext,
} from '@core/content/models/knowledge-context';
import { entityContext } from '@core/content/queries/entity-context';
import { ContentRepository } from '@core/content/repositories/content-repository.service';

@Component({
  selector: 'app-knowledge-context',
  templateUrl: './knowledge-context.component.html',
  styleUrl: './knowledge-context.component.scss',
})
export class KnowledgeContextComponent {
  private readonly initial = inject<KnowledgeContext>(DIALOG_DATA);
  private readonly ref = inject(DialogRef);
  private readonly repository = inject(ContentRepository);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  readonly record = signal(this.initial);
  readonly history = signal<
    {
      record: KnowledgeContext;
      scroll: number;
      focusId: string;
      expanded: string[];
    }[]
  >([]);
  permanentPath(): string | undefined {
    return this.record().entityId
      ? this.repository.discoveryIndex.find((entry) => entry.id === this.record().entityId)?.path
      : undefined;
  }
  follow(connection: ContextConnection): void {
    const scroll = this.host.nativeElement.querySelector('.context-body')?.scrollTop ?? 0;
    this.history.update((items) => [
      ...items,
      {
        record: this.record(),
        scroll,
        focusId: connection.id ?? connection.entityId,
        expanded: Array.from(
          this.host.nativeElement.querySelectorAll<HTMLDetailsElement>(
            'details[open][data-relation]',
          ),
        ).map((details) => details.dataset['relation']!),
      },
    ]);
    this.record.set(entityContext(this.repository, connection.entityId));
    this.present(0);
  }
  back(): void {
    const previous = this.history().at(-1);
    if (previous) {
      this.record.set(previous.record);
      this.history.update((items) => items.slice(0, -1));
      this.present(previous.scroll, previous.focusId, previous.expanded);
    }
  }
  close(): void {
    this.ref.close();
  }

  statusLabel(status: KnowledgeContext['editorialStatus']): string {
    switch (status) {
      case 'pending':
        return 'Revisão editorial pendente';
      case 'draft':
        return 'Rascunho';
      case 'verified':
        return 'Marcado como verificado';
      case 'contested':
        return 'Contestado';
      case 'needs-update':
        return 'Precisa de atualização';
      default:
        return 'Estado editorial não informado';
    }
  }

  relationKind(connection: ContextConnection): string {
    switch (connection.relation?.type) {
      case 'encyclopedic-link':
        return 'Descoberta enciclopédica';
      case 'editorial-link':
        return 'Vínculo editorial';
      case 'documented-association':
        return 'Associação documentada';
      case 'influence':
      case 'influenced':
      case 'influenced_by':
        return 'Influência registrada';
      case 'reacted_against':
        return 'Divergência registrada';
      default:
        return 'Relação registrada';
    }
  }

  uncertaintyLabel(value: NonNullable<ContextConnection['relation']>['uncertainty']): string {
    return { low: 'baixa', moderate: 'moderada', high: 'alta', unknown: 'não determinada' }[value];
  }

  private present(scroll: number, focusId?: string, expanded: string[] = []): void {
    afterNextRender(
      () => {
        this.host.nativeElement
          .querySelectorAll<HTMLDetailsElement>('details[data-relation]')
          .forEach((details) => {
            details.open = expanded.includes(details.dataset['relation']!);
          });
        const body = this.host.nativeElement.querySelector<HTMLElement>('.context-body');
        if (body) body.scrollTop = scroll;
        const target = focusId
          ? this.host.nativeElement.querySelector<HTMLElement>(`[data-connection="${focusId}"]`)
          : this.host.nativeElement.querySelector<HTMLElement>('h2');
        target?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }
}
