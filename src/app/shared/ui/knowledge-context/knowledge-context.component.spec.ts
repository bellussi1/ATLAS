import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { entityContext } from '@core/content/queries/entity-context';
import {
  type ContentRepository,
  methodologyKnowledgeGraph,
} from '@core/content/repositories/content-repository.service';

import { KnowledgeContextComponent } from './knowledge-context.component';

describe('KnowledgeContextComponent', () => {
  it('follows a real relation and returns to the same record and connection', async () => {
    const record = entityContext(
      { knowledgeGraph: methodologyKnowledgeGraph } as ContentRepository,
      'person-karl-marx',
    );
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: DIALOG_DATA, useValue: record },
        { provide: DialogRef, useValue: { close: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(KnowledgeContextComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const connection = host.querySelector<HTMLButtonElement>(
      '[data-connection="relation-marx-capital"]',
    )!;
    connection.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.querySelector('h2')?.textContent).toBe('O capital: volume I');
    expect(host.textContent).toContain('foi escrito por');
    host.querySelector<HTMLButtonElement>('.context-back')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.record()).toBe(record);
    expect(fixture.componentInstance.history()).toEqual([]);
    expect(host.querySelector('[data-connection="relation-marx-capital"]')).not.toBeNull();
  });

  it('renders editorial records with missing URLs and no connections without false links', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: DialogRef, useValue: { close: vi.fn() } },
        {
          provide: DIALOG_DATA,
          useValue: {
            title: 'Recorte editorial',
            kind: 'Nota',
            summary: 'Resumo',
            paragraphs: [],
            connections: [],
            sources: [
              {
                id: 'source-note',
                title: 'Fonte impressa',
                url: null,
                edition: 'Edição registrada',
                publicationDate: null,
              },
            ],
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(KnowledgeContextComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Não há conexões registradas');
    expect(host.textContent).toContain('Fonte impressa');
    expect(host.querySelector('a')).toBeNull();
    expect(host.textContent).toContain('Estado editorial não informado');
  });
});
