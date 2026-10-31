import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AtlasEvidenceNetworkComponent } from './evidence-network';

describe('evidence network layout', () => {
  function network() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
    return TestBed.createComponent(AtlasEvidenceNetworkComponent).componentInstance;
  }

  it('starts with entities instead of mixing assertions and sources into one diagram', () => {
    const component = network();
    expect(component.visibleNodes().length).toBeGreaterThan(3);
    expect(
      component.visibleNodes().some((node) => ['Fonte', 'Afirmação'].includes(node.kind)),
    ).toBe(false);
  });

  it('keeps selection when filtering and follows documented inverse relations', () => {
    const component = network();
    component.follow('person-karl-marx');
    component.filter('Pessoa');
    expect(component.selected()?.id).toBe('person-karl-marx');
    expect(
      component
        .connections()
        .some((edge) => edge.label === 'analisa criticamente' && edge.to === 'person-adam-smith'),
    ).toBe(true);
    component.follow('person-adam-smith');
    expect(
      component
        .connections()
        .some(
          (edge) => edge.label === 'é analisado criticamente por' && edge.to === 'person-karl-marx',
        ),
    ).toBe(true);
    component.follow('source-marx-capital');
    expect(component.kind()).toBe('Fonte');
    expect(component.selected()?.id).toBe('source-marx-capital');
  });

  it('links source nodes to their own stable source anchors', () => {
    const component = network();
    const source = component.nodes.find((node) => node.kind === 'Fonte');
    expect(source).toMatchObject({ path: '/fontes', fragment: 'source-source-editorial-rules' });
  });
});
