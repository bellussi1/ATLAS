import { TestBed } from '@angular/core/testing';
import type { PositionClaim } from '@ideologies/models/ideology-page.schema';

import { PositionsEstimateComponent } from './positions-estimate.component';

const claims: PositionClaim[] = [
  {
    id: 'a',
    entityId: 'person-bernstein',
    axisId: 'revolucao',
    value: 0.8,
    confidence: 'alta',
    classification: 'tese atribuída',
    statement: 'O movimento importa mais que o fim último.',
    sourceIds: ['s1'],
    editorialStatus: 'pending',
  },
  {
    id: 'b',
    entityId: 'person-bernstein',
    axisId: 'revolucao',
    value: 0.7,
    confidence: 'média',
    classification: 'interpretação',
    statement: 'A crítica lê as reformas como objetivo.',
    sourceIds: ['s2'],
    editorialStatus: 'pending',
  },
  {
    id: 'c',
    entityId: 'person-luxemburg',
    axisId: 'revolucao',
    value: -0.8,
    confidence: 'alta',
    classification: 'tese atribuída',
    statement: 'A luta por reformas é o meio; a revolução, o objetivo.',
    sourceIds: ['s1'],
    editorialStatus: 'pending',
  },
];

const sources = [
  { id: 's1', title: 'Prefácio de 1899' },
  { id: 's2', title: 'Reforma ou revolução' },
];

function render(entities: { id: string; title: string }[]) {
  const fixture = TestBed.createComponent(PositionsEstimateComponent);
  fixture.componentRef.setInput('entities', entities);
  fixture.componentRef.setInput('claims', claims);
  fixture.componentRef.setInput('sources', sources);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('PositionsEstimateComponent', () => {
  it('states each estimate in words and names the largest contrast between entities', () => {
    const root = render([
      { id: 'person-bernstein', title: 'Eduard Bernstein' },
      { id: 'person-luxemburg', title: 'Rosa Luxemburg' },
    ]);

    const estimated = root.querySelector<HTMLElement>('li[data-status="estimada"]');
    expect(estimated?.textContent).toContain('estimada em 0,76');
    expect(estimated?.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
      'Eduard Bernstein, Método de mudança social: estimada em 0,76, intervalo de 0,7 a 0,8, 2 afirmações, 2 fontes',
    );
    expect(root.querySelector('.positions-summary')?.textContent).toContain(
      'Método de mudança social',
    );
    expect(root.textContent).toContain('Não são fatos históricos');
  });

  it('lists the claims behind an axis with their sources and keeps the reader in the same page', () => {
    const root = render([{ id: 'person-bernstein', title: 'Eduard Bernstein' }]);
    const claimList = root.querySelector('li[data-status="estimada"] .claims');
    expect(claimList?.querySelector('summary')?.textContent).toContain('Afirmações (2)');
    expect(claimList?.textContent).toContain('O movimento importa mais que o fim último.');
    expect(claimList?.textContent).toContain('Prefácio de 1899');
    expect(claimList?.textContent).toContain('confiança média');
  });

  it('never draws insufficient axes; it names them once in a disclosure', () => {
    const root = render([{ id: 'person-luxemburg', title: 'Rosa Luxemburg' }]);
    expect(root.querySelectorAll('[data-status="insuficiente"]')).toHaveLength(0);
    expect(root.querySelector('li[data-status="indicativa"]')?.textContent).toContain(
      'indicativa: 1 afirmação, 1 fonte',
    );
    expect(root.querySelector('.hidden-axes summary')?.textContent).toContain(
      'Sem evidência em 5 eixos',
    );
    expect(root.querySelector('.hidden-axes')?.textContent).toContain(
      'Propriedade dos meios de produção',
    );
    expect(root.querySelector('.positions-summary')).toBeNull();
  });

  it('explains the statuses in a disclosure that exists before any estimate is read', () => {
    const root = render([{ id: 'person-luxemburg', title: 'Rosa Luxemburg' }]);
    expect(root.querySelector('.how-to-read summary')?.textContent).toContain(
      'Como ler estas estimativas',
    );
    for (const status of ['estimada', 'divergente', 'indicativa', 'insuficiente']) {
      expect(root.querySelector(`[data-legend="${status}"]`)).not.toBeNull();
    }
  });

  it('gives an entity without claims an explicit message instead of an empty list', () => {
    const root = render([{ id: 'person-mao-zedong', title: 'Mao Zedong' }]);
    expect(root.querySelector('.no-evidence')?.textContent).toContain(
      'Ainda não há afirmação com fonte',
    );
    expect(root.querySelector('.axes')).toBeNull();
  });
});
