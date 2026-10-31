import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AtlasEvidenceNetworkComponent } from './evidence-network';

describe('evidence network layout', () => {
  function network() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
    return TestBed.createComponent(AtlasEvidenceNetworkComponent).componentInstance;
  }

  it('allocates a distinct position to every visible record', () => {
    const component = network();
    const coordinates = component.visibleNodes().map(node => `${component.position(node.id)},${component.vertical(node.id)}`);
    expect(component.visibleNodes().length).toBeGreaterThan(3);
    expect(new Set(coordinates).size).toBe(coordinates.length);
  });

  it('recalculates positions after filtering and keeps every node within the canvas', () => {
    const component = network();
    component.filter('Conceito');
    for (const node of component.visibleNodes()) {
      expect(component.position(node.id)).toBeGreaterThan(0);
      expect(component.position(node.id)).toBeLessThan(100);
      expect(component.vertical(node.id)).toBeGreaterThan(0);
      expect(component.vertical(node.id)).toBeLessThan(100);
    }
    expect(component.selected()).toBeDefined();
  });

  it('links source nodes to their own stable source anchors', () => {
    const component = network();
    const source = component.nodes.find(node => node.kind === 'Fonte');
    expect(source).toMatchObject({ path: '/fontes', fragment: 'source-source-editorial-rules' });
  });
});
