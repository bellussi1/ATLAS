import { Dialog } from '@angular/cdk/dialog';
import { Directive, HostListener, inject, input, signal } from '@angular/core';
import { type ContextRequest } from '@core/content/models/knowledge-context';
import { entityContext } from '@core/content/queries/entity-context';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { KnowledgeContextComponent } from '@shared/ui/knowledge-context/knowledge-context.component';

@Directive({
  selector: 'button[appKnowledgeContext]',
  host: {
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'expanded()',
    '[attr.aria-controls]': 'controls()',
    '[class.is-expanded]': 'expanded()',
  },
})
export class KnowledgeContextDirective {
  readonly request = input.required<ContextRequest>({ alias: 'appKnowledgeContext' });
  readonly expanded = signal(false);
  /** The open dialog, named by the trigger while it is open. */
  readonly controls = signal<string | null>(null);
  private readonly dialog = inject(Dialog);
  private readonly repository = inject(ContentRepository);
  @HostListener('click', ['$event'])
  open(event: MouseEvent): void {
    const request = this.request();
    const record =
      'record' in request ? request.record : entityContext(this.repository, request.entityId);
    this.expanded.set(true);
    const ref = this.dialog.open(KnowledgeContextComponent, {
      data: record,
      ariaModal: true,
      // The sheet handles Esc and backdrop itself, so Esc lifts one sheet before closing.
      disableClose: true,
      // The browser's back button lifts sheets; the sheet closes itself when none is left.
      closeOnNavigation: false,
      ariaLabelledBy: 'knowledge-context-title',
      autoFocus: 'first-tabbable',
      restoreFocus: event.currentTarget as HTMLElement,
      width: 'min(56rem, calc(100vw - 2rem))',
      height: 'min(44rem, calc(100dvh - 2rem))',
      panelClass: event.detail ? 'atlas-context-panel' : 'atlas-context-panel--instant',
    });
    this.controls.set(ref.id);
    ref.closed.subscribe(() => {
      this.expanded.set(false);
      this.controls.set(null);
    });
  }
}
