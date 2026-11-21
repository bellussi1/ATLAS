import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TourService } from '@shared/ui/tour/tour.service';

@Component({
  selector: 'app-cookies-page',
  imports: [RouterLink],
  templateUrl: './cookies-page.component.html',
  styleUrl: './cookies-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookiesPageComponent {
  private readonly tour = inject(TourService);
  protected readonly cleared = signal(false);

  protected resetTours(): void {
    this.tour.resetAll();
    this.cleared.set(true);
  }
}
