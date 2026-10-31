import { DialogModule } from '@angular/cdk/dialog';
import { AtlasReadingPreviewDirective } from '../shared/reading-preview';
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
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
  imports: [AtlasEditorialLinkDirective, AtlasHeadingDirective, AtlasTextFieldComponent, AtlasReadingPreviewDirective, DialogModule, RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  readonly query = signal('');
  readonly atlas = inject(ContentRepository).atlas;
  readonly readings = editorialEntries.filter(entry => entry.status === 'exemplar');
  readonly entryPath = getEntryPath;
  readonly selected = signal(this.readings[0]);
  readonly sheet = viewChild<ElementRef<HTMLElement>>('sheet');
  private selectionMotion?: Animation;
  selectSlug(slug: string): void {
    const entry = this.readings.find(item => item.slug === slug);
    if (entry) { this.selectionMotion?.cancel(); this.selected.set(entry); }
  }
  select(entry: (typeof this.readings)[number], event: MouseEvent): void {
    this.selectionMotion?.cancel();
    this.selected.set(entry);
    const element = this.sheet()?.nativeElement;
    if (!element || typeof element.animate !== 'function' || !event.detail || element.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tokens = element.ownerDocument.defaultView!.getComputedStyle(element);
    this.selectionMotion = element.animate([{ opacity: .45 }, { opacity: 1 }], { duration: parseFloat(tokens.getPropertyValue('--motion-selection')) || 180, easing: tokens.getPropertyValue('--ease-out').trim() || 'cubic-bezier(0.23, 1, 0.32, 1)' });
  }
  private readonly router = inject(Router);
  search(event: Event): void {
    event.preventDefault();
    void this.router.navigate(['/conhecimento'], { queryParams: { q: this.query().trim() || null } });
  }
}
