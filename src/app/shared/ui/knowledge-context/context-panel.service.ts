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
    const narrow = !this.window?.matchMedia('(min-width: 48rem)').matches;
    this.docked(trigger, true);
    const ref = this.dialog.open<unknown, unknown, KnowledgeContextComponent>(
      KnowledgeContextComponent,
      {
        data: {
          record: this.resolve(request),
          stops,
          index: stops.findIndex((stop) => stop.key === key),
        },
        // Wide: a docked panel beside the page, so no modal semantics. Narrow: a bottom sheet.
        ariaModal: narrow,
        hasBackdrop: true,
        backdropClass: 'atlas-context-backdrop',
        panelClass: 'atlas-context-pane',
        // Sizing belongs to the stylesheet, which switches between side panel and bottom sheet.
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
      this.docked(trigger, false);
      const doc = this.window?.document;
      if (trigger?.isConnected && (!doc?.activeElement || doc.activeElement === doc.body)) {
        trigger.focus({ preventScroll: true });
      }
    });
  }

  /**
   * Docks or releases the page beside the panel. The text reflows into the remaining
   * width, so the scroll position is corrected to keep the trigger where the reader's eye was.
   */
  private docked(trigger: HTMLElement | null, on: boolean): void {
    const root = this.window?.document.documentElement;
    if (!root || !this.window) return;
    const connected = trigger?.isConnected ? trigger : null;
    const before = connected?.getBoundingClientRect().top;
    root.classList.toggle('atlas-panel-open', on);
    if (!connected || before === undefined) return;
    const shift = connected.getBoundingClientRect().top - before;
    if (shift) this.window.scrollBy({ top: shift, behavior: 'instant' });
  }
}
