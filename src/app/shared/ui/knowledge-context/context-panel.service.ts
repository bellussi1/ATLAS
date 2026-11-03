import { Dialog, type DialogRef } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import {
  type ContextRequest,
  type ContextStop,
  type KnowledgeContext,
} from '@core/content/models/knowledge-context';
import { entityContext } from '@core/content/queries/entity-context';
import { ContentRepository } from '@core/content/repositories/content-repository.service';

import { KnowledgeContextComponent } from './knowledge-context.component';

const OPEN_CLASS = 'atlas-panel-open';

/** Stable identity of a request, so the same record met twice in a chapter is one stop. */
export function contextKey(request: ContextRequest): string {
  return 'record' in request ? `record:${request.record.title}` : request.entityId;
}

/**
 * Owns the single open reading panel. Opening a record while the panel is already open
 * replaces what it shows, since on wide screens the page stays usable beside it.
 */
@Injectable({ providedIn: 'root' })
export class ContextPanelService {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private readonly repository = inject(ContentRepository);
  private readonly window = inject(DOCUMENT).defaultView;
  private ref: DialogRef<unknown, KnowledgeContextComponent> | null = null;
  /** Trigger that currently owns the panel, for aria-expanded and for returning focus. */
  readonly active = signal<HTMLElement | null>(null);
  readonly dialogId = signal<string | null>(null);

  resolve(request: ContextRequest): KnowledgeContext {
    return 'record' in request ? request.record : entityContext(this.repository, request.entityId);
  }

  open(request: ContextRequest, trigger: HTMLElement, order: ContextStop[]): void {
    this.active.set(trigger);
    const key = contextKey(request);
    const stops = order.some((stop) => stop.key === key) ? order : [...order, { key, request }];
    const present = this.ref?.componentInstance;
    if (present) {
      present.show(
        this.resolve(request),
        stops,
        stops.findIndex((stop) => stop.key === key),
      );
      return;
    }
    const narrow = !this.window?.matchMedia('(min-width: 64rem)').matches;
    this.window?.document.documentElement.classList.add(OPEN_CLASS);
    const ref = this.dialog.open<unknown, unknown, KnowledgeContextComponent>(
      KnowledgeContextComponent,
      {
        data: {
          record: this.resolve(request),
          stops,
          index: stops.findIndex((stop) => stop.key === key),
        },
        // Wide: a side panel beside the page, so no modal semantics. Narrow: a full-width pane.
        ariaModal: narrow,
        hasBackdrop: true,
        backdropClass: 'atlas-context-backdrop',
        panelClass: 'atlas-context-pane',
        // Sizing belongs to the stylesheet, which switches between side panel and full width.
        maxWidth: '100vw',
        // The panel handles Esc and the backdrop itself, so Esc lifts one layer before closing.
        disableClose: true,
        // The browser's back button lifts layers; the panel closes itself when none is left.
        closeOnNavigation: false,
        ariaLabelledBy: 'knowledge-context-title',
        autoFocus: 'first-heading',
        restoreFocus: false,
        scrollStrategy: narrow
          ? this.overlay.scrollStrategies.block()
          : this.overlay.scrollStrategies.noop(),
      },
    );
    this.ref = ref;
    this.dialogId.set(ref.id);
    ref.closed.subscribe(() => {
      const trigger = this.active();
      this.ref = null;
      this.active.set(null);
      this.dialogId.set(null);
      this.window?.document.documentElement.classList.remove(OPEN_CLASS);
      const doc = this.window?.document;
      if (trigger?.isConnected && (!doc?.activeElement || doc.activeElement === doc.body)) {
        trigger.focus({ preventScroll: true });
      }
    });
  }
}
