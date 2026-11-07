import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ChapterReview } from '@ideologies/utils/chapter-review';
import { provideContentFixture } from '@testing/content-fixture';

import { ChapterReviewComponent } from './chapter-review.component';

describe('ChapterReviewComponent', () => {
  const setup = (review: ChapterReview) => {
    TestBed.configureTestingModule({
      imports: [ChapterReviewComponent],
      providers: [provideRouter([]), provideHttpClient(), ...provideContentFixture()],
    });
    const fixture = TestBed.createComponent(ChapterReviewComponent);
    fixture.componentRef.setInput('review', review);
    fixture.componentRef.setInput('chapterTitle', 'Capítulo de teste');
    fixture.detectChanges();
    return fixture;
  };

  const source = {
    id: 'source-test',
    title: 'Uma fonte verificável',
    url: 'https://example.org/fonte',
    edition: '1. ed.',
    publicationDate: null,
  };

  it('keeps the answer and its sources hidden until the reader asks for them', () => {
    const fixture = setup({
      question: 'Por que a divisão do trabalho cria dependência mútua?',
      answer: 'Porque especializa as tarefas e liga os produtores por trocas.',
      rationale: 'Explique o mecanismo, não repita o nome do conceito.',
      sources: [source],
      revisit: [],
    });
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.chapter-review')?.getAttribute('aria-label')).toBe(
      'Revisão: Capítulo de teste',
    );
    expect(host.textContent).toContain('Explique o mecanismo');
    expect(host.textContent).toContain('Por que a divisão do trabalho');
    expect(host.querySelector('.review-answer')).toBeNull();
    const button = host.querySelector<HTMLButtonElement>('.review-toggle')!;
    expect(button.getAttribute('aria-expanded')).toBe('false');
    button.click();
    fixture.detectChanges();
    expect(host.querySelector('.review-answer')?.textContent).toContain(
      'Porque especializa as tarefas',
    );
    expect(host.querySelector('.review-answer')?.textContent).toContain('Uma fonte verificável');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.textContent).toContain('Ocultar resposta');
    button.click();
    fixture.detectChanges();
    expect(host.querySelector('.review-answer')).toBeNull();
  });

  it('shows each prior record with the new connection it opens, without a generic intro', () => {
    const fixture = setup({
      question: 'Como a crítica de Luxemburgo responde a Bernstein?',
      answer: 'Luxemburgo contesta a ideia de que reformas substituem a transformação.',
      rationale: 'Examine a objeção em seus próprios termos.',
      sources: [],
      revisit: [
        {
          entityId: 'person-eduard-bernstein',
          label: 'Eduard Bernstein',
          why: 'Retome a revisão reformista para entender o alvo da crítica.',
        },
      ],
    });
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.review-link')).toHaveLength(1);
    expect(host.textContent).toContain('Eduard Bernstein');
    expect(host.textContent).toContain('Retome a revisão reformista');
    expect(host.textContent).not.toContain('Dois capítulos atrás');
    expect(host.textContent).not.toContain('Revisão do capítulo');
    expect(host.querySelector('.review-link')?.textContent).toContain('Abrir ficha');
  });

  it('does not render a revisit block when the editorial review has none', () => {
    const fixture = setup({
      question: 'O que muda quando o foco passa da liberdade negativa para a positiva?',
      answer: 'Muda o que se exige das instituições e o risco de coerção em nome da autonomia.',
      rationale: 'Compare duas concepções de liberdade.',
      sources: [],
      revisit: [],
    });
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.review-revisit')).toBeNull();
    expect(host.querySelector('.review-question')).not.toBeNull();
  });
});
