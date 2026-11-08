import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NavigationFailureComponent } from './navigation-failure.component';

describe('NavigationFailureComponent', () => {
  function setup(
    path: string,
    options: { kind?: 'chunk' | 'route'; previousTitle?: string | null; retrying?: boolean } = {},
  ) {
    TestBed.configureTestingModule({
      imports: [NavigationFailureComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(NavigationFailureComponent);
    fixture.componentRef.setInput('path', path);
    fixture.componentRef.setInput('kind', options.kind ?? 'route');
    fixture.componentRef.setInput('previousTitle', options.previousTitle ?? null);
    fixture.componentRef.setInput('retrying', options.retrying ?? false);
    fixture.detectChanges();
    return fixture;
  }

  const text = (fixture: { nativeElement: unknown }) =>
    (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('names a reading failure and offers the reading index as the way out', () => {
    const fixture = setup('/leitura/marxismo', {
      kind: 'chunk',
      previousTitle: 'Liberalismo',
    });
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h2')?.textContent).toContain('A leitura não abriu');
    expect(text(fixture)).toContain('Um recurso necessário não carregou');
    expect(text(fixture)).toContain('Você continua em Liberalismo');
    expect(text(fixture)).toContain('/leitura/marxismo');
    const link = root.querySelector<HTMLAnchorElement>('.failure-actions a')!;
    expect(link.getAttribute('href')).toBe('/#leituras');
    expect(link.textContent).toContain('Ver outras leituras');
  });

  it('does not offer the previous page when the failure happened on first load', () => {
    const fixture = setup('/verbete/karl-marx', { previousTitle: null });
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h2')?.textContent).toContain('O verbete não abriu');
    expect(text(fixture)).not.toContain('Você continua em');
    expect(
      Array.from(root.querySelectorAll('button')).some((button) =>
        button.textContent?.includes('Continuar na página anterior'),
      ),
    ).toBe(false);
    expect(root.querySelector<HTMLAnchorElement>('.failure-actions a')?.getAttribute('href')).toBe(
      '/acervo',
    );
  });

  it('disables retry while the router is trying again', () => {
    const fixture = setup('/grafos', { retrying: true });
    const root = fixture.nativeElement as HTMLElement;
    const retry = root.querySelector<HTMLButtonElement>('.failure-actions button')!;
    expect(retry.disabled).toBe(true);
    expect(retry.textContent).toContain('Tentando novamente');
  });

  it('emits retry and dismiss from the visible controls', () => {
    const fixture = setup('/leitura/marxismo', { previousTitle: 'Marxismo' });
    const root = fixture.nativeElement as HTMLElement;
    let retried = 0;
    let dismissed = 0;
    fixture.componentInstance.retry.subscribe(() => (retried += 1));
    fixture.componentInstance.dismiss.subscribe(() => (dismissed += 1));
    root.querySelector<HTMLButtonElement>('.failure-actions .atlas-button')!.click();
    Array.from(root.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Continuar na página anterior'))!
      .click();
    expect(retried).toBe(1);
    expect(dismissed).toBe(1);
  });
});
