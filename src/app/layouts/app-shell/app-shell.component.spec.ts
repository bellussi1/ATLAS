import { provideHttpClient } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '@app/app.routes';
import { provideContentFixture } from '@testing/content-fixture';

import { AppComponent } from './app-shell.component';

describe('ATLAS navigation', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        ...provideContentFixture(),
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    }),
  );
  it('makes the knowledge explorer reachable from the shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    for (const a of root.querySelectorAll<HTMLAnchorElement>('a[href]'))
      expect(['/', '/marxismo', '/liberalismo', '/conhecimento']).toContain(a.pathname);
    expect(root.querySelector('header a[href="/conhecimento"]')).not.toBeNull();
  });
  it('redirects a removed page to the home', async () => {
    const h = await RouterTestingHarness.create('/sobre');
    expect(TestBed.inject(Router).url).toBe('/');
    expect(h.routeNativeElement?.textContent).toContain('Tudo');
  });
  it('opens universal search with the query from home', async () => {
    const h = await RouterTestingHarness.create('/');
    const root = h.routeNativeElement as HTMLElement;
    const input = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'liberalismo';
    input.dispatchEvent(new Event('input'));
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await h.fixture.whenStable();
    h.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/conhecimento?q=liberalismo');
    expect(h.routeNativeElement?.querySelector('h1')?.textContent).toBe('Conhecimento');
  });
});
