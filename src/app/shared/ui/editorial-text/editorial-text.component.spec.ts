import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AtlasEditorialTextComponent } from './editorial-text.component';

describe('editorial keyword navigation', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [AtlasEditorialTextComponent],
      providers: [provideRouter([])],
    }),
  );
  it('preserves the text and each whole-word destination once', () => {
    const fixture = TestBed.createComponent(AtlasEditorialTextComponent);
    const text = 'As fontes e a evidência sustentam a metodologia. Fontografia contextualizada.';
    fixture.componentRef.setInput('text', text);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toBe(text);
    const links = root.querySelectorAll<HTMLAnchorElement>('a');
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toBe('fontes');
    expect(links[0].getAttribute('href')).toBe('/verbete/metodologia-do-atlas#section-0');
  });
  it('does not link substrings or the current page', () => {
    const fixture = TestBed.createComponent(AtlasEditorialTextComponent);
    fixture.componentRef.setInput('text', 'Fontografia: metodologia e evidência.');
    fixture.componentRef.setInput('currentPath', '/verbete/metodologia-do-atlas');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('a')).toHaveLength(0);
  });
  it('uses the inverse treatment on a strong surface', () => {
    const fixture = TestBed.createComponent(AtlasEditorialTextComponent);
    fixture.componentRef.setInput('text', 'Consulte as fontes.');
    fixture.componentRef.setInput('inverse', true);
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('a')?.classList.contains('inverse'),
    ).toBe(true);
  });
});
