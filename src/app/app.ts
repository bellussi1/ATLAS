import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreadcrumbsComponent } from './shared/breadcrumbs';
import { AtlasMenuComponent } from './shared/ui-primitives';

@Component({
  selector: 'app-root',
  imports: [AtlasMenuComponent, BreadcrumbsComponent, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class AppComponent {
  private readonly document = inject(DOCUMENT);

  focusMainContent(): void {
    this.document.getElementById('conteudo')?.focus();
  }
}
