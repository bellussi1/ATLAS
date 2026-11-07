import { TestBed } from '@angular/core/testing';
import type { ContextTerm } from '@core/content/queries/context-vocabulary';

import { ContextTextComponent } from './context-text.component';

const terms: ContextTerm[] = [
  {
    label: 'meios de produção',
    entityId: 'wiki-topic-meios-de-producao',
    kind: 'Conceito',
    definition: 'Recursos usados na produção.',
  },
  {
    label: 'Bakunin',
    entityId: 'wiki-topic-mikhail-bakunin',
    kind: 'Pensador',
    definition: 'Anarquista russo.',
  },
];

describe('ContextTextComponent', () => {
  it('turns known terms into buttons and emits the chosen record', () => {
    TestBed.configureTestingModule({ imports: [ContextTextComponent] });
    const fixture = TestBed.createComponent(ContextTextComponent);
    fixture.componentRef.setInput(
      'text',
      'O proletariado vende a força de trabalho e usa meios de produção; Bakunin criticou o Estado.',
    );
    fixture.componentRef.setInput('vocabulary', terms);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const buttons = [...host.querySelectorAll<HTMLButtonElement>('.context-term')];
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'meios de produção',
      'Bakunin',
    ]);
    let picked = '';
    fixture.componentInstance.termClick.subscribe((term) => (picked = term.entityId));
    buttons[0].click();
    expect(picked).toBe('wiki-topic-meios-de-producao');
    expect(host.textContent).toContain('força de trabalho');
  });

  it('keeps prose without known terms as plain text, with no extra buttons', () => {
    TestBed.configureTestingModule({ imports: [ContextTextComponent] });
    const fixture = TestBed.createComponent(ContextTextComponent);
    fixture.componentRef.setInput('text', 'Um texto sem termos do grafo.');
    fixture.componentRef.setInput('vocabulary', terms);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('button')).toBeNull();
  });
});
