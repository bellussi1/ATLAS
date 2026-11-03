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
import { panelInset, readingEdge } from './panel-inset';

const OPEN_CLASS = 'atlas-panel-open';
const INSET_VAR = '--atlas-panel-inset';
const DOCKS_PAGE = '(min-width: 64rem)';

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
  private stopFitting: (() => void) | null = null;
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
    const before = trigger.getBoundingClientRect().top;
    this.window?.document.documentElement.classList.add(OPEN_CLASS);
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
    this.fit(trigger, before);
    this.watchFit();
    ref.closed.subscribe(() => {
      const trigger = this.active();
      this.ref = null;
      this.active.set(null);
      this.dialogId.set(null);
      this.release(trigger);
      const doc = this.window?.document;
      if (trigger?.isConnected && (!doc?.activeElement || doc.activeElement === doc.body)) {
        trigger.focus({ preventScroll: true });
      }
    });
  }

  /**
   * Gives the page the room the docked panel needs. The free margin beside the reading
   * column is used first; only the shortfall becomes padding, published as --atlas-panel-inset.
   * The natural layout is measured with no inset, in the same frame, so nothing flashes.
   * Whatever reflow remains is corrected by keeping the trigger where the reader's eye was.
   */
  private fit(trigger: HTMLElement | null, before = this.topOf(trigger)): void {
    const doc = this.window?.document;
    const root = doc?.documentElement;
    if (!doc || !root || !this.window) return;
    const pane = doc.querySelector('.atlas-context-pane');
    root.style.setProperty(INSET_VAR, '0px');
    const edge = readingEdge(doc);
    if (pane && edge !== null && this.window.matchMedia(DOCKS_PAGE).matches) {
      const width = pane.getBoundingClientRect().width;
      root.style.setProperty(INSET_VAR, `${panelInset(width, root.clientWidth, edge)}px`);
    } else {
      root.style.removeProperty(INSET_VAR);
    }
    this.restore(trigger, before);
  }

  /**
   * Re-fits when the viewport resizes or the panel width changes. Pinning a sheet widens the
   * panel by rewriting --atlas-panel-width on <html>, which is watched through that attribute.
   */
  private watchFit(): void {
    const win = this.window;
    const root = win?.document.documentElement;
    if (!win || !root) return;
    const refit = () => this.fit(this.active());
    const width = () => root.style.getPropertyValue('--atlas-panel-width');
    let seen = width();
    const observer = new MutationObserver(() => {
      if (width() === seen) return;
      seen = width();
      refit();
    });
    observer.observe(root, { attributes: true, attributeFilter: ['style'] });
    win.addEventListener('resize', refit);
    this.stopFitting = () => {
      win.removeEventListener('resize', refit);
      observer.disconnect();
    };
  }

  private release(trigger: HTMLElement | null): void {
    this.stopFitting?.();
    this.stopFitting = null;
    const root = this.window?.document.documentElement;
    if (!root) return;
    const before = this.topOf(trigger);
    root.classList.remove(OPEN_CLASS);
    root.style.removeProperty(INSET_VAR);
    this.restore(trigger, before);
  }

  private topOf(trigger: HTMLElement | null): number | undefined {
    return trigger?.isConnected ? trigger.getBoundingClientRect().top : undefined;
  }

  private restore(trigger: HTMLElement | null, before: number | undefined): void {
    if (!trigger?.isConnected || before === undefined || !this.window) return;
    const shift = trigger.getBoundingClientRect().top - before;
    if (shift) this.window.scrollBy({ top: shift, behavior: 'instant' });
  }
}
