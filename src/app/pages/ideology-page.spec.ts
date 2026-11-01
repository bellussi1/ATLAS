import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';

import { routes } from '../app.routes';
import { ContentRepository, methodologyKnowledgeGraph } from '../core/content-repository';
import type { IdeologyDossier } from '../core/ideology-page-schema';
import { IdeologyPageComponent } from './ideology-page';

describe('Ideology reading states', () => {
  it('shows a loading state, recoverable error and retries without leaving the route', async () => {
    const response = new Subject<IdeologyDossier | null>();
    let requests = 0;
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: ContentRepository,
          useValue: {
            knowledgeGraph: methodologyKnowledgeGraph,
            loadIdeology: () => {
              requests++;
              return requests === 1 ? response.asObservable() : of(null);
            },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(IdeologyPageComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Carregando a leitura');
    response.error(new Error('Unavailable'));
    fixture.detectChanges();
    expect(root.textContent).toContain('Não foi possível carregar');
    root.querySelector<HTMLButtonElement>('button')?.click();
    fixture.detectChanges();
    expect(requests).toBe(2);
    expect(root.textContent).toContain('Esta leitura ainda não está disponível');
    expect(root.querySelector('a[href="/"]')).not.toBeNull();
  });
});
