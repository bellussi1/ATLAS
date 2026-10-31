import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app';

describe('page entrance motion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function setup(reduced = false) {
    TestBed.configureTestingModule({ imports: [AppComponent], providers: [provideRouter([])] });
    vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const cancel = vi.fn();
    const animate = vi.fn(() => ({ cancel }));
    Object.defineProperty(fixture.nativeElement.querySelector('main'), 'animate', {
      value: animate,
      configurable: true,
    });
    return { fixture, animate, cancel, app: fixture.componentInstance };
  }

  it('keeps initial rendering and keyboard navigation immediate', () => {
    const { app, animate } = setup();
    app.transitionPage();
    app.transitionPage();
    expect(animate).not.toHaveBeenCalled();
  });

  it('animates pointer navigation and cancels it when interrupted', () => {
    const { app, animate, cancel, fixture } = setup();
    app.transitionPage();
    app.instantNavigation = false;
    app.transitionPage();
    expect(animate).toHaveBeenCalledOnce();
    app.transitionPage();
    expect(cancel).toHaveBeenCalledOnce();
    fixture.destroy();
    expect(cancel).toHaveBeenCalledTimes(2);
  });

  it('respects reduced motion for pointer navigation', () => {
    const { app, animate } = setup(true);
    app.transitionPage();
    app.instantNavigation = false;
    app.transitionPage();
    expect(animate).not.toHaveBeenCalled();
  });
});
