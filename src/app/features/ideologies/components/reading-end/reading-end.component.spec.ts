import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ResolvedReadingConnection } from '@ideologies/data/ideology-readings';
import { provideContentFixture } from '@testing/content-fixture';

import { IdeologyReadingEndComponent } from './reading-end.component';

function connection(overrides: Partial<ResolvedReadingConnection> = {}): ResolvedReadingConnection {
  return {
    slug: 'liberalismo',
    label: 'Liberalismo',
    relation: 'contraste',
    question: 'O que separa a crítica da propriedade da liberdade individual?',
    reason: 'Compara a crítica da propriedade com a defesa da liberdade individual.',
    ...overrides,
  };
}

describe('Ideology reading end', () => {
  function setup(
    connections: readonly ResolvedReadingConnection[],
    lead: ResolvedReadingConnection | null = null,
  ) {
    TestBed.configureTestingModule({
      imports: [IdeologyReadingEndComponent],
      providers: [provideRouter([]), provideHttpClient(), ...provideContentFixture()],
    });
    const fixture = TestBed.createComponent(IdeologyReadingEndComponent);
    fixture.componentRef.setInput('connections', connections);
    fixture.componentRef.setInput('lead', lead);
    fixture.detectChanges();
    return fixture;
  }

  it('renders a link per path with its relation, question and reason', () => {
    const fixture = setup([connection()]);
    const root = fixture.nativeElement as HTMLElement;
    const card = root.querySelector<HTMLAnchorElement>('.end-card')!;
    expect(card.getAttribute('href')).toBe('/leitura/liberalismo');
    expect(card.textContent).toContain('Contraste');
    expect(card.textContent).toContain('O que separa a crítica da propriedade');
    expect(card.textContent).toContain('Compara a crítica da propriedade');
    expect(root.textContent).toContain('Voltar à página inicial');
    expect(root.querySelector('.reading-end h2')?.textContent).toContain('As perguntas continuam');
  });

  it('gives the curated lead the wide card and never duplicates it as a second path', () => {
    const lead = connection({ lead: true });
    const second = connection({
      slug: 'anarquismo',
      label: 'Anarquismo',
      relation: 'divergencia',
      question: 'O que separa as duas críticas ao Estado?',
    });
    const fixture = setup([lead, second], lead);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.end-card')).toHaveLength(2);
    expect(root.querySelectorAll('li[data-lead="true"]')).toHaveLength(1);
    expect(root.querySelector('li[data-lead="true"]')?.textContent).toContain('Liberalismo');
    expect(root.querySelector('li[data-lead="true"] + li')?.textContent).toContain('Anarquismo');
  });

  it('uses geometric compositions for every path card, even when an imageEntityId exists', () => {
    const fixture = setup([connection({ imageEntityId: 'ideology-liberalism' })]);
    const root = fixture.nativeElement as HTMLElement;
    const media = root.querySelector('.end-card-media') as HTMLElement;
    expect(media.querySelector('img')).toBeNull();
    expect(media.querySelector('app-geometric-mosaic')).not.toBeNull();
    expect(root.querySelector('.end-credits')).toBeNull();
  });

  it('explains an empty ending without inventing a path', () => {
    const fixture = setup([]);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.reading-empty')?.textContent).toContain(
      'Não há outra leitura publicada',
    );
    expect(root.querySelector('.end-card')).toBeNull();
  });

  it('links related itineraries and a focused graph view when readingSlug is provided', () => {
    TestBed.configureTestingModule({
      imports: [IdeologyReadingEndComponent],
      providers: [provideRouter([]), provideHttpClient(), ...provideContentFixture()],
    });
    const fixture = TestBed.createComponent(IdeologyReadingEndComponent);
    fixture.componentRef.setInput('connections', [connection()]);
    fixture.componentRef.setInput('readingSlug', 'marxismo');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const links = [...root.querySelectorAll<HTMLAnchorElement>('.reading-end-trail')].map((a) =>
      a.getAttribute('href'),
    );
    expect(links).toContain('/itinerario/comparativo-liberdade');
    expect(links).toContain('/grafos?no=ideology-marxism');
  });
});
