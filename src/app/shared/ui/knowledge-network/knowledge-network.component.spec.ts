import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { entityMedia } from '@core/content/media/asset-license';
import { labelRelevance } from '@core/content/queries/knowledge-network';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { methodologyKnowledgeGraph } from '@testing/content-fixture';
import { vi } from 'vitest';

import { KnowledgeNetworkComponent } from './knowledge-network.component';

describe('KnowledgeNetworkComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ContentRepository,
          useValue: {
            layouts: {},
            mediaUrl: (path: string) => path,
            atlasForEntity: () =>
              methodologyKnowledgeGraph.atlases.find((atlas) => atlas.id === 'atlas-liberalism'),
            knowledgeGraph: {
              ...methodologyKnowledgeGraph,
              atlases: methodologyKnowledgeGraph.atlases.filter(
                (atlas) => atlas.id === 'atlas-liberalism',
              ),
            },
          },
        },
      ],
    }),
  );

  async function render() {
    const fixture = TestBed.createComponent(KnowledgeNetworkComponent);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.positions()).not.toBeNull());
    fixture.detectChanges();
    return fixture;
  }
  const root = (fixture: { nativeElement: unknown }) => fixture.nativeElement as HTMLElement;

  it('draws the released coordinates when a compiled network is available', async () => {
    const graph = {
      ...methodologyKnowledgeGraph,
      atlases: methodologyKnowledgeGraph.atlases.filter((atlas) => atlas.id === 'atlas-liberalism'),
    };
    const positions = Object.fromEntries(
      graph.atlases[0].entities.map((entity, index) => [entity.id, { x: index * 50, y: 100 }]),
    );
    TestBed.overrideProvider(ContentRepository, {
      useValue: {
        knowledgeGraph: graph,
        layouts: { network: { width: 2000, height: 1000, positions, regions: [] } },
      },
    });
    const fixture = await render();
    expect(fixture.componentInstance.positions()).toEqual(new Map(Object.entries(positions)));
  });

  it('shows a loading state until the layout is ready, then draws nodes', async () => {
    const fixture = TestBed.createComponent(KnowledgeNetworkComponent);
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
    await vi.waitFor(() => expect(fixture.componentInstance.view().k).toBeGreaterThan(before.k));
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: '0', bubbles: true }));
    await vi.waitFor(() => expect(fixture.componentInstance.view().k).toBeCloseTo(before.k));
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(fixture.componentInstance.view().x).toBeGreaterThan(before.x);
  });

  it('keeps reader-facing text free of project and encyclopedia references', async () => {
    const fixture = await render();
    const text = root(fixture).querySelector('.controls')!.textContent ?? '';
    expect(text).not.toMatch(/wikip[eé]dia|wikidata|este projeto/i);
  });

  const press = (key: string, target: EventTarget = document.body) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

  it('opens the shortcut list with ? and closes it with Escape', async () => {
    const fixture = await render();
    press('?');
    fixture.detectChanges();
    expect(root(fixture).querySelector('#graph-shortcuts')?.textContent).toContain(
      'Buscar por nome',
    );
    expect(root(fixture).textContent).toContain('Pinça');
    press('Escape');
    fixture.detectChanges();
    expect(root(fixture).querySelector('#graph-shortcuts')).toBeNull();
  });

  it('ignores shortcut keys while the reader types in the search field', async () => {
    const fixture = await render();
    const input = root(fixture).querySelector<HTMLInputElement>('#graph-search')!;
    press('?', input);
    press('l', input);
    fixture.detectChanges();
    expect(fixture.componentInstance.shortcutsOpen()).toBe(false);
    expect(fixture.componentInstance.controlsOpen()).toBeNull();
  });

  it('toggles the legend panel with L and keeps the toggle state in aria-expanded', async () => {
    const fixture = await render();
    const toggle = [
      ...root(fixture).querySelectorAll<HTMLButtonElement>('.bar__actions .chip'),
    ].find((b) => b.textContent?.includes('Legenda e filtros'))!;
    const before = toggle.getAttribute('aria-expanded');
    press('l');
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).not.toBe(before);
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe(before);
  });

  it('lights the surroundings of the hovered node and opens the selected entry with O', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    const linked = component.drawnNodes().find((n) => n.node.degree > 0)!;
    component.hoverNode(linked.node.id);
    fixture.detectChanges();
    expect(component.activeId()).toBe(linked.node.id);
    expect(root(fixture).querySelectorAll('.edges line.is-active').length).toBeGreaterThan(0);
    expect(
      root(fixture)
        .querySelector(`[data-node="${linked.node.id}"]`)
        ?.classList.contains('is-hovered'),
    ).toBe(true);
    component.hoverNode(null);
    fixture.detectChanges();
    expect(component.activeId()).toBeNull();
  });

  it('keeps the whole map readable when a node is selected', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    component.size.set({ width: 1400, height: 900 });
    component.fit(false);
    const linked = component.drawnNodes().find((n) => n.node.degree > 0)!;
    component.select(linked.node.id);
    fixture.detectChanges();
    expect(component.selectedId()).toBe(linked.node.id);
    expect(root(fixture).querySelector('.node__selection')).not.toBeNull();
    expect(root(fixture).querySelector('.label.is-selected')).not.toBeNull();
    // A selection is a permanent mark; only hovering its surroundings dims the rest.
    expect(root(fixture).querySelectorAll('.node.is-dimmed').length).toBe(0);
    component.hoverNode(linked.node.id);
    fixture.detectChanges();
    expect(root(fixture).querySelectorAll('.node.is-dimmed').length).toBeGreaterThan(0);
  });

  it('shows the licensed image and an evident summary in the detail card', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    const withMedia = component
      .drawnNodes()
      .find((item) => entityMedia(methodologyKnowledgeGraph, { id: item.node.id }));
    expect(withMedia).toBeDefined();
    component.select(withMedia!.node.id);
    fixture.detectChanges();
    const image = root(fixture).querySelector<HTMLImageElement>('.detail__media img');
    expect(image?.getAttribute('src')).toBeTruthy();
    expect(root(fixture).querySelector('.detail__media figcaption')?.textContent).toBeTruthy();
    if (withMedia!.node.summary !== withMedia!.node.definition)
      expect(root(fixture).querySelector('.detail__more summary')?.textContent).toContain(
        'Ler resumo completo',
      );
    expect(root(fixture).querySelector('.links__row .links__go')).not.toBeNull();
    const withoutMedia = component
      .drawnNodes()
      .find((item) => !entityMedia(methodologyKnowledgeGraph, { id: item.node.id }));
    if (withoutMedia) {
      component.select(withoutMedia.node.id);
      fixture.detectChanges();
      expect(
        root(fixture).querySelector('.detail__media--art app-geometric-illustration'),
      ).not.toBeNull();
    }
  });

  it('never draws a label outside the free area of the stage', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    component.size.set({ width: 1000, height: 700 });
    component.fit();
    fixture.detectChanges();
    const view = component.view();
    const inset = component.insets();
    for (const label of component.labels()) {
      const x = view.x + label.wx + label.dx;
      const y = view.y + label.wy + label.dy;
      expect(y).toBeGreaterThanOrEqual(inset.top - 1);
      expect(y).toBeLessThanOrEqual(700 - inset.bottom + 1);
      expect(x).toBeGreaterThanOrEqual(inset.left - 1);
    }
  });

  it('names only the hovered node and its neighbours, with a phrase on each link', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    const linked = component.drawnNodes().find((n) => n.node.degree > 0)!;
    component.size.set({ width: 1400, height: 900 });
    component.fit();
    component.hoverNode(linked.node.id);
    fixture.detectChanges();
    const lit = new Set([linked.node.id, ...component.neighbours()]);
    expect(component.labels().length).toBeGreaterThan(0);
    for (const label of component.labels()) expect(lit.has(label.id)).toBe(true);
    expect(component.edgeLabels()).toEqual([]);
    expect(root(fixture).querySelector('.node.is-dimmed')).not.toBeNull();
  });

  it('explains the relation of the selected node: reading, nature and reason', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    const linked = component.drawnNodes().find((n) => n.node.degree > 0)!;
    component.select(linked.node.id);
    fixture.detectChanges();
    const items = root(fixture).querySelectorAll('.links li');
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].querySelector('.links__verb')?.textContent?.trim()).toBeTruthy();
    expect(items[0].querySelector('.nature')?.textContent?.trim()).toBeTruthy();
    expect(items[0].querySelector('.links__why')?.textContent?.trim()).toBeTruthy();
    expect(root(fixture).querySelector('.detail__count')?.textContent).toContain('conex');
  });

  it('cycles through the neighbours of a node with the bracket keys', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    const linked = component.drawnNodes().find((n) => n.node.degree > 0)!;
    const el = root(fixture).querySelector(`[data-node="${linked.node.id}"]`)!;
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ']', bubbles: true }));
    expect(component.focusId()).not.toBe(linked.node.id);
  });

  it('names more nodes at each zoom step and words the links only up close', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    component.size.set({ width: 1400, height: 900 });
    component.fit();
    const linked = component.drawnNodes().find((n) => n.node.degree > 0)!;
    component.hoverNode(linked.node.id);
    expect(component.edgeLabels()).toEqual([]);
    component.hoverNode(null);
    const ranked = [...component.drawnNodes()].sort(
      (a, b) =>
        labelRelevance(b.node) - labelRelevance(a.node) || a.node.id.localeCompare(b.node.id),
    );
    expect(component.labels().map((label) => label.id)).toContain(ranked[0].node.id);
    expect(component.labels().length).toBeLessThanOrEqual(12);
    const fitView = component.view();
    const fitSize = component.size();
    const fitCells = new Set(
      component.labels().map((label) => {
        const x = fitView.x + label.wx + label.dx;
        const y = fitView.y + label.wy + label.dy;
        return `${Math.min(3, Math.max(0, Math.floor((x / fitSize.width) * 4)))}:${Math.min(
          2,
          Math.max(0, Math.floor((y / fitSize.height) * 3)),
        )}`;
      }),
    );
    expect(fitCells.size).toBeGreaterThanOrEqual(2);
    const centre = { x: 700, y: 450 };
    component.zoomBy(2.2, centre);
    component.zoomBy(2.2, centre);
    expect(component.labels().length).toBeLessThanOrEqual(36);
    component.select(linked.node.id);
    component.hoverNode(linked.node.id);
    await vi.waitFor(() => expect(component.edgeLabels().length).toBeGreaterThan(0));
  });

  it('keeps an accessible name on nodes whose visual label is hidden', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    component.size.set({ width: 1400, height: 900 });
    component.fit();
    const shown = new Set(component.labels().map((label) => label.id));
    const hidden = component.drawnNodes().find((item) => !shown.has(item.node.id));
    expect(hidden).toBeDefined();
    const element = root(fixture).querySelector(`[data-node="${hidden!.node.id}"]`);
    expect(element?.getAttribute('aria-label')).toContain(hidden!.node.title);
  });

  it('opens at the whole graph and calls that framing 100%', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    component.size.set({ width: 1400, height: 900 });
    component.fit(false);
    const base = component.view().k;
    expect(component.zoomPercent()).toBe(100);
    component.zoomBy(2, { x: 700, y: 450 });
    component.fit(false);
    expect(component.view().k).toBeCloseTo(base, 6);
    expect(component.zoomPercent()).toBe(100);
  });

  it('embeds in an atlas scope, selects its root and frames that atlas as 100%', async () => {
    const fixture = TestBed.createComponent(KnowledgeNetworkComponent);
    fixture.componentRef.setInput('embedded', true);
    fixture.componentRef.setInput('scope', ['atlas-liberalism']);
    fixture.componentRef.setInput('focus', 'ideology-liberalism');
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.positions()).not.toBeNull());
    const component = fixture.componentInstance;
    component.size.set({ width: 1000, height: 700 });
    component.fit(false);
    fixture.detectChanges();
    expect(component.visible().nodes.length).toBeGreaterThan(0);
    expect(
      component.visible().nodes.every((node) => node.collections.includes('atlas-liberalism')),
    ).toBe(true);
    expect(component.selectedId()).toBe('ideology-liberalism');
    expect(component.zoomPercent()).toBe(100);
    expect(root(fixture).querySelector('.detail')).toBeNull();
  });

  it('reframes with Home, ignores letter shortcuts on buttons and unwinds Escape in steps', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    component.size.set({ width: 1000, height: 600 });
    component.fit();
    const base = component.view().k;
    component.zoomBy(2);
    press('Home');
    await vi.waitFor(() => expect(component.view().k).toBeCloseTo(base));
    const button = root(fixture).querySelector<HTMLButtonElement>('.zoom button')!;
    press('l', button);
    expect(component.controlsOpen()).toBeNull();
    const linked = component.drawnNodes().find((n) => n.node.degree > 0)!;
    component.select(linked.node.id);
    press('Escape');
    expect(component.selectedId()).toBeNull();
  });

  it('walks through the search results with the arrow keys and Escape returns to the field', async () => {
    const fixture = await render();
    const first = fixture.componentInstance.drawnNodes()[0].node;
    const input = root(fixture).querySelector<HTMLInputElement>('#graph-search')!;
    document.body.append(root(fixture));
    input.value = first.title.slice(0, 3);
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    const buttons = root(fixture).querySelectorAll<HTMLButtonElement>('.search__results button');
    expect(buttons.length).toBeGreaterThan(0);
    expect(document.activeElement).toBe(buttons[0]);
    buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.activeElement).toBe(input);
    root(fixture).remove();
  });

  it('draws every link as the same plain line zoomed out, and tells the kinds up close', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    component.size.set({ width: 1400, height: 900 });
    component.fit();
    fixture.detectChanges();
    const edge = component.drawnEdges()[0].edge;
    expect(component.edgeDetailed(edge)).toBe(false);
    const batch = root(fixture).querySelector('.edge-batch');
    expect(batch).not.toBeNull();
    expect(batch?.getAttribute('marker-end')).toBeNull();
    expect(root(fixture).querySelectorAll('.edges line').length).toBe(0);
    component.zoomBy(3, { x: 700, y: 450 });
    fixture.detectChanges();
    expect(component.edgeDetailed(edge)).toBe(true);
  });

  it('gives every node a larger invisible hit area than its shape', async () => {
    const fixture = await render();
    const node = fixture.componentInstance.drawnNodes()[0];
    const hit = root(fixture).querySelector('[data-hit]')!;
    const shown =
      node.r * fixture.componentInstance.nodeScale() * fixture.componentInstance.zoomK();
    expect(
      Number(hit.getAttribute('r')) * fixture.componentInstance.zoomK(),
    ).toBeGreaterThanOrEqual(Math.max(16, shown + 5));
    expect(root(fixture).querySelector('[data-label]')).toBeNull();
  });

  it('shows only the lines when zoomed out and the wording of each link up close', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    component.size.set({ width: 1400, height: 900 });
    component.fit();
    const linked = component.drawnNodes().find((n) => n.node.degree > 0)!;
    component.pointerAt.set({ x: 400, y: 300 });
    component.hoverNode(linked.node.id);
    expect(component.near()).toBe(false);
    expect(component.hoverCard()?.node?.top).toEqual([]);
    fixture.detectChanges();
    expect(root(fixture).querySelector('.edge-hits')).toBeNull();
    component.zoomBy(3, { x: 700, y: 450 });
    fixture.detectChanges();
    expect(component.near()).toBe(true);
    expect(component.hoverCard()?.node?.top.length).toBeGreaterThan(0);
    expect(root(fixture).querySelector('.edge-hits')).toBeNull();
  });

  it('keeps the nodes still: nothing in the map floats or sways', async () => {
    const fixture = await render();
    expect(root(fixture).querySelector('[class*="drift"]')).toBeNull();
  });
});
