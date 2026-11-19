import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

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

  it('navigates to a matching reading via Surpreenda-me', () => {
    TestBed.configureTestingModule({
      imports: [ReadingsIndexComponent],
      providers: [provideRouter([])],
    });
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ReadingsIndexComponent);
    fixture.detectChanges();

    fixture.componentInstance.query.set('marxismo');
    fixture.detectChanges();

    const surprise = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button.filter-chip--surprise',
    );
    expect(surprise?.textContent).toContain('Surpreenda-me');
    surprise?.click();
    expect(navSpy).toHaveBeenCalledWith('/leitura/marxismo');
  });
});
