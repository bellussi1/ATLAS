import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AtlasEditorialLinkDirective,
  AtlasHeadingDirective,
  AtlasTextFieldComponent,
} from '../shared/ui-primitives';

@Component({
  selector: 'app-home-page',
  imports: [AtlasEditorialLinkDirective, AtlasHeadingDirective, AtlasTextFieldComponent, RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  readonly query = signal('');
  private readonly router = inject(Router);
  search(event: Event): void {
    event.preventDefault();
    void this.router.navigate(['/conhecimento'], { queryParams: { q: this.query().trim() || null } });
  }
}
