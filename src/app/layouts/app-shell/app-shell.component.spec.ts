import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '@app/app.routes';

import { AppComponent } from './app-shell.component';

describe('ATLAS three-page scope', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter(routes), { provide: PLATFORM_ID, useValue: 'server' }],
    }),
  );
  it('keeps shell links inside the three available pages', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    for (const a of root.querySelectorAll<HTMLAnchorElement>('a[href]'))
      expect(['/', '/marxismo', '/liberalismo']).toContain(a.pathname);
  });
  it('redirects a removed page to the home', async () => {
    const h = await RouterTestingHarness.create('/sobre');
    expect(TestBed.inject(Router).url).toBe('/');
    expect(h.routeNativeElement?.textContent).toContain('Tudo');
  });
  it('searches only available readings without navigating away', async () => {
    const h = await RouterTestingHarness.create('/');
    const root = h.routeNativeElement as HTMLElement;
    const input = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'liberalismo';
    input.dispatchEvent(new Event('input'));
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    h.detectChanges();
    const results = root.querySelector('[aria-label="Resultados da busca"]');
    expect(results?.querySelector('a[href="/liberalismo"]')).not.toBeNull();
    expect(results?.querySelector('a[href="/marxismo"]')).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/');
  });
});
