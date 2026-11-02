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

describe('ReadingPathComponent', () => {
  const setup = () => {
    const fixture = TestBed.createComponent(ReadingPathComponent);
    fixture.componentRef.setInput('works', [
      work('Panorama', 'introdutório', 'Panorama', 'introdução'),
      work('Clássico', 'intermediário', 'Economia'),
      work('Tratado', 'avançado', 'Economia'),
    ]);
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  };

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

  it('dims works outside the chosen theme without removing them and reports the count', () => {
    const { fixture, root } = setup();
    root.querySelector<HTMLButtonElement>('.theme-filter button:nth-of-type(2)')!.click();
    fixture.detectChanges();
    expect(root.querySelectorAll('.work')).toHaveLength(3);
    expect(root.querySelectorAll('.work.is-dimmed')).toHaveLength(1);
    expect(root.querySelector('.filter-count')?.textContent).toContain('2 de 3');
  });
});
