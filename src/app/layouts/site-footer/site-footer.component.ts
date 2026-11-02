import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AtlasEditorialMarkComponent } from '@shared/ui/editorial-mark/editorial-mark.component';

@Component({
  selector: 'app-site-footer',
  imports: [AtlasEditorialMarkComponent, RouterLink],
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.scss',
})
export class SiteFooterComponent {
  readonly composition = signal(0);
  readonly instantComposition = signal(false);

  changeComposition(event: MouseEvent): void {
    this.instantComposition.set(!event.detail);
    this.composition.update((value) => (value + 1) % 3);
  }
}
