import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { entityContext } from '@core/content/queries/entity-context';
import { type ContentRepository } from '@core/content/repositories/content-repository.service';
import { provideContentFixture } from '@testing/content-fixture';
import { methodologyKnowledgeGraph } from '@testing/content-fixture';

import { KnowledgeContextComponent } from './knowledge-context.component';

describe('KnowledgeContextComponent', () => {
  it('follows a real relation and returns to the same record and connection', async () => {
    const record = entityContext(
      { knowledgeGraph: methodologyKnowledgeGraph } as ContentRepository,
      'person-karl-marx',
    );
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        ...provideContentFixture(),
        provideHttpClient(),
        { provide: DIALOG_DATA, useValue: { record, stops: [], index: -1 } },
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
    host.querySelector<HTMLButtonElement>('.context-trail button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.record()).toBe(record);
    expect(fixture.componentInstance.history()).toEqual([]);
    expect(host.querySelector('[data-connection="relation-marx-capital"]')).not.toBeNull();
  });

  it('renders editorial records with missing URLs and no connections without false links', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        ...provideContentFixture(),
        provideHttpClient(),
        { provide: DialogRef, useValue: { close: vi.fn() } },
        {
          provide: DIALOG_DATA,
          useValue: {
            stops: [],
            index: -1,
            record: {
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

  describe('reading order and comparison', () => {
    const repository = { knowledgeGraph: methodologyKnowledgeGraph } as ContentRepository;
    const record = entityContext(repository, 'person-karl-marx');
    const stops = [
      'person-karl-marx',
      ...record.connections.slice(0, 2).map((connection) => connection.entityId),
    ].map((id) => ({ key: id, request: { entityId: id } }));
    const setup = (index: number) => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          ...provideContentFixture(),
          provideHttpClient(),
          { provide: DIALOG_DATA, useValue: { record, stops, index } },
          { provide: DialogRef, useValue: { close: vi.fn() } },
        ],
      });
      const fixture = TestBed.createComponent(KnowledgeContextComponent);
      fixture.detectChanges();
      return fixture;
    };

    it('shows where the reader is and disables the ends of the order', () => {
      const fixture = setup(0);
      const host = fixture.nativeElement as HTMLElement;
      expect(host.querySelector('.context-position')?.textContent).toBe(`1 de ${stops.length}`);
      const [previous, next] = Array.from(
        host.querySelectorAll<HTMLButtonElement>('.context-steps button'),
      );
      expect(previous.disabled).toBe(true);
      expect(next.disabled).toBe(false);
      fixture.componentInstance.step(-1);
      expect(fixture.componentInstance.index()).toBe(0);
    });

    it('steps to the next record and updates the position', () => {
      const fixture = setup(0);
      const before = fixture.componentInstance.record().title;
      fixture.componentInstance.step(1);
      fixture.detectChanges();
      expect(fixture.componentInstance.index()).toBe(1);
      expect(fixture.componentInstance.record().title).not.toBe(before);
      expect(
        (fixture.nativeElement as HTMLElement).querySelector('.context-position')?.textContent,
      ).toBe(`2 de ${stops.length}`);
    });

    it('hides the steps when there is nothing to step through', () => {
      const fixture = setup(-1);
      expect((fixture.nativeElement as HTMLElement).querySelector('.context-steps')).toBeNull();
    });

    it('pins a sheet as a labelled column and releases it', () => {
      const fixture = setup(0);
      const host = fixture.nativeElement as HTMLElement;
      fixture.componentInstance.pin();
      fixture.detectChanges();
      expect(host.querySelector('aside.pinned')?.getAttribute('aria-label')).toContain(
        fixture.componentInstance.record().title,
      );
      fixture.componentInstance.step(1);
      fixture.detectChanges();
      expect(host.querySelector('aside.pinned h2')?.textContent).toContain('Karl Marx');
      expect(host.querySelector('#knowledge-context-title')?.textContent).not.toContain(
        'Karl Marx',
      );
      fixture.componentInstance.unpin();
      fixture.detectChanges();
      expect(host.querySelector('aside.pinned')).toBeNull();
    });
  });
});
