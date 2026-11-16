import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ReadingsIndexComponent } from './readings-index.component';

describe('ReadingsIndexComponent', () => {
  it('lists readings and filters by query and editorial status', () => {
    TestBed.configureTestingModule({
      imports: [ReadingsIndexComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(ReadingsIndexComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent).toContain('Leituras contínuas');
    expect(root.querySelectorAll('.reading-card').length).toBeGreaterThanOrEqual(4);

    fixture.componentInstance.query.set('marxismo');
    fixture.detectChanges();
    expect(root.querySelectorAll('.reading-card').length).toBe(1);

    fixture.componentInstance.clearFilters();
    fixture.componentInstance.setFilter('draft');
    fixture.detectChanges();
    expect(root.querySelectorAll('.reading-card').length).toBeGreaterThanOrEqual(1);
  });
});
