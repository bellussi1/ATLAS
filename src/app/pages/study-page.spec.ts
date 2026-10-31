import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StudyPage } from './study-page';
import { STORAGE_KEY } from '../core/study-progress';

describe('study practice', () => {
  beforeEach(() => { localStorage.removeItem(STORAGE_KEY); TestBed.configureTestingModule({ providers: [provideRouter([])] }); });
  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it('allows retry, persists an answer and preserves progress after an invalid import', () => {
    const fixture = TestBed.createComponent(StudyPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const wrong = root.querySelector<HTMLInputElement>('input[value="popularity"]')!;
    wrong.checked = true; wrong.dispatchEvent(new Event('change'));
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
    expect(root.textContent).toContain('Tente novamente');
    const correct = root.querySelector<HTMLInputElement>('input[value="source"]')!;
    correct.checked = true; correct.dispatchEvent(new Event('change'));
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
    expect(root.textContent).toContain('Atividade concluída');
    expect(localStorage.getItem(STORAGE_KEY)).toContain('evidencia-em-contexto');
    const textarea = root.querySelector<HTMLTextAreaElement>('textarea')!;
    Array.from(root.querySelectorAll('button')).find(button => button.textContent?.includes('Exportar'))!.click();
    fixture.detectChanges();
    const exported = textarea.value;
    expect(exported).toContain('evidencia-em-contexto');
    localStorage.removeItem(STORAGE_KEY);
    textarea.dispatchEvent(new Event('input'));
    Array.from(root.querySelectorAll('button')).find(button => button.textContent?.includes('Importar'))!.click();
    fixture.detectChanges();
    expect(localStorage.getItem(STORAGE_KEY)).toContain('evidencia-em-contexto');
    textarea.value = '{"version":99}'; textarea.dispatchEvent(new Event('input'));
    Array.from(root.querySelectorAll('button')).find(button => button.textContent?.includes('Importar'))!.click();
    fixture.detectChanges();
    expect(root.textContent).toContain('progresso atual foi preservado');
    expect(localStorage.getItem(STORAGE_KEY)).toContain('evidencia-em-contexto');
  });
});
