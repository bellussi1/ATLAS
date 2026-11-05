import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideContentFixture } from '@testing/content-fixture';
import { vi } from 'vitest';

import { GraphComponent } from './graph.component';

describe('GraphComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ providers: [...provideContentFixture(), provideRouter([])] }),
  );

  async function render() {
    const fixture = TestBed.createComponent(GraphComponent);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.positions()).not.toBeNull());
    fixture.detectChanges();
    return fixture;
  }
  const root = (fixture: { nativeElement: unknown }) => fixture.nativeElement as HTMLElement;

  it('shows a loading state until the layout is ready, then draws nodes', async () => {
    const fixture = TestBed.createComponent(GraphComponent);
    fixture.detectChanges();
    expect(root(fixture).querySelector('.overlay')?.textContent).toContain('Organizando');
    await vi.waitFor(() => expect(fixture.componentInstance.positions()).not.toBeNull());
    fixture.detectChanges();
    expect(root(fixture).querySelector('.overlay')).toBeNull();
    expect(root(fixture).querySelectorAll('[data-node]').length).toBeGreaterThan(0);
  });

  it('names the graph and lists every node type and relation type in the legend', async () => {
    const fixture = await render();
    const el = root(fixture);
    expect(el.querySelector('svg.canvas')?.getAttribute('aria-label')).toContain('Grafo');
    const legend = el.querySelector('#graph-controls')!.textContent!;
    for (const label of [
      'Ideologias',
      'Pessoas',
      'Obras',
      'Organizações',
      'Partidos',
      'Acontecimentos',
      'Lugares',
      'Conceitos',
      'Influenciou',
      'Participou de',
      'Foi membro de',
      'Fundou',
      'Escreveu',
      'Desenvolveu-se em',
      'Reagiu contra',
      'Sucedeu',
      'Governou',
      'Ocorreu em',
    ])
      expect(legend).toContain(label);
  });

  it('hides a type from the legend toggle and restores it with the clear button', async () => {
    const fixture = await render();
    const el = root(fixture);
    const kind = fixture.componentInstance.drawnNodes()[0].kind;
    const before = el.querySelectorAll('[data-node]').length;
    const toggle = [...el.querySelectorAll<HTMLButtonElement>('.legend__item')].find((b) =>
      b.textContent?.includes(kind.plural),
    )!;
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(el.querySelectorAll('[data-node]').length).toBeLessThan(before);
    [...el.querySelectorAll<HTMLButtonElement>('button')]
      .find((b) => b.textContent?.trim() === 'Limpar filtros')!
      .click();
    fixture.detectChanges();
    expect(el.querySelectorAll('[data-node]').length).toBe(before);
  });

  it('shows an empty state when the filters hide every node', async () => {
    const fixture = await render();
    fixture.componentInstance.collectionsOn.set(new Set());
    fixture.detectChanges();
    expect(root(fixture).querySelector('.overlay h2')?.textContent).toContain('Nenhum verbete');
  });

  it('selects a node by search and opens its summary and link to the entry', async () => {
    const fixture = await render();
    const first = fixture.componentInstance.drawnNodes()[0].node;
    const input = root(fixture).querySelector<HTMLInputElement>('#graph-search')!;
    input.value = first.title;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    const detail = root(fixture).querySelector('.detail')!;
    expect(detail.querySelector('h2')?.textContent).toContain(first.title);
    expect(detail.querySelector('a[href^="/verbete/"]')?.getAttribute('href')).toBe(
      `/verbete/${first.slug}`,
    );
  });

  it('exposes nodes with accessible names and opens the focused one with Enter', async () => {
    const fixture = await render();
    const nodes = root(fixture).querySelectorAll<SVGElement>('[data-node]');
    expect(nodes[0].getAttribute('tabindex')).toBe('0');
    expect(nodes[1].getAttribute('tabindex')).toBe('-1');
    expect(nodes[0].getAttribute('aria-label')).toMatch(/ligaç/);
    nodes[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedId()).toBe(nodes[0].getAttribute('data-node'));
  });

  it('zooms and pans from the keyboard on the canvas', async () => {
    const fixture = await render();
    fixture.componentInstance.size.set({ width: 1000, height: 600 });
    fixture.componentInstance.fit();
    const before = fixture.componentInstance.view();
    const canvas = root(fixture).querySelector('svg.canvas')!;
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }));
    expect(fixture.componentInstance.view().k).toBeGreaterThan(before.k);
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: '0', bubbles: true }));
    expect(fixture.componentInstance.view().k).toBeCloseTo(before.k);
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(fixture.componentInstance.view().x).toBeGreaterThan(before.x);
  });

  it('keeps reader-facing text free of project and encyclopedia references', async () => {
    const fixture = await render();
    const text = root(fixture).querySelector('.controls')!.textContent ?? '';
    expect(text).not.toMatch(/wikip[eé]dia|wikidata|este projeto/i);
  });
});
