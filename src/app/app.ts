import { AtlasEditorialMarkComponent } from './shared/editorial-mark';
import { DOCUMENT } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreadcrumbsComponent } from './shared/breadcrumbs';
import { AtlasMenuComponent } from './shared/ui-primitives';

@Component({
  selector: 'app-root',
  imports: [AtlasEditorialMarkComponent, AtlasMenuComponent, BreadcrumbsComponent, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class AppComponent {
  private readonly document = inject(DOCUMENT);
  readonly composition = signal(0);
  readonly instantComposition = signal(false);
  changeComposition(event: MouseEvent): void {
    this.instantComposition.set(!event.detail);
    this.composition.update(value => (value + 1) % 3);
  }

  focusMainContent(): void {
    this.document.getElementById('conteudo')?.focus();
  }
}
