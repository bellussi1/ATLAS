import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app';
import { routes as appRoutes } from './app.routes';

describe('ATLAS application', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter(appRoutes)],
    }).compileComponents();
  });

  it('introduces the project and keeps search visibly inactive', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent?.replace(/\s+/g, ' ')).toContain(
      'Compreender o mundo',
    );
    expect(root.textContent).toContain('história, política, economia e sociedade');
    expect(root.querySelector('[role="search"] input')?.hasAttribute('readonly')).toBe(true);
    expect(root.textContent).toContain('A busca ainda não está disponível');
  });

  it('offers the three distinct starting points', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();

    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('[data-entry]'),
      (entry) => entry.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(labels).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Entender uma dúvida'),
        expect.stringContaining('Explorar a história'),
        expect.stringContaining('Seguir uma trilha'),
      ]),
    );
  });

  it.each([
    ['/explorar', 'Explorar a história'],
    ['/estudar', 'Seguir uma trilha'],
    ['/sobre', 'Sobre o ATLAS'],
    ['/rota-inexistente', 'Esta página não existe'],
  ])('renders the right page at %s', async (url, heading) => {
    const harness = await RouterTestingHarness.create(url);
    expect(harness.routeNativeElement?.textContent).toContain(heading);
  });
});
