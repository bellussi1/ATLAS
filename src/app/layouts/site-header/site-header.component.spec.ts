import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { SiteHeaderComponent } from './site-header.component';

describe('SiteHeaderComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [SiteHeaderComponent],
      providers: [
        provideRouter([
          { path: '', children: [] },
          { path: 'marxismo', children: [] },
          { path: 'conhecimento', children: [] },
        ]),
      ],
    }),
  );

  it('names each entry with its verb and marks the current section', async () => {
    const fixture = TestBed.createComponent(SiteHeaderComponent);
    await TestBed.inject(Router).navigateByUrl('/marxismo');
    fixture.detectChanges();
    const doors = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>(
        '.graphic-door',
      ),
    ];
    expect(doors.map((door) => door.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Ler Marxismo ↗',
      'Percorrer Liberalismo ↗',
      'Buscar Acervo ↗',
    ]);
    expect(doors[0].getAttribute('aria-current')).toBe('page');
    expect(doors[1].hasAttribute('aria-current')).toBe(false);
  });

  it('closes the small-screen menu with Escape and returns focus to its toggle', () => {
    const fixture = TestBed.createComponent(SiteHeaderComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const toggle = root.querySelector<HTMLButtonElement>('.menu-toggle')!;
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('.graphic-doors')!.classList.contains('is-open')).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
  });

  it('closes the menu on a pointer press outside the header', () => {
    const fixture = TestBed.createComponent(SiteHeaderComponent);
    fixture.detectChanges();
    const toggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.menu-toggle',
    )!;
    toggle.click();
    fixture.detectChanges();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});
