import { TestBed } from '@angular/core/testing';

import { ReadingPathComponent } from './reading-path.component';

const work = (title: string, level: string, theme: string, kind: string | null = 'primária') => ({
  title,
  author: 'Autor',
  year: '1900',
  edition: 'Edição original',
  level,
  theme,
  why: `Por que ler ${title}`,
  kind,
  entityId: null,
});

const defaultWorks = [
  work('Panorama', 'introdutório', 'Panorama', 'introdução'),
  work('Clássico', 'intermediário', 'Economia'),
  work('Tratado', 'avançado', 'Economia'),
];

describe('ReadingPathComponent', () => {
  const setup = (works = defaultWorks) => {
    const fixture = TestBed.createComponent(ReadingPathComponent);
    fixture.componentRef.setInput('works', works);
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  };

  const text = (element: Element | null) => element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  it('marks the first introductory work and labels primary texts apart from introductions', () => {
    const { root } = setup();
    expect(root.querySelector('.work.is-first .work-title')?.textContent).toBe('Panorama');
    expect([...root.querySelectorAll('.work-kind')].map((k) => k.textContent)).toEqual([
      'introdução',
      'primária',
      'primária',
    ]);
  });

  it('expands one work at a time in place and keeps details hidden until asked', () => {
    const { fixture, root } = setup();
    const toggles = root.querySelectorAll<HTMLButtonElement>('.work-toggle');
    const detail = (i: number) => root.querySelectorAll<HTMLElement>('.work-detail')[i];
    expect(detail(0).hidden).toBe(true);
    toggles[0].click();
    fixture.detectChanges();
    expect(toggles[0].getAttribute('aria-expanded')).toBe('true');
    expect(detail(0).hidden).toBe(false);
    toggles[1].click();
    fixture.detectChanges();
    expect(detail(0).hidden).toBe(true);
    expect(detail(1).textContent).toContain('Por que ler Clássico');
  });

  it('shows theme counts, the total and the complete list of themes', () => {
    const { root } = setup();
    expect(text(root.querySelector('.theme-all'))).toBe('Todos 3');
    expect([...root.querySelectorAll('.quick-themes button')].map(text)).toEqual([
      'Economia 2',
      'Panorama 1',
    ]);
    expect([...root.querySelectorAll('select option')].map(text)).toEqual([
      'Todos os temas (3)',
      'Economia (2)',
      'Panorama (1)',
    ]);
    expect(text(root.querySelector('.filter-count'))).toBe('Todos os temas · 3 obras');
    expect(root.querySelector('.theme-all')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('dims works outside the chosen theme without removing them and reports the count', () => {
    const { fixture, root } = setup();
    const economia = root.querySelector<HTMLButtonElement>('[data-theme="Economia"]')!;
    economia.click();
    fixture.detectChanges();

    expect(root.querySelectorAll('.work')).toHaveLength(3);
    expect(root.querySelectorAll('.work.is-dimmed')).toHaveLength(1);
    expect(text(root.querySelector('.filter-count'))).toBe('Economia · 2 de 3 obras em destaque');
    expect(economia.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('.theme-all')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('clears the theme by the same chip, the Todos chip and the select', () => {
    const { fixture, root } = setup();
    const economia = root.querySelector<HTMLButtonElement>('[data-theme="Economia"]')!;
    const all = root.querySelector<HTMLButtonElement>('.theme-all')!;

    economia.click();
    fixture.detectChanges();
    economia.click();
    fixture.detectChanges();
    expect(root.querySelectorAll('.work.is-dimmed')).toHaveLength(0);
    expect(text(root.querySelector('.filter-count'))).toBe('Todos os temas · 3 obras');

    root.querySelector<HTMLButtonElement>('[data-theme="Panorama"]')!.click();
    fixture.detectChanges();
    expect(root.querySelectorAll('.work.is-dimmed')).toHaveLength(2);
    all.click();
    fixture.detectChanges();
    expect(root.querySelectorAll('.work.is-dimmed')).toHaveLength(0);
    expect(all.getAttribute('aria-pressed')).toBe('true');
  });

  it('filters through the native select and keeps the quick chip in step', () => {
    const { fixture, root } = setup();
    const select = root.querySelector<HTMLSelectElement>('select')!;

    select.value = 'Economia';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(select.value).toBe('Economia');
    expect(root.querySelectorAll('.work.is-dimmed')).toHaveLength(1);
    expect(text(root.querySelector('.filter-count'))).toBe('Economia · 2 de 3 obras em destaque');
    expect(root.querySelector('[data-theme="Economia"]')?.getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('keeps the quick chips bounded and leaves the long tail in the select', () => {
    const many = Array.from({ length: 8 }, (_, index) =>
      work(`Obra ${index}`, 'introdutório', `Tema ${index}`),
    );
    const { root } = setup(many);

    expect(root.querySelectorAll('.quick-themes button')).toHaveLength(6);
    expect(root.querySelector('.theme-select')?.classList).toContain('is-visible');
    expect(root.querySelectorAll('select option')).toHaveLength(9);
    expect(text(root.querySelector('select option:last-child'))).toBe('Tema 7 (1)');
  });

  it('explains that the theme filter only highlights and keeps the path complete', () => {
    const { root } = setup();
    expect(root.querySelector('.path-note')?.textContent).toContain(
      'O filtro de tema não remove obras',
    );
    expect(root.querySelectorAll('.work-toggle')).toHaveLength(3);
  });
});
