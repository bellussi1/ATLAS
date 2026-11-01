import { Dialog } from '@angular/cdk/dialog';
import { Directive, HostListener, inject, input } from '@angular/core';
import { type EditorialEntry } from '@core/content/editorial/content-types';
import { AtlasReadingPreviewComponent } from '@shared/ui/reading-preview/reading-preview.component';

@Directive({
  selector: 'button[appReadingPreview]',
  standalone: true,
  host: { '[attr.aria-haspopup]': '"dialog"' },
})
export class AtlasReadingPreviewDirective {
  readonly entry = input.required<EditorialEntry>({ alias: 'appReadingPreview' });
  private readonly dialog = inject(Dialog);
  @HostListener('click', ['$event'])
  open(event: MouseEvent): void {
    this.dialog.open(AtlasReadingPreviewComponent, {
      data: this.entry(),
      ariaLabelledBy: 'preview-title',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      width: 'min(44rem, calc(100vw - 2rem))',
      maxWidth: '100vw',
      panelClass: event.detail ? 'atlas-preview-panel' : 'atlas-preview-panel--instant',
    });
  }
}
