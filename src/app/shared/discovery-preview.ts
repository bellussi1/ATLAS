import { Component, Directive, HostListener, inject, input } from '@angular/core';
import { Dialog, DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { RouterLink } from '@angular/router';
import type { DiscoveryIndexEntry } from '../core/discovery-index';

export interface DiscoveryPreviewTarget { entry: DiscoveryIndexEntry; origin: string; }

@Component({
  selector: 'app-discovery-preview',
  imports: [RouterLink],
  template: `
    <header><p>Prévia de descoberta · {{ target.entry.kindLabel }}</p><button type="button" (click)="close()" aria-label="Fechar prévia">Fechar ×</button></header>
    <div class="preview-body">
      <p class="state">{{ target.entry.stateLabel }}</p>
      <h2 id="discovery-preview-title">{{ target.entry.title }}</h2>
      <p class="summary">{{ target.entry.summary }}</p>
      @if (target.entry.aliases.length) { <p class="aliases"><strong>Também registrado como:</strong> {{ target.entry.aliases.join(', ') }}</p> }
      @if (target.entry.context) { <section><h3>Contexto</h3><p>{{ target.entry.context }}</p></section> }
      <a class="open-link" [routerLink]="target.entry.path" [fragment]="target.entry.fragment" [queryParams]="{ origem: target.origin }" (click)="close()">Abrir registro completo <span aria-hidden="true">↗</span></a>
    </div>
  `,
  styles: `
    :host { display: block; max-height: 90dvh; overflow: auto; background: var(--color-canvas); color: var(--color-ink); border: 1px solid var(--color-ink); }
    header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .75rem 1rem; border-bottom: 1px solid var(--color-border-strong); }
    header p, .state { margin: 0; color: var(--color-ink-muted); font: .75rem/1.5 var(--font-mono); }
    button { min-height: 2.75rem; padding: .5rem; border: 1px solid var(--color-border-strong); color: var(--color-ink); background: transparent; cursor: pointer; }
    .preview-body { padding: clamp(1rem, 4vw, 2.5rem); }
    h2 { max-width: 18ch; margin: .5rem 0 1rem; font-size: clamp(1.8rem, 5vw, 3rem); letter-spacing: -.05em; line-height: 1.05; }
    .summary { font: 1.2rem/1.5 var(--font-serif); }
    .aliases { color: var(--color-ink-muted); }
    section { max-width: 44rem; margin-block: 2rem; padding-top: 1rem; border-top: 1px solid var(--color-border-strong); }
    h3 { font: 500 1.35rem/1.2 var(--font-serif); }
    section p { line-height: 1.7; }
    .open-link { display: inline-flex; align-items: center; gap: .5rem; min-height: 2.75rem; padding: .65rem .8rem; color: white; background: var(--color-ink); font-weight: 650; text-underline-offset: .2em; }
    :focus-visible { outline: 3px solid var(--color-accent); outline-offset: 3px; }
  `,
})
export class AtlasDiscoveryPreviewComponent {
  readonly target = inject<DiscoveryPreviewTarget>(DIALOG_DATA);
  private readonly dialogRef = inject(DialogRef);
  close(): void { this.dialogRef.close(); }
}

@Directive({ selector: 'button[appDiscoveryPreview]', standalone: true, host: { '[attr.aria-haspopup]': '"dialog"' } })
export class AtlasDiscoveryPreviewDirective {
  readonly target = input.required<DiscoveryPreviewTarget>({ alias: 'appDiscoveryPreview' });
  private readonly dialog = inject(Dialog);
  @HostListener('click', ['$event'])
  open(event: MouseEvent): void {
    this.dialog.open(AtlasDiscoveryPreviewComponent, {
      data: this.target(), ariaLabelledBy: 'discovery-preview-title', autoFocus: 'first-tabbable',
      restoreFocus: event.currentTarget as HTMLElement,
      width: 'min(44rem, calc(100vw - 2rem))', maxWidth: '100vw',
      panelClass: event.detail ? 'atlas-preview-panel' : 'atlas-preview-panel--instant',
    });
  }
}
