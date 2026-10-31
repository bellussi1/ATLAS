import { Component, Directive, HostListener, inject, input } from '@angular/core';
import { Dialog, DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { RouterLink } from '@angular/router';
import { EditorialEntry } from '../content/content-types';
import { getEntryPath } from '../content/editorial-entries';

@Component({
  selector: 'app-reading-preview',
  imports: [RouterLink],
  template: `
    <header><span>Prévia de leitura · {{ entry.statusLabel }}</span><button type="button" (click)="close()" aria-label="Fechar prévia">Fechar ×</button></header>
    <div class="preview-body">
      <p class="eyebrow">Um ponto de partida</p>
      <h2 id="preview-title">{{ entry.title }}</h2>
      <p class="summary">{{ entry.summary }}</p>
      <section aria-labelledby="preview-section-title">
        <h3 id="preview-section-title">{{ entry.sections[0].heading }}</h3>
        <p>{{ entry.sections[0].paragraphs[0] }}</p>
      </section>
      <p class="scope">Este é um texto sobre a metodologia do ATLAS.</p>
      <a class="read-link" [routerLink]="path" (click)="close()">Continuar no texto completo →</a>
    </div>
  `,
  styles: `
    :host { display: block; background: var(--color-canvas); color: var(--color-ink); border: 1px solid var(--color-ink); max-height: 90dvh; overflow: auto; }
    header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: .75rem 1rem; border-bottom: 1px solid var(--color-border-strong); font: .75rem/1.5 var(--font-mono); }
    button { min-height: 2.75rem; padding: .5rem; color: var(--color-ink); background: transparent; border: 1px solid var(--color-border-strong); cursor: pointer; }
    .preview-body { padding: clamp(1rem, 4vw, 2.5rem); }
    .eyebrow, .scope { font: .75rem/1.5 var(--font-mono); color: var(--color-ink-muted); }
    h2 { font-size: clamp(1.8rem, 5vw, 3rem); letter-spacing: -.05em; line-height: 1.05; margin-block: 1rem; }
    .summary { font: 1.2rem/1.5 var(--font-serif); }
    section { margin-block: 2rem; border-top: 1px solid var(--color-border-strong); padding-top: 1rem; }
    h3 { font: 500 1.4rem/1.2 var(--font-serif); }
    section p { line-height: 1.75; }
    .read-link { display: inline-flex; align-items: center; min-height: 2.75rem; padding: .75rem; background: var(--color-ink); color: white; margin-top: 1rem; }
  `,
})
export class AtlasReadingPreviewComponent {
  readonly entry = inject<EditorialEntry>(DIALOG_DATA);
  readonly path = getEntryPath(this.entry.type, this.entry.slug);
  private readonly dialogRef = inject(DialogRef);
  close(): void { this.dialogRef.close(); }
}

@Directive({ selector: 'button[appReadingPreview]', standalone: true, host: { '[attr.aria-haspopup]': '"dialog"' } })
export class AtlasReadingPreviewDirective {
  readonly entry = input.required<EditorialEntry>({ alias: 'appReadingPreview' });
  private readonly dialog = inject(Dialog);
  @HostListener('click', ['$event'])
  open(event: MouseEvent): void {
    this.dialog.open(AtlasReadingPreviewComponent, {
      data: this.entry(), ariaLabelledBy: 'preview-title', autoFocus: 'first-tabbable',
      restoreFocus: true, width: 'min(44rem, calc(100vw - 2rem))', maxWidth: '100vw',
      panelClass: event.detail ? 'atlas-preview-panel' : 'atlas-preview-panel--instant',
    });
  }
}
