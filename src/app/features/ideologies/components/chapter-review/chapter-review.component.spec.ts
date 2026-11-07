import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideContentFixture } from '@testing/content-fixture';

import { ChapterReviewComponent } from './chapter-review.component';

describe('ChapterReviewComponent', () => {
  const setup = (review: {
    recall: { question: string; answer: string; context: string } | null;
    revisit: { entityId: string; label: string }[];
  }) => {
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

  it('keeps the answer hidden until the reader asks for it', () => {
    const fixture = setup({
      recall: {
        question: 'Que ligação o acervo registra entre Marx e O capital?',
        answer: 'Marx escreveu O capital.',
        context: 'O vínculo está documentado na obra.',
      },
      revisit: [],
    });
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Revisão do capítulo');
    expect(host.textContent).toContain('Que ligação o acervo registra');
    expect(host.querySelector('.review-answer')).toBeNull();
    const button = host.querySelector<HTMLButtonElement>('.review-toggle')!;
    expect(button.getAttribute('aria-expanded')).toBe('false');
    button.click();
    fixture.detectChanges();
    expect(host.querySelector('.review-answer')?.textContent).toContain('Marx escreveu O capital.');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.textContent).toContain('Ocultar resposta');
    button.click();
    fixture.detectChanges();
    expect(host.querySelector('.review-answer')).toBeNull();
  });

  it('lists the records from two chapters ago as compact links', () => {
    const fixture = setup({
      recall: null,
      revisit: [
        { entityId: 'person-karl-marx', label: 'Karl Marx' },
        { entityId: 'work-capital-volume-i', label: 'O capital' },
      ],
    });
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.review-link')).toHaveLength(2);
    expect(host.textContent).toContain('Dois capítulos atrás');
    expect(host.querySelector('.review-toggle')).toBeNull();
    expect(host.querySelector('.review-link')?.textContent).toContain('Abrir ficha');
  });
});
