import { TestBed } from '@angular/core/testing';

import { EditorialSourcesComponent } from './editorial-sources.component';

describe('Shared editorial sources', () => {
  it('preserves editions and evidence locators without creating links for references without a URL', () => {
    const fixture = TestBed.createComponent(EditorialSourcesComponent);
    fixture.componentRef.setInput('references', [
      {
        id: 'book',
        title: 'Obra consultada',
        url: null,
        edition: 'Edição de 1867',
        locator: 'Capítulo 1',
      },
      { id: 'web', title: 'Acervo digital', url: 'https://example.org/source' },
    ]);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('li')).toHaveLength(2);
    expect(root.querySelectorAll('a')).toHaveLength(1);
    expect(root.textContent).toContain('Edição de 1867');
    expect(root.textContent).toContain('Capítulo 1');
    expect(root.querySelector('a')?.hasAttribute('target')).toBe(false);
    fixture.componentRef.setInput('variant', 'inline');
    fixture.componentRef.setInput('newWindow', true);
    fixture.detectChanges();
    expect(root.querySelector('a')?.getAttribute('target')).toBe('_blank');
    expect(root.querySelector('a')?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(root.textContent).toContain('Capítulo 1');
  });

  it('explains an empty bibliography using the caller’s editorial message', () => {
    const fixture = TestBed.createComponent(EditorialSourcesComponent);
    fixture.componentRef.setInput('references', []);
    fixture.componentRef.setInput('emptyText', 'Apague o filtro para ver a bibliografia.');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain(
      'Apague o filtro',
    );
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
  });

  it('folds a long list after the limit and expands it on demand', () => {
    const fixture = TestBed.createComponent(EditorialSourcesComponent);
    fixture.componentRef.setInput(
      'references',
      Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, title: `Fonte ${i}`, url: null })),
    );
    fixture.componentRef.setInput('limit', 8);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('li')).toHaveLength(8);
    const toggle = root.querySelector<HTMLButtonElement>('.sources-more')!;
    expect(toggle.textContent).toContain('Ver todas (12)');
    expect(toggle.getAttribute('aria-controls')).toBe(root.querySelector('ul')?.id);
    toggle.click();
    fixture.detectChanges();
    expect(root.querySelectorAll('li')).toHaveLength(12);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('groups identical visible references but keeps a different locator or edition', () => {
    const fixture = TestBed.createComponent(EditorialSourcesComponent);
    const base = {
      title: 'Obra consultada',
      url: null,
      edition: 'Edição de 1867',
      locator: 'Capítulo 1',
    };
    fixture.componentRef.setInput('references', [
      { ...base, id: 'a' },
      { ...base, id: 'b' },
      { ...base, id: 'c', locator: 'Capítulo 2' },
      { ...base, id: 'd', edition: 'Edição de 1900' },
    ]);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('li')).toHaveLength(3);
    expect(root.textContent).toContain('Capítulo 1');
    expect(root.textContent).toContain('Capítulo 2');
    expect(root.textContent).toContain('Edição de 1900');
  });
});
