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
          { path: 'leitura/marxismo', children: [] },
          { path: 'acervo', children: [] },
          { path: 'grafos', children: [] },
        ]),
      ],
    }),
  );

  const links = (root: HTMLElement) =>
    [...root.querySelectorAll<HTMLAnchorElement>('.nav__link')].map((a) =>
      a.textContent?.replace(/\s+/g, ' ').trim(),
    );

  it('links the logo to the home page and lists the main destinations', () => {
    const fixture = TestBed.createComponent(SiteHeaderComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('a.brand')?.getAttribute('href')).toBe('/');
    expect(root.querySelector('a.brand img')?.getAttribute('src')).toBe('/brand/atlas-logo.svg');
    expect(links(root)).toEqual(['Leituras', 'Acervo', 'Grafo', 'Como usar']);
    expect(root.querySelector('a[href="/grafos"]')).not.toBeNull();
    expect(root.querySelector('a[href="/acervo"]')).not.toBeNull();
  });

  it('opens the readings menu with the four continuous readings', () => {
    const fixture = TestBed.createComponent(SiteHeaderComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const button = root.querySelector<HTMLButtonElement>('.nav__link--button')!;
    expect(button.getAttribute('aria-expanded')).toBe('false');
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(
      [...root.querySelectorAll<HTMLAnchorElement>('.readings-menu a')].map((a) =>
        a.getAttribute('href'),
      ),
    ).toEqual([
      '/leitura/marxismo',
      '/leitura/liberalismo',
      '/leitura/social-democracia',
      '/leitura/anarquismo',
    ]);
  });

  it('marks the current section: a reading, the archive or the network', async () => {
    const fixture = TestBed.createComponent(SiteHeaderComponent);
    const router = TestBed.inject(Router);
    const root = fixture.nativeElement as HTMLElement;
    await router.navigateByUrl('/leitura/marxismo');
    fixture.detectChanges();
    expect(root.querySelector('.nav__link--button')?.classList.contains('is-active')).toBe(true);
    await router.navigateByUrl('/grafos');
    fixture.detectChanges();
    expect(root.querySelector('a[href="/grafos"]')?.getAttribute('aria-current')).toBe('page');
    await router.navigateByUrl('/acervo');
    fixture.detectChanges();
    expect(root.querySelector('a[href="/acervo"].nav__link')?.getAttribute('aria-current')).toBe(
      'page',
    );
  });

  it('searches the archive from the header', async () => {
    const fixture = TestBed.createComponent(SiteHeaderComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const input = root.querySelector<HTMLInputElement>('#header-search')!;
    input.value = 'liberalismo';
    input.dispatchEvent(new Event('input'));
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/acervo?q=liberalismo');
  });

  it('closes the small-screen menu with Escape and returns focus to its toggle', () => {
    const fixture = TestBed.createComponent(SiteHeaderComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const toggle = root.querySelector<HTMLButtonElement>('.menu-toggle')!;
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('.panel')!.classList.contains('is-open')).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
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
