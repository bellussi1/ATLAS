import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type EditorialEntry } from '@core/content/editorial/content-types';
import { getEntryPath } from '@core/content/editorial/editorial-entries';

@Component({
  selector: 'app-reading-preview',
  imports: [RouterLink],
  templateUrl: './reading-preview.component.html',
  styleUrl: './reading-preview.component.scss',
})
export class AtlasReadingPreviewComponent {
  readonly entry = inject<EditorialEntry>(DIALOG_DATA);
  readonly path = getEntryPath(this.entry.type, this.entry.slug);
  private readonly dialogRef = inject(DialogRef);
  close(): void {
    this.dialogRef.close();
  }
}
