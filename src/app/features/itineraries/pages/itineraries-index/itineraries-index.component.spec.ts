import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideContentFixture } from '@testing/content-fixture';

import { ItinerariesIndexComponent } from './itineraries-index.component';

describe('ItinerariesIndexComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ItinerariesIndexComponent],
      providers: [provideRouter([]), provideHttpClient(), ...provideContentFixture()],
    });
  });

  it('shows an honest empty state when no verified itineraries exist yet', async () => {
    const fixture = TestBed.createComponent(ItinerariesIndexComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Itinerários');
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(root.querySelector('.itineraries__empty')?.textContent).toContain(
        'Nenhum itinerário verificado foi publicado ainda',
      );
    });
  });
});
