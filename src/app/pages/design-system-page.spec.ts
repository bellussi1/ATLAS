import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { DesignSystemPage } from './design-system-page';

describe('design-system showroom', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DesignSystemPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('uses a native disclosure element with an operable summary', () => {
    const fixture = TestBed.createComponent(DesignSystemPage);
    fixture.detectChanges();
    const details = (fixture.nativeElement as HTMLElement).querySelector('details')!;

    expect(details.open).toBe(false);
    details.querySelector('summary')?.click();
    expect(details.open).toBe(true);
  });

  it('associates field error text and marks the invalid control', () => {
    const fixture = TestBed.createComponent(DesignSystemPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const field = Array.from(root.querySelectorAll<HTMLInputElement>('input'))
      .find((candidate) => candidate.id === 'demo-email')!;

    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(field.getAttribute('aria-describedby')).toContain('demo-email-error');
    expect(root.querySelector('#demo-email-error')?.textContent).toContain('Revise o endereço');
    expect(root.querySelectorAll('#demo-email')).toHaveLength(1);
    expect(root.querySelector('label[for="demo-email"]')?.getAttribute('for')).toBe(field.id);
  });

  it('announces the success state after the example action', () => {
    const fixture = TestBed.createComponent(DesignSystemPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    Array.from(root.querySelectorAll<HTMLButtonElement>('app-button button'))
      .find((button) => button.textContent?.includes('Mostrar feedback'))?.click();
    fixture.detectChanges();

    expect(root.querySelector('.atlas-notice--success[role="status"]')?.textContent)
      .toContain('Ação demonstrativa concluída');
  });
});
