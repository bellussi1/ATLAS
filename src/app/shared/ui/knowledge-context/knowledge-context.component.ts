import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { afterNextRender, Component, ElementRef, inject, Injector, signal } from '@angular/core';
import { type KnowledgeContext } from '@core/content/models/knowledge-context';
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
  readonly history = signal<{ record: KnowledgeContext; scroll: number; focusId: string }[]>([]);
  follow(id: string): void {
    const scroll = this.host.nativeElement.querySelector('.context-body')?.scrollTop ?? 0;
    this.history.update((items) => [...items, { record: this.record(), scroll, focusId: id }]);
    this.record.set(entityContext(this.repository, id));
    this.present(0);
  }
  back(): void {
    const previous = this.history().at(-1);
    if (previous) {
      this.record.set(previous.record);
      this.history.update((items) => items.slice(0, -1));
      this.present(previous.scroll, previous.focusId);
    }
  }
  close(): void {
    this.ref.close();
  }

  private present(scroll: number, focusId?: string): void {
    afterNextRender(
      () => {
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
