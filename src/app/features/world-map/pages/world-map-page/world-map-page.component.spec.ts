import { provideHttpClient } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideContentFixture } from '@testing/content-fixture';

import { WorldMapPageComponent } from './world-map-page.component';

describe('WorldMapPageComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'mapa', component: WorldMapPageComponent },
          { path: 'verbete/:slug', children: [] },
          { path: 'grafos', children: [] },
          { path: 'leitura/:slug', children: [] },
          { path: 'itinerario/:slug', children: [] },
        ]),
        provideHttpClient(),
        ...provideContentFixture(),
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    }),
  );

  it('renders Natural Earth vector map, 7 relation families, and public attributions', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/mapa', WorldMapPageComponent);
    const root = harness.routeNativeElement as HTMLElement;

    expect(root.querySelector('h1')?.textContent).toContain('Mapa-múndi');
    expect(root.querySelector('svg.map-svg')).not.toBeNull();
    expect(root.querySelectorAll('path.map-country').length).toBeGreaterThanOrEqual(170);
    expect(root.querySelectorAll('#map-legend .legend-item').length).toBe(7);
    expect(root.querySelector('footer.map-attribution')?.textContent).toContain('Natural Earth');
    expect(root.querySelector('footer.map-attribution')?.textContent).toContain('Wikidata');
  });

  it('opens /mapa?pais=brasil on Study Desk with Brazil profile and regimes', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/mapa?pais=brasil', WorldMapPageComponent);
    const root = harness.routeNativeElement as HTMLElement;
    const desk = root.querySelector('#map-study-desk');

    expect(desk?.textContent).toContain('Brasil');
    expect(desk?.textContent).toContain('Regimes políticos');
    expect(desk?.textContent).toContain('Constituição');
    expect(desk?.querySelector('a[href="/verbete/brasil"]')).not.toBeNull();
    expect(desk?.querySelector('a[href^="/grafos"]')).not.toBeNull();
  });

  it('filters by period 1914-1945, displays reference border notice, and discloses undated items', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/mapa', WorldMapPageComponent);
    const root = harness.routeNativeElement as HTMLElement;

    const btn = [...root.querySelectorAll<HTMLButtonElement>('.map-preset-btn')].find((el) =>
      el.textContent?.includes('1914–1945'),
    );
    expect(btn).toBeDefined();
    btn!.click();
    harness.detectChanges();

    expect(root.querySelector('.map-border-notice')?.textContent).toContain(
      'contornos contemporâneos de referência',
    );
    expect(root.querySelector('.timeline-undated__count')?.textContent).toContain(
      'sem datação estrita estão ocultos',
    );
  });

  it('highlights legend family on hover/focus and triggers surprise exploration', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/mapa', WorldMapPageComponent);
    const root = harness.routeNativeElement as HTMLElement;

    const firstRow = root.querySelector<HTMLElement>('#map-legend .legend-row');
    firstRow?.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    harness.detectChanges();
    expect(component.hoveredFamilyId()).not.toBeNull();

    firstRow?.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    harness.detectChanges();
    expect(component.hoveredFamilyId()).toBeNull();

    root.querySelector<HTMLButtonElement>('.map-surprise-btn')!.click();
    harness.detectChanges();
    expect(component.selectedTerritoryId()).not.toBeNull();
    expect(root.querySelector('#map-study-desk')?.textContent).toContain('Abrir verbete');
  });

  it('exposes territories in #lista-acessivel and focuses on button click', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/mapa', WorldMapPageComponent);
    const root = harness.routeNativeElement as HTMLElement;

    const details = root.querySelector<HTMLDetailsElement>('#lista-acessivel details');
    expect(details).not.toBeNull();
    const firstFocusBtn = details!.querySelector<HTMLButtonElement>('.table-action-btn');
    expect(firstFocusBtn).not.toBeNull();
    firstFocusBtn!.click();
    harness.detectChanges();

    expect(component.selectedTerritoryId()).not.toBeNull();
  });
});
