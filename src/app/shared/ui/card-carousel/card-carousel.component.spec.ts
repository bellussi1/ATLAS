import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CardCarouselComponent } from './card-carousel.component';

@Component({
  imports: [CardCarouselComponent],
  template: `
    <app-card-carousel label="Fichas de teste">
      @for (item of items; track item) {
        <button type="button" class="carousel-item">{{ item }}</button>
      }
    </app-card-carousel>
  `,
})
class CarouselHostComponent {
  readonly items = ['Locke', 'Hobbes', 'Hume'];
}

describe('CardCarouselComponent', () => {
  it('exposes the projected cards as one named scroll region', async () => {
    const fixture = TestBed.createComponent(CarouselHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const region = element.querySelector<HTMLElement>('[role="region"]');
    expect(region?.getAttribute('aria-label')).toBe('Fichas de teste');
    expect(region?.querySelectorAll('.carousel-item')).toHaveLength(3);
    expect(element.querySelector('.carousel-count')?.textContent).toContain('de 3');
  });

  it('keeps the previous control unavailable before the track has been scrolled', () => {
    const fixture = TestBed.createComponent(CarouselHostComponent);
    fixture.detectChanges();
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
      '.carousel-button',
    );
    expect(buttons[0]?.getAttribute('aria-disabled')).toBe('true');
  });
});
