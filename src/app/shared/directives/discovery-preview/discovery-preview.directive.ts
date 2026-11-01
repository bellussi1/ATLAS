import { Dialog } from '@angular/cdk/dialog';
import { Directive, HostListener, inject, input } from '@angular/core';
import type { DiscoveryPreviewTarget } from '@shared/ui/discovery-preview/discovery-preview.component';
import { AtlasDiscoveryPreviewComponent } from '@shared/ui/discovery-preview/discovery-preview.component';

@Directive({
  selector: 'button[appDiscoveryPreview]',
  standalone: true,
  host: { '[attr.aria-haspopup]': '"dialog"' },
})
export class AtlasDiscoveryPreviewDirective {
  readonly target = input.required<DiscoveryPreviewTarget>({ alias: 'appDiscoveryPreview' });
  private readonly dialog = inject(Dialog);
  @HostListener('click', ['$event'])
  open(event: MouseEvent): void {
    this.dialog.open(AtlasDiscoveryPreviewComponent, {
      data: this.target(),
      ariaLabelledBy: 'discovery-preview-title',
      autoFocus: 'first-tabbable',
      restoreFocus: event.currentTarget as HTMLElement,
      width: 'min(44rem, calc(100vw - 2rem))',
      maxWidth: '100vw',
      panelClass: event.detail ? 'atlas-preview-panel' : 'atlas-preview-panel--instant',
    });
  }
}
