import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject } from '@angular/core';
import type { DiscoveryIndexEntry } from '@core/content/queries/discovery-index';

export interface DiscoveryPreviewTarget {
  entry: DiscoveryIndexEntry;
  origin: string;
}

@Component({
  selector: 'app-discovery-preview',
  imports: [],
  templateUrl: './discovery-preview.component.html',
  styleUrl: './discovery-preview.component.scss',
})
export class AtlasDiscoveryPreviewComponent {
  readonly target = inject<DiscoveryPreviewTarget>(DIALOG_DATA);
  private readonly dialogRef = inject(DialogRef);
  close(): void {
    this.dialogRef.close();
  }
}
