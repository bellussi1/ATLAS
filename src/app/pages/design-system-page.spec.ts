import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DesignSystemPage } from './design-system-page';
import { AtlasHeadingDirective } from '../shared/ui-primitives';

@Component({
  imports: [AtlasHeadingDirective],
  template: '<h1 appHeading="page">Título de página</h1><h2 appHeading>Título padrão</h2>',
})
class PageHeadingExample {}

describe('design-system showroom', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DesignSystemPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('applies the page heading scale to explicit and default variants', () => {
    const fixture = TestBed.createComponent(PageHeadingExample);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.atlas-heading--page')).toHaveLength(2);
  });

  it('uses a native disclosure element with an operable summary', () => {
    const fixture = TestBed.createComponent(DesignSystemPage);
    fixture.detectChanges();
    const details = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLDetailsElement>('app-disclosure details')!;

    expect(details.open).toBe(false);
    details.querySelector('summary')?.click();
    expect(details.open).toBe(true);
  });

  it('renders a separate heading-based content summary', () => {
    const fixture = TestBed.createComponent(DesignSystemPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const summary = root.querySelector('app-content-summary');

    expect(summary?.querySelector('h2')?.textContent?.trim()).toBe('Resumo');
    expect(summary?.textContent).toContain('condensa a ideia principal');
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

  it('moves focus to the section selected in the showroom index', () => {
    const fixture = TestBed.createComponent(DesignSystemPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const link = Array.from(root.querySelectorAll<HTMLAnchorElement>('.showroom__toc a'))
      .find((candidate) => candidate.textContent?.trim() === 'Tokens')!;
    link.click();
    expect(document.activeElement).toBe(root.querySelector('#tokens'));
  });

  it('keeps the readonly example focusable and available for copying', () => {
    const fixture = TestBed.createComponent(DesignSystemPage);
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#demo-readonly')!;
    input.focus();
    expect(input.readOnly).toBe(true);
    expect(input.disabled).toBe(false);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('Texto consultável');
  });
});
