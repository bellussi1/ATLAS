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
    statement: 'x',
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
    statement: 'y',
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
    statement: 'z',
    sourceIds: ['s1'],
    editorialStatus: 'pending',
  },
];

describe('PositionsEstimateComponent', () => {
  it('states each estimate in words and marks the largest difference between entities', () => {
    const fixture = TestBed.createComponent(PositionsEstimateComponent);
    fixture.componentRef.setInput('entities', [
      { id: 'person-bernstein', title: 'Eduard Bernstein' },
      { id: 'person-luxemburg', title: 'Rosa Luxemburg' },
    ]);
    fixture.componentRef.setInput('claims', claims);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const bernstein = root.querySelector<HTMLElement>('[data-status="estimada"]');
    expect(bernstein?.textContent).toContain('estimada em 0,76');
    expect(bernstein?.querySelector('[role="img"]')?.getAttribute('aria-label')).toContain(
      'Eduard Bernstein, Método de mudança social: estimada em 0,76',
    );
    expect(root.querySelectorAll('[data-status="insuficiente"] [role="img"]')).toHaveLength(0);
    expect(root.querySelector('.positions-summary')?.textContent).toContain(
      'Método de mudança social',
    );
    expect(root.textContent).toContain('Não são fatos históricos');
  });

  it('shows indicative and insufficient axes without drawing a fake position', () => {
    const fixture = TestBed.createComponent(PositionsEstimateComponent);
    fixture.componentRef.setInput('entities', [
      { id: 'person-luxemburg', title: 'Rosa Luxemburg' },
    ]);
    fixture.componentRef.setInput('claims', claims);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-status="indicativa"]')?.textContent).toContain(
      'indicativa: 1 afirmação, 1 fonte',
    );
    expect(root.querySelector('[data-status="insuficiente"]')?.textContent).toContain(
      'sem evidência suficiente',
    );
    expect(root.querySelector('.positions-summary')).toBeNull();
  });
});
