import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { PositionClaim } from '@ideologies/models/ideology-page.schema';
import { CardCarouselComponent } from '@shared/ui/card-carousel/card-carousel.component';
import { vi } from 'vitest';

import { PositionsEstimateComponent, type PositionSource } from './positions-estimate.component';

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
    id: 'd',
    entityId: 'person-bernstein',
    axisId: 'poder',
    value: 0.5,
    confidence: 'média',
    classification: 'interpretação',
    statement: 'A democracia é governo dos trabalhadores na medida em que eles podem influir.',
    sourceIds: ['s1'],
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

const sources: PositionSource[] = [
  {
    id: 's1',
    title: 'Prefácio de 1899',
    url: 'https://example.org/prefacio',
    edition: 'Prefácio da obra de 1899',
  },
  {
    id: 's2',
    title: 'Reforma ou revolução',
    url: 'https://example.org/reforma',
    edition: 'Introdução de 1900',
  },
];

const marxClaims: PositionClaim[] = [
  claim('m1', 'person-marx', 'poder', -0.7, 'média', ['s1']),
  claim('m2', 'person-marx', 'poder', 0.6, 'média', ['s2']),
  claim('m3', 'person-marx', 'propriedade', -0.8, 'alta', ['s1']),
  claim('m4', 'person-marx', 'propriedade', -0.9, 'média', ['s2']),
  claim('m5', 'person-marx', 'igualdade', -0.6, 'baixa', ['s1']),
];

function claim(
  id: string,
  entityId: string,
  axisId: PositionClaim['axisId'],
  value: number,
  confidence: PositionClaim['confidence'],
  sourceIds: string[],
): PositionClaim {
  return {
    id,
    entityId,
    axisId,
    value,
    confidence,
    classification: 'tese atribuída',
    statement: `Afirmação ${id}`,
    sourceIds,
    editorialStatus: 'pending',
  };
}

function render(
  entities: { id: string; title: string }[],
  claimsFor: PositionClaim[] = claims,
  sourcesFor: PositionSource[] = sources,
) {
  const fixture = TestBed.createComponent(PositionsEstimateComponent);
  fixture.componentRef.setInput('entities', entities);
  fixture.componentRef.setInput('claims', claimsFor);
  fixture.componentRef.setInput('sources', sourcesFor);
  fixture.detectChanges();
  return { fixture, root: fixture.nativeElement as HTMLElement };
}

function entity(root: HTMLElement, title: string): HTMLElement {
  return [...root.querySelectorAll<HTMLElement>('article.entity')].find((item) =>
    item.textContent?.includes(title),
  )!;
}

describe('PositionsEstimateComponent', () => {
  it('leads with the record and one axis, before opening the evidence', () => {
    const { root } = render([
      { id: 'person-bernstein', title: 'Eduard Bernstein' },
      { id: 'person-luxemburg', title: 'Rosa Luxemburgo' },
    ]);
    const bernstein = entity(root, 'Eduard Bernstein');

    expect(bernstein.querySelector('.entity-head h4')?.textContent).toBe('Eduard Bernstein');
    expect(bernstein.querySelector('.entity-meta')?.textContent).toContain('2 eixos com evidência');
    expect(bernstein.querySelectorAll('.axis-chip')).toHaveLength(2);
    expect(bernstein.querySelector('.axis-chip[aria-pressed="true"]')?.textContent).toContain(
      'Mudança social',
    );
    expect(bernstein.querySelector('.axis-panel h5')?.textContent).toBe('Método de mudança social');
    expect(bernstein.querySelector('.status-chip')?.textContent).toContain('Estimada · 2 fontes');
    expect(bernstein.querySelector('.axis-interpretation')?.textContent).toContain(
      'Faixa estreita',
    );
    expect(bernstein.querySelector('.axis-interpretation')?.textContent).toContain(
      'Mais perto de reforma gradual',
    );
    expect(bernstein.querySelector('.poles')?.textContent).toContain('ruptura revolucionária');
    expect(bernstein.querySelector('.poles')?.textContent).toContain('reforma gradual');
    expect(bernstein.querySelector('.axis-confidence')?.textContent).toContain(
      'Confiança: alta (1), média (1)',
    );
    expect(bernstein.querySelectorAll('.axis-panel .marker')).toHaveLength(1);
    expect(bernstein.querySelectorAll('.axis-panel .end')).toHaveLength(0);
    expect(bernstein.querySelector('.track')?.getAttribute('aria-label')).toContain(
      'Eduard Bernstein, Método de mudança social: Estimada · 2 fontes',
    );
  });

  it('keeps the claims and their source links behind a disclosure', () => {
    const { root } = render([{ id: 'person-bernstein', title: 'Eduard Bernstein' }]);
    const details = root.querySelector<HTMLDetailsElement>('.claims')!;

    expect(details.open).toBe(false);
    expect(details.querySelector('summary')?.textContent).toContain('Ver evidências (2)');
    expect(details.textContent).toContain('O movimento importa mais que o fim último.');
    expect(details.textContent).toContain('confiança média');
    expect(details.textContent).toContain('posição atribuída pela fonte: 0,8');
    expect(details.textContent).toContain('Prefácio de 1899');
    expect(
      details.querySelector<HTMLAnchorElement>('a[href="https://example.org/prefacio"]')
        ?.textContent,
    ).toContain('Prefácio de 1899');
    expect(details.querySelector('.claims-method')?.textContent).toContain('Média ponderada');
  });

  it('does not draw a centre when the sources diverge', () => {
    const { root } = render([{ id: 'person-marx', title: 'Karl Marx' }], marxClaims);
    const marx = entity(root, 'Karl Marx');

    expect(marx.querySelector('.axis-chip[aria-pressed="true"]')?.textContent).toContain(
      'Limites do Estado',
    );
    expect(marx.querySelector('.axis-panel')?.getAttribute('data-status')).toBe('divergente');
    expect(marx.querySelector('.status-chip')?.textContent).toContain('Divergente · 2 fontes');
    expect(marx.querySelectorAll('.axis-panel .end')).toHaveLength(2);
    expect(marx.querySelectorAll('.axis-panel .marker')).toHaveLength(0);
    expect(marx.querySelector('.axis-interpretation')?.textContent).toContain(
      'As fontes se dividem',
    );
    expect(marx.querySelector('.claims-method')?.textContent.toLowerCase()).toContain(
      'nenhuma média',
    );
  });

  it('labels a single claim as indicative, never as an estimate', () => {
    const { root } = render(
      [{ id: 'person-lenin', title: 'Vladimir Lenin' }],
      [claim('l1', 'person-lenin', 'poder', -0.7, 'alta', ['s1'])],
    );
    const lenin = entity(root, 'Vladimir Lenin');

    expect(lenin.querySelector('.status-chip')?.textContent).toContain('Indicativa · 1 afirmação');
    expect(lenin.querySelector('.axis-panel')?.getAttribute('data-status')).toBe('indicativa');
    expect(lenin.querySelector('.axis-interpretation')?.textContent).toContain('pista de leitura');
    expect(lenin.querySelectorAll('.axis-panel .marker')).toHaveLength(1);
  });

  it('lists axes without evidence and never gives them a track or a neutral value', () => {
    const { root } = render(
      [{ id: 'person-luxemburg', title: 'Rosa Luxemburgo' }],
      [claim('x', 'person-luxemburg', 'revolucao', -0.8, 'alta', ['s1'])],
    );
    const luxemburg = entity(root, 'Rosa Luxemburgo');

    expect(luxemburg.querySelectorAll('[data-status="insuficiente"]')).toHaveLength(0);
    expect(luxemburg.querySelector('.hidden-axes summary')?.textContent).toContain(
      'Eixos sem evidência (5)',
    );
    expect(luxemburg.querySelector('.hidden-axes')?.textContent).toContain(
      'Propriedade dos meios de produção',
    );
    expect(luxemburg.querySelector('.hidden-axes')?.textContent).toContain(
      'Nenhuma afirmação com fonte',
    );
  });

  it('gives a record without claims an explicit message and no comparison', () => {
    const { root } = render([{ id: 'person-none', title: 'Sem registros' }]);
    const empty = entity(root, 'Sem registros');

    expect(empty.querySelector('.entity-meta')?.textContent).toContain('0 eixos com evidência');
    expect(empty.querySelector('.no-evidence')?.textContent).toContain(
      'Nenhum valor foi atribuído',
    );
    expect(empty.querySelector('.axis-panel')).toBeNull();
    expect(empty.querySelector('.hidden-axes summary')?.textContent).toContain(
      'Eixos sem evidência (6)',
    );
    expect(root.querySelector('.contrast')).toBeNull();
  });

  it('switches the axis on the card without leaving the carousel', () => {
    const { fixture, root } = render([{ id: 'person-marx', title: 'Karl Marx' }], marxClaims);
    const marx = entity(root, 'Karl Marx');
    const chip = [...marx.querySelectorAll<HTMLButtonElement>('.axis-chip')].find((item) =>
      item.textContent?.includes('Propriedade'),
    )!;

    chip.click();
    fixture.detectChanges();

    expect(chip.getAttribute('aria-pressed')).toBe('true');
    expect(marx.querySelector('.axis-panel h5')?.textContent).toBe(
      'Propriedade dos meios de produção',
    );
    expect(marx.querySelector('.axis-panel')?.getAttribute('data-status')).toBe('estimada');
  });

  it('compares the largest contrast in words, with two tracks and no numeric gap', () => {
    const { root } = render([
      { id: 'person-bernstein', title: 'Eduard Bernstein' },
      { id: 'person-luxemburg', title: 'Rosa Luxemburgo' },
    ]);
    const contrast = root.querySelector('.contrast')!;

    expect(contrast.textContent).toContain('Método de mudança social');
    expect(contrast.textContent).toContain('Eduard Bernstein');
    expect(contrast.textContent).toContain('Rosa Luxemburgo');
    expect(contrast.textContent).not.toContain('diferença de');
    expect(contrast.querySelectorAll('.track')).toHaveLength(2);
    expect(contrast.querySelectorAll('.compare-open')).toHaveLength(2);
  });

  it('reveals a compared record in the carousel', () => {
    const { fixture, root } = render([
      { id: 'person-bernstein', title: 'Eduard Bernstein' },
      { id: 'person-luxemburg', title: 'Rosa Luxemburgo' },
    ]);
    const carousel = fixture.debugElement.query(By.directive(CardCarouselComponent))
      .componentInstance as CardCarouselComponent;
    const goTo = vi.spyOn(carousel, 'goTo').mockImplementation(() => undefined);

    root.querySelector<HTMLButtonElement>('.compare-open')!.click();

    expect(goTo).toHaveBeenCalledWith(0);
  });

  it('explains statuses, the centre of the scale and the method before any card is read', () => {
    const { root } = render(
      [{ id: 'person-luxemburg', title: 'Rosa Luxemburgo' }],
      [claim('x', 'person-luxemburg', 'revolucao', -0.8, 'alta', ['s1'])],
    );

    expect(root.querySelector('.how-to-read__scale')?.textContent).toContain('centro');
    expect(root.querySelector('.how-to-read__scale')?.textContent).toContain('não neutralidade');
    expect(root.querySelector('.how-to-read__kinds')?.textContent).toContain('Tese atribuída');
    expect(root.querySelector('.how-to-read__kinds')?.textContent).toContain('interpretação');
    expect(root.querySelector('.how-to-read__method')?.textContent).toContain('média ponderada');
    for (const status of ['estimada', 'divergente', 'indicativa', 'insuficiente']) {
      expect(root.querySelector(`[data-legend="${status}"]`)).not.toBeNull();
    }
    expect(root.textContent).toContain('Não são fatos históricos');
  });
});
