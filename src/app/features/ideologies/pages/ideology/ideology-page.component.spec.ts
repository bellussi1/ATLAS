import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { routes } from '@app/app.routes';
import type { IdeologyDossier } from '@ideologies/models/ideology-page.schema';
import { IdeologyRepository } from '@ideologies/services/ideology-repository.service';
import { provideContentFixture } from '@testing/content-fixture';
import { methodologyKnowledgeGraph } from '@testing/content-fixture';
import { of, Subject } from 'rxjs';

import { IdeologyPageComponent } from './ideology-page.component';

describe('Ideology reading states', () => {
  it('shows a loading state, recoverable error and retries without leaving the route', async () => {
    const response = new Subject<IdeologyDossier | null>();
    let requests = 0;
    TestBed.configureTestingModule({
      providers: [
        ...provideContentFixture(),
        provideRouter(routes),
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: IdeologyRepository,
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
