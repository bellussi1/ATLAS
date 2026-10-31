import { Component, inject, signal } from '@angular/core';
import { AtlasEvidenceNetworkComponent } from '../shared/evidence-network';
import { ContentRepository } from '../core/content-repository';
import { editorialEntries, getEntryPath } from '../content/editorial-entries';
import { Router, RouterLink } from '@angular/router';
import {
  AtlasEditorialLinkDirective,
  AtlasHeadingDirective,
  AtlasTextFieldComponent,
} from '../shared/ui-primitives';

@Component({
  selector: 'app-home-page',
  imports: [AtlasEditorialLinkDirective, AtlasHeadingDirective, AtlasTextFieldComponent, AtlasEvidenceNetworkComponent, RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  readonly query = signal('');
  readonly atlas = inject(ContentRepository).atlas;
  readonly readings = editorialEntries.filter(entry => entry.status === 'exemplar');
  readonly entryPath = getEntryPath;
  private readonly router = inject(Router);
  search(event: Event): void {
    event.preventDefault();
    void this.router.navigate(['/conhecimento'], { queryParams: { q: this.query().trim() || null } });
  }
}
