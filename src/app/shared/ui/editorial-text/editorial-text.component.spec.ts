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
  it('preserves the text and links at most two distinct, whole-word destinations', () => {
    const fixture = TestBed.createComponent(AtlasEditorialTextComponent);
    const text = 'O contexto e as fontes sustentam a metodologia. Contexto contextualizado.';
    fixture.componentRef.setInput('text', text);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toBe(text);
    const links = root.querySelectorAll<HTMLAnchorElement>('a');
    expect(links).toHaveLength(2);
    expect(links[0].textContent).toBe('contexto');
    expect(links[0].getAttribute('href')).toBe('/explorar/artigo/conhecimento-com-contexto');
    expect(links[1].getAttribute('href')).toBe('/verbete/metodologia-do-atlas#section-0');
  });
  it('does not link substrings or the current page', () => {
    const fixture = TestBed.createComponent(AtlasEditorialTextComponent);
    fixture.componentRef.setInput('text', 'Contextualizado: contexto e evidência.');
    fixture.componentRef.setInput('currentPath', '/explorar/artigo/conhecimento-com-contexto');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('a')).toHaveLength(1);
    expect((fixture.nativeElement as HTMLElement).querySelector('a')?.textContent).toBe(
      'evidência',
    );
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
