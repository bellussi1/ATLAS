import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { PLATFORM_ID } from '@angular/core';
import { AppComponent } from './app';
import { routes as appRoutes } from './app.routes';
import { editorialEntries } from './content/editorial-entries';

describe('ATLAS application', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter(appRoutes), { provide: PLATFORM_ID, useValue: 'server' }],
    }).compileComponents();
  });

  it('offers a working search from the homepage', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent?.replace(/\s+/g, ' ')).toContain(
      'Tudo se liga.',
    );
    expect(root.textContent).toContain('História, política, economia e sociedade');
    expect(root.querySelector('[role="search"] input')?.hasAttribute('readonly')).toBe(false);
    expect(root.querySelector('[role="search"] button[type="submit"]')).not.toBeNull();
  });

  it('updates the page description and canonical path without query or fragment', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/conhecimento?q=metodologia#resultados');
    fixture.detectChanges();
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.ownerDocument.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href'))
      .toBe('/conhecimento');
    expect(root.ownerDocument.querySelector<HTMLMetaElement>('meta[name="description"]')?.content)
      .toContain('Pesquise verbetes');
  });

  it('uses the actual record title, description, and breadcrumb for verbete SEO', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/verbete/ulysses-guimaraes');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(TestBed.inject(Title).getTitle()).toBe('Ulysses Guimarães — ATLAS');
    const root = fixture.nativeElement as HTMLElement;
    expect(root.ownerDocument.querySelector<HTMLMetaElement>('meta[name="description"]')?.content)
      .toContain('Deputado que presidiu a Assembleia Nacional Constituinte');
    expect(root.querySelector('nav[aria-label="Breadcrumb"] [aria-current="page"]')?.textContent)
      .toBe('Ulysses Guimarães');
  });

  it('shows the source edition, locator, access date, and actual pending review status', async () => {
    const harness = await RouterTestingHarness.create('/verbete/constituicao-de-1988');
    const root = harness.routeNativeElement!;
    expect(root.querySelector('.eyebrow')?.textContent).toContain('Artigo');
    expect(root.textContent).toContain('Constituição Federal de 1988');
    expect(root.textContent).toContain('Art. 5º, caput');
    expect(root.textContent).toContain('31/10/2026');
    expect(root.textContent).toContain('Revisão editorial pendente');
    expect(root.textContent).toContain('Sustenta: Constituição Federal de 1988');
    expect(root.querySelector('a[href="https://www2.camara.leg.br/legin/fed/consti/1988/constituicao-1988-5-outubro-1988-322142-normaatualizada-pl.html"]')).not.toBeNull();
    expect(root.textContent).not.toContain('Revisado por');
    expect(root.querySelector('a[href="/fontes"]')?.textContent).toContain('Abrir biblioteca de fontes');
  });

  it('renders contextual profile details and sourced relations for a person record', async () => {
    const harness = await RouterTestingHarness.create('/verbete/ulysses-guimaraes');
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.querySelector('.entry-context')?.textContent).toContain('Atuação documentada em registros oficiais da Câmara dos Deputados');
    expect(root.querySelector('.entry-context')?.textContent).toContain('1916–1992');
    expect(root.querySelector('.related-records')?.textContent).toContain('Assembleia Nacional Constituinte de 1987–1988');
    expect(root.querySelector('.related-records a[href="/fontes"]')?.textContent).toContain('Consultar biblioteca de fontes');
  });

  it('renders a source library from registered sources and links to their related records', async () => {
    const harness = await RouterTestingHarness.create('/fontes');
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Biblioteca de fontes');
    expect(root.textContent).toContain('Constituição Federal de 1988 — Portal da Câmara dos Deputados');
    expect(root.textContent).toContain('Art. 5º, caput');
    expect(root.querySelector('a[href="/verbete/constituicao-de-1988"]')).not.toBeNull();
    expect(root.textContent).toContain('O estado registrado aparece junto a cada afirmação.');
  });

  it('offers the three product intents with working destinations', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();

    const entries = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('[data-entry]'),
    );
    expect(entries.map((entry) => entry.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      expect.stringContaining('Relações'),
      expect.stringContaining('Tempo e espaço'),
      expect.stringContaining('Conhecimento'),
    ]);
    expect(entries.map((entry) => entry.getAttribute('href'))).toEqual([
      '/relacoes',
      '/tempo-e-espaco',
      '/conhecimento',
    ]);
    expect(entries[1].textContent).toContain('Há acontecimentos datados no acervo');
    expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/laboratorio"]')).toBeNull();
  });

  it('searches historical entries across every registered atlas', async () => {
    const harness = await RouterTestingHarness.create('/conhecimento?q=ulysses');
    const root = harness.routeNativeElement as HTMLElement;
    const result = root.querySelector<HTMLAnchorElement>('.results a[href^="/verbete/ulysses-guimaraes"]');
    expect(result?.textContent).toContain('Ulysses Guimarães');
    expect(root.querySelector('[role="status"]')?.textContent).toContain('registros encontrados');
    expect(root.textContent).toContain('registros editoriais e históricos disponíveis');
  });

  it('searches aliases and narrows results by type and editorial state', async () => {
    const harness = await RouterTestingHarness.create('/conhecimento?q=Silveira%20Guimaraes&tipo=pessoa&estado=registered');
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.querySelector('#discovery-kind')).not.toBeNull();
    expect(root.querySelector('#discovery-state')).not.toBeNull();
    expect(root.querySelector('.results a[href^="/verbete/ulysses-guimaraes"]')?.textContent).toContain('Ulysses Guimarães');

    const kind = root.querySelector<HTMLSelectElement>('#discovery-kind')!;
    kind.value = 'evento';
    kind.dispatchEvent(new Event('change', { bubbles: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(root.querySelector('.results a')).toBeNull();
    expect(TestBed.inject(Router).url).toContain('tipo=evento');
  });

  it('indexes sources with stable anchors and gives every result an accessible preview action', async () => {
    const harness = await RouterTestingHarness.create('/conhecimento?q=Diário%20da%20Assembleia&tipo=fonte');
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.querySelector('.results a[href^="/fontes"]')?.getAttribute('href')).toContain('#source-source-diario-promulgacao');
    expect(root.querySelector('.results a[href^="/fontes"]')?.textContent)
      .toContain('Diário da Assembleia Nacional Constituinte');
    expect(root.querySelector('.results button[aria-haspopup="dialog"][aria-label*="Prévia"]')).not.toBeNull();
  });

  it('previews a discovery record in a dialog that restores focus when closed', async () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'browser' });
    const harness = await RouterTestingHarness.create('/conhecimento?q=Ulyss&tipo=pessoa');
    const trigger = harness.routeNativeElement!.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')!;
    expect(document.activeElement).not.toBe(trigger);
    trigger.click();
    await harness.fixture.whenStable();
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.textContent).toContain('Ulysses Guimarães');
    expect(dialog.getAttribute('aria-labelledby')).toBe('discovery-preview-title');
    expect(dialog.contains(document.activeElement)).toBe(true);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    await harness.fixture.whenStable();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('returns from a discovered record to its originating search and filters', async () => {
    const origin = '/conhecimento?q=Silveira%20Guimaraes&tipo=pessoa&estado=registered';
    const harness = await RouterTestingHarness.create(origin);
    const destination = harness.routeNativeElement!.querySelector<HTMLAnchorElement>('.results a[href^="/verbete/ulysses-guimaraes"]');
    expect(destination).not.toBeNull();
    await harness.navigateByUrl(destination!.getAttribute('href')!);
    expect(harness.routeNativeElement?.querySelector('.discovery-return')?.getAttribute('href')).toBe(origin);
  });

  it('restores the source type facet when returning to the originating search', async () => {
    const origin = '/conhecimento?q=Di%C3%A1rio%20da%20Assembleia&tipo=fonte';
    const harness = await RouterTestingHarness.create(`/fontes?origem=${encodeURIComponent(origin)}`);
    const returnLink = harness.routeNativeElement!.querySelector<HTMLAnchorElement>('.discovery-return')!;
    await harness.navigateByUrl(returnLink.getAttribute('href')!);
    expect(harness.routeNativeElement?.querySelector<HTMLSelectElement>('#discovery-kind')?.value).toBe('fonte');
  });

  it('shows reverse links as backlinks and completes a five-node path without broken destinations', async () => {
    const harness = await RouterTestingHarness.create('/verbete/promulgacao-constituicao-1988');
    const follow = async (selector: string, destination: string): Promise<void> => {
      const link = harness.routeNativeElement?.querySelector<HTMLAnchorElement>(selector);
      expect(link?.getAttribute('href')).toBe(destination);
      await harness.navigateByUrl(destination);
    };

    await follow('.related-records a[href="/verbete/constituicao-federal-1988"]', '/verbete/constituicao-federal-1988');
    await follow('.related-records a[href="/verbete/igualdade-perante-a-lei"]', '/verbete/igualdade-perante-a-lei');
    await follow('.related-records a[href="/verbete/constituicao-de-1988"]', '/verbete/constituicao-de-1988');
    await follow('.claim-reference a[href="/fontes#source-source-constitution-1988"]', '/fontes#source-source-constitution-1988');
    expect(harness.routeNativeElement?.querySelector('#source-source-constitution-1988')).not.toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('Links que apontam para esta fonte');
    expect(harness.routeNativeElement?.querySelector('a[href="/verbete/constituicao-de-1988"]')).not.toBeNull();
  });

  it('does not repeat the same relation as a backlink in a record', async () => {
    const harness = await RouterTestingHarness.create('/verbete/igualdade-perante-a-lei');
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.querySelectorAll('a[href="/verbete/constituicao-federal-1988"]')).toHaveLength(1);
    expect(root.querySelector('.related-records')?.textContent).toContain('é enunciada por');
  });

  it('integrates a sourced historical timeline and a selectable comparison table', async () => {
    const harness = await RouterTestingHarness.create('/tempo-e-espaco');
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.querySelector('[aria-labelledby="timeline-visual-title"]')).not.toBeNull();
    expect(root.querySelector('ol[aria-label="Alternativa textual navegável da linha do tempo"]')).not.toBeNull();
    expect(root.querySelector('[aria-labelledby="historical-comparison-title"] table')).not.toBeNull();
    expect(root.querySelector('.table-scroll')?.getAttribute('tabindex')).toBe('0');
    expect(root.querySelector('a[href="/fontes#source-source-constitution-1988"]')).not.toBeNull();
    expect(root.textContent).toContain('Período, fontes e limites');
  });

  it('submits the homepage search and opens its matching record', async () => {
    const harness = await RouterTestingHarness.create('/');
    const root = harness.routeNativeElement as HTMLElement;
    const input = root.querySelector<HTMLInputElement>('[role="search"] input')!;
    input.value = 'Ulysses Guimarães';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    harness.detectChanges();
    root.querySelector<HTMLFormElement>('[role="search"]')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(TestBed.inject(Router).url.startsWith('/conhecimento?q=')).toBe(true);
    expect(decodeURIComponent(TestBed.inject(Router).url)).toContain('Ulysses Guimarães');
    expect(harness.routeNativeElement?.querySelector('.results a[href^="/verbete/ulysses-guimaraes"]')?.textContent)
      .toContain('Ulysses Guimarães');
  });


  it('lets the reader select a real record and continue from its sheet', async () => {
    const harness = await RouterTestingHarness.create('/');
    const root = harness.routeNativeElement!;
    const choices = root.querySelectorAll<HTMLButtonElement>('.sheet-choice');
    expect(choices).toHaveLength(3);
    choices[1].click();
    harness.detectChanges();
    expect(root.querySelector('#sheet-title')?.textContent).toBe('Conhecimento com contexto');
    expect(choices[1].getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('.sheet-actions a')?.getAttribute('href')).toBe('/explorar/artigo/conhecimento-com-contexto');
    expect(root.querySelector('.selection-status')?.textContent).toContain('Conhecimento com contexto');
    expect(root.querySelector('.excerpt')?.textContent).toContain('Compreender relações');
    const select = root.querySelector<HTMLSelectElement>('#sheet-select')!;
    select.value = 'atlas-de-metodo';
    select.dispatchEvent(new Event('change'));
    harness.detectChanges();
    expect(root.querySelector('#sheet-title')?.textContent).toBe('Como navegar pelo atlas');
    expect(choices[2].getAttribute('aria-pressed')).toBe('true');

  });

  it('opens an accessible reading preview and restores focus on Escape', async () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'browser' });
    const harness = await RouterTestingHarness.create('/');
    const trigger = harness.routeNativeElement!.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')!;
    trigger.focus();
    trigger.click();
    await harness.fixture.whenStable();
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-labelledby')).toBe('preview-title');
    expect(dialog.textContent).toContain('Como funciona um verbete');
    expect(dialog.contains(document.activeElement)).toBe(true);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    await harness.fixture.whenStable();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('continues from the preview into the full reading and offers another path', async () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'browser' });
    const harness = await RouterTestingHarness.create('/');
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')!.click();
    await harness.fixture.whenStable();
    document.querySelector<HTMLAnchorElement>('[role="dialog"] .read-link')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/explorar/verbete/como-ler-um-verbete');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(harness.routeNativeElement!.querySelector('nav[aria-label="Seções desta leitura"]')).not.toBeNull();
    const next = harness.routeNativeElement!.querySelector<HTMLAnchorElement>('app-continue-reading a')!;
    expect(next.getAttribute('href')).toBe('/verbete/metodologia-do-atlas');
  });

  it('navigates reading sections with an anchor and focuses their heading', async () => {
    const harness = await RouterTestingHarness.create('/explorar/artigo/conhecimento-com-contexto');
    const links = harness.routeNativeElement!.querySelectorAll<HTMLAnchorElement>('app-reading-outline nav a');
    expect(links).toHaveLength(3);
    expect(links[1].getAttribute('href')).toBe('/explorar/artigo/conhecimento-com-contexto#section-1');
    links[1].click();
    await harness.fixture.whenStable();
    expect(document.activeElement?.id).toBe('section-1');
    expect(harness.routeNativeElement!.querySelector<HTMLDetailsElement>('app-reading-outline details')?.open).toBe(false);
    expect(harness.routeNativeElement!.querySelector('app-continue-reading a[href="/explorar/artigo/conhecimento-com-contexto"]')).toBeNull();
  });

  it('follows documented connections from concept to claim and source', async () => {
    const harness = await RouterTestingHarness.create('/relacoes');
    const root = harness.routeNativeElement!;
    Array.from(root.querySelectorAll<HTMLButtonElement>('.follow-connection')).find(button => button.textContent?.includes('Explorar Afirmação'))!.click();
    harness.detectChanges();
    expect(root.querySelector('.context h2')?.textContent).toBe('Afirmação sobre Metodologia do ATLAS');
    Array.from(root.querySelectorAll<HTMLButtonElement>('.follow-connection')).find(button => button.textContent?.includes('Regras editoriais'))!.click();
    harness.detectChanges();
    expect(root.querySelector('.context h2')?.textContent).toBe('Regras editoriais do repositório');
    expect(root.querySelector('.context')?.textContent).toContain('AGENTS.md');
  });

  it('exposes documented knowledge relations in the shared cross-atlas graph', async () => {
    const harness = await RouterTestingHarness.create('/relacoes');
    const root = harness.routeNativeElement!;
    const person = Array.from(root.querySelectorAll<HTMLButtonElement>('.record-index button'))
      .find((button) => button.textContent?.includes('Ulysses Guimarães'))!;
    expect(person).toBeDefined();
    person.click();
    harness.detectChanges();
    expect(root.querySelector('.context')?.textContent).toContain('presidiu');
    expect(root.querySelector('.context')?.textContent).toContain('Assembleia Nacional Constituinte');
    expect(root.querySelector('.context')?.textContent).toContain('Associação documentada');
  });

  it('submits homepage search to the knowledge collection', async () => {
    const harness = await RouterTestingHarness.create('/');
    const input = harness.routeNativeElement!.querySelector<HTMLInputElement>('#atlas-search')!;
    input.value = 'contexto';
    input.dispatchEvent(new Event('input'));
    harness.routeNativeElement!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Conhecimento');
    expect(TestBed.inject(Router).url).toBe('/conhecimento?q=contexto');
  });

  it('searches real records without accents and recovers from no results', async () => {
    const harness = await RouterTestingHarness.create('/conhecimento?q=evidencia');
    expect(harness.routeNativeElement?.querySelector('.results a')?.getAttribute('href'))
      .toContain('/verbete/metodologia-do-atlas');
    await harness.navigateByUrl('/conhecimento?q=registro-inexistente');
    expect(harness.routeNativeElement?.textContent).toContain('Nenhum registro corresponde');
    harness.routeNativeElement?.querySelector<HTMLButtonElement>('.results button')?.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelectorAll('.results a').length).toBeGreaterThan(0);
  });

  it('selects graph records and filters their category with contextual evidence', async () => {
    const harness = await RouterTestingHarness.create('/relacoes');
    const root = harness.routeNativeElement!;
    const filter = root.querySelector<HTMLSelectElement>('#node-kind')!;
    filter.value = 'Fonte';
    filter.dispatchEvent(new Event('change'));
    harness.detectChanges();
    const buttons = root.querySelectorAll<HTMLButtonElement>('.record-index button');
    expect(buttons.length).toBeGreaterThan(0);
    const editorialRules = Array.from(buttons).find((button) => button.textContent?.includes('Regras editoriais'))!;
    editorialRules.click();
    harness.detectChanges();
    expect(root.querySelector('.context')?.textContent).toContain('AGENTS.md');
    expect(root.querySelector('.context > a')?.getAttribute('href')).toBe('/fontes#source-source-editorial-rules');
    expect(root.querySelector('.connection-sources')?.textContent).toContain('Regras editoriais do repositório');
    expect(editorialRules.getAttribute('aria-pressed')).toBe('true');
    filter.value = 'Afirmação';
    filter.dispatchEvent(new Event('change'));
    harness.detectChanges();
    expect(root.querySelectorAll('.record-index button').length).toBeGreaterThanOrEqual(3);
    expect(root.querySelector('.context h2')?.textContent).toContain('Afirmação sobre');
  });

  it('shows the implemented timeline and states the remaining geographic limit', async () => {
    const harness = await RouterTestingHarness.create('/tempo-e-espaco');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Tempo e espaço');
    expect(harness.routeNativeElement?.textContent).toContain('Linha do tempo');
    expect(harness.routeNativeElement?.textContent).toContain('O acervo não fornece polígonos históricos');
    expect(harness.routeNativeElement?.querySelector('.timeline-list a[href="/verbete/promulgacao-constituicao-1988"]')).not.toBeNull();
  });

  it('filters timeline records and updates the comparison table with keyboard-operable controls', async () => {
    const harness = await RouterTestingHarness.create('/tempo-e-espaco');
    const root = harness.routeNativeElement as HTMLElement;
    const filter = root.querySelector<HTMLSelectElement>('#timeline-kind')!;
    filter.value = 'event';
    filter.dispatchEvent(new Event('change', { bubbles: true }));
    harness.detectChanges();
    expect(root.querySelectorAll('.timeline-list li')).toHaveLength(1);
    expect(root.querySelector('.timeline-list a')?.textContent).toContain('Promulgação');

    const addEvent = Array.from(root.querySelectorAll<HTMLButtonElement>('.comparison-choices button'))
      .find((button) => button.textContent?.includes('Comparar Promulgação'))!;
    addEvent.click();
    harness.detectChanges();
    expect(addEvent.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('table thead')?.textContent).toContain('Promulgação da Constituição Federal de 1988');
  });

  it('explains how to start again when the comparison has no selected records', async () => {
    const harness = await RouterTestingHarness.create('/tempo-e-espaco');
    const root = harness.routeNativeElement as HTMLElement;
    for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>('.comparison-choices button[aria-pressed="true"]'))) {
      button.click();
      harness.detectChanges();
    }
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Selecione registros para montar a comparação');
  });

  it('describes the relations network as populated by registered records', async () => {
    const harness = await RouterTestingHarness.create('/relacoes');
    expect(harness.routeNativeElement?.textContent).toContain('Cada ligação nomeia a relação e apresenta as fontes disponíveis');
    expect(harness.routeNativeElement?.textContent).toContain('Ulysses Guimarães');
  });

  it('offers graphic exploration doors and keeps footer destinations stable while recomposing', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(Array.from(root.querySelectorAll('.graphic-doors a')).map(a => a.getAttribute('href')))
      .toEqual(['/relacoes', '/tempo-e-espaco', '/conhecimento']);
    const destinations = () => Array.from(root.querySelectorAll('.footer-collage a')).map(a => a.getAttribute('href'));
    const original = destinations();
    const button = root.querySelector<HTMLButtonElement>('.composition-control button')!;
    button.focus();
    button.click();
    fixture.detectChanges();
    expect(root.querySelector('.footer-collage')?.getAttribute('data-composition')).toBe('1');
    expect(root.querySelector('.footer-collage')?.classList.contains('instant')).toBe(true);
    expect(root.querySelector('.composition-control [role="status"]')?.textContent).toContain('Composição 2 de 3');
    expect(document.activeElement).toBe(button);
    button.click();
    button.click();
    fixture.detectChanges();
    expect(root.querySelector('.footer-collage')?.getAttribute('data-composition')).toBe('0');
    expect(destinations()).toEqual(original);
    expect(root.querySelector('.site-footer a[href="/sistema"]')).not.toBeNull();
    await TestBed.inject(Router).navigateByUrl('/relacoes');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector('.graphic-doors a[aria-current="page"]')?.getAttribute('href')).toBe('/relacoes');

  });

  it('marks the active primary navigation link for assistive technology', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/explorar');
    await fixture.whenStable();
    fixture.detectChanges();

    const activeLink = (fixture.nativeElement as HTMLElement).querySelector(
      'nav[aria-label="Navegação principal"] a[aria-current="page"]',
    );
    expect(activeLink?.textContent?.trim()).toBe('Explorar');
  });

  it('keeps the skip link on the current route when a base URL is present', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    await router.navigateByUrl('/conhecimento?q=contexto');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('.skip-link')
        ?.getAttribute('href'),
    ).toBe('/conhecimento?q=contexto#conteudo');
  });

  it('moves keyboard focus to the main content when the skip link is activated', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    await router.navigateByUrl('/sistema');
    await fixture.whenStable();
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('.skip-link')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(document.activeElement).toBe(
      (fixture.nativeElement as HTMLElement).querySelector('main'),
    );
  });

  it('leaves retired laboratory URLs on the useful not-found page', async () => {
    const harness = await RouterTestingHarness.create('/laboratorio');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Esta página não existe');

    await harness.navigateByUrl('/laboratorio/a/inicio');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Esta página não existe');
  });

  it('renders a working index for every editorial category', async () => {
    const harness = await RouterTestingHarness.create('/explorar');
    const root = harness.routeNativeElement as HTMLElement;
    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-content-type]'));

    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Explorar conteúdos');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/explorar/verbete',
      '/explorar/artigo',
      '/explorar/dossie',
      '/explorar/pessoa',
      '/explorar/evento',
      '/explorar/atlas',
      '/explorar/visualizacao',
      '/explorar/trilha',
    ]);
  });

  it.each([
    ['/explorar/verbete', 'Verbetes'],
    ['/explorar/artigo', 'Artigos'],
    ['/explorar/dossie', 'Dossiês'],
    ['/explorar/pessoa', 'Pessoas'],
    ['/explorar/evento', 'Eventos'],
    ['/explorar/atlas', 'Atlas'],
    ['/explorar/visualizacao', 'Visualizações'],
    ['/explorar/trilha', 'Trilhas'],
  ])('opens the category index at %s', async (url, heading) => {
    const harness = await RouterTestingHarness.create(url);
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent?.trim()).toBe(heading);
    expect(root.querySelector('[data-detail-link], .registered-entries a')).not.toBeNull();
    expect(root.querySelector('app-content-summary section[aria-labelledby="category-summary-title"] h2')
      ?.textContent?.trim()).toBe('Sobre esta categoria');
  });

  it.each([
    ['/explorar/artigo', '/verbete/constituicao-de-1988', 'O caput do artigo 5º da Constituição de 1988'],
    ['/explorar/pessoa', '/verbete/ulysses-guimaraes', 'Ulysses Guimarães'],
    ['/explorar/evento', '/verbete/promulgacao-constituicao-1988', 'Promulgação da Constituição Federal de 1988'],
  ])('links a real %s record from its editorial category', async (url, target, title) => {
    const harness = await RouterTestingHarness.create(url);
    const link = harness.routeNativeElement?.querySelector<HTMLAnchorElement>(`.registered-entries a[href="${target}"]`);
    expect(link).not.toBeNull();
    expect(link?.closest('article')?.textContent).toContain(title);
  });

  it.each([
    [
      '/explorar/verbete/como-ler-um-verbete',
      'Como funciona um verbete',
      'Verbete de metodologia',
    ],
    [
      '/explorar/artigo/conhecimento-com-contexto',
      'Conhecimento com contexto',
      'Artigo de metodologia',
    ],
    ['/explorar/atlas/atlas-de-metodo', 'Como navegar pelo atlas', 'Atlas de metodologia'],
  ])('renders a real methodology exemplar at %s', async (url, heading, label) => {
    const harness = await RouterTestingHarness.create(url);
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent?.trim()).toBe(heading);
    expect(root.textContent).toContain(label);
  });

  it('links the editorial verbete to the validated canonical record', async () => {
    const harness = await RouterTestingHarness.create(
      '/explorar/verbete/como-ler-um-verbete',
    );

    expect(
      harness.routeNativeElement?.querySelector<HTMLAnchorElement>('.related-entry')?.getAttribute('href'),
    ).toBe('/verbete/metodologia-do-atlas');
  });

  it.each(editorialEntries.map((entry) => [
    `/explorar/${entry.type}/${entry.slug}`,
    entry.title,
    entry.statusLabel,
  ]))('renders the editorial detail %s', async (url, heading, status) => {
    const harness = await RouterTestingHarness.create(url);
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent?.trim()).toBe(heading);
    expect(root.textContent).toContain(status);
    expect(root.querySelectorAll('article section').length).toBeGreaterThan(0);
    expect(root.querySelector('app-content-summary section[aria-labelledby="page-summary-title"] h2')
      ?.textContent?.trim()).toBe('Resumo');
    expect(root.querySelector('[data-editorial-status]')?.getAttribute('data-editorial-status'))
      .toBe(status === 'Formato previsto' ? 'previsto' : 'exemplar');
    if (status === 'Formato previsto') {
      expect(root.textContent).toContain('ainda não há publicação temática neste registro');
    }
  });

  it('switches the reading template between short and long entries', async () => {
    const harness = await RouterTestingHarness.create('/explorar/dossie/como-o-atlas-organiza-dossies');
    expect(harness.routeNativeElement?.querySelectorAll('.article-section')).toHaveLength(1);
    expect(harness.routeNativeElement?.querySelectorAll('app-reading-outline nav a')).toHaveLength(1);

    await harness.navigateByUrl('/explorar/artigo/conhecimento-com-contexto');
    expect(harness.routeNativeElement?.querySelectorAll('.article-section')).toHaveLength(3);
    expect(harness.routeNativeElement?.querySelectorAll('app-reading-outline nav a')).toHaveLength(3);

    await harness.navigateByUrl('/explorar/dossie/como-o-atlas-organiza-dossies');
    expect(harness.routeNativeElement?.querySelectorAll('.article-section')).toHaveLength(1);
  });

  it.each([
    ['/explorar/formato-inexistente', 'Categoria não encontrada'],
    ['/explorar/verbete/slug-inexistente', 'Este conteúdo não existe'],
  ])('shows a recoverable not-found state at %s', async (url, heading) => {
    const harness = await RouterTestingHarness.create(url);
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent?.trim()).toBe(heading);
    expect(root.querySelector('a[href="/explorar"]')).not.toBeNull();
  });

  it('exposes the planned study trail as a real platform-method page', async () => {
    const harness = await RouterTestingHarness.create('/estudar');
    const link = harness.routeNativeElement?.querySelector<HTMLAnchorElement>('[data-trail-link]');
    expect(link?.getAttribute('href')).toBe('/estudar/como-usar-trilhas');

    await harness.navigateByUrl('/estudar/como-usar-trilhas');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe(
      'Organização das trilhas',
    );
  });

  it('provides breadcrumbs and a return path on unknown routes', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    await router.navigateByUrl('/explorar/verbete/como-ler-um-verbete');
    fixture.detectChanges();

    let root = fixture.nativeElement as HTMLElement;
    const breadcrumbs = root.querySelector('nav[aria-label="Breadcrumb"]')?.textContent ?? '';
    expect(breadcrumbs).toContain('Verbetes');
    expect(breadcrumbs.match(/Explorar/g)).toHaveLength(1);
    expect(root.querySelector('nav[aria-label="Breadcrumb"] [aria-current="page"]')?.textContent)
      .toContain('Como funciona um verbete');

    await router.navigateByUrl('/caminho-inexistente');
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent).toContain('Esta página não existe');
    expect(root.querySelector('nav[aria-label="Breadcrumb"]')).not.toBeNull();
    expect(root.querySelector('a.home-link')?.getAttribute('href')).toBe('/');
    expect(root.querySelector('nav[aria-label="Outros caminhos do ATLAS"] a[href="/conhecimento"]')).not.toBeNull();
    expect(root.querySelector('nav[aria-label="Outros caminhos do ATLAS"] a[href="/explorar"]')).not.toBeNull();
  });

  it.each([
    ['/explorar', 'Explorar conteúdos'],
    ['/estudar', 'Trilhas de estudo'],
    ['/sobre', 'Sobre o ATLAS'],
    ['/fontes', 'Biblioteca de fontes'],
    ['/rota-inexistente', 'Esta página não existe'],
  ])('renders the right page at %s', async (url, heading) => {
    const harness = await RouterTestingHarness.create(url);
    expect(harness.routeNativeElement?.textContent).toContain(heading);
  });

  it('opens the validated methodology record at its canonical verbete route', async () => {
    const harness = await RouterTestingHarness.create('/verbete/metodologia-do-atlas');
    const root = harness.routeNativeElement as HTMLElement;

    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Metodologia do ATLAS');
    expect(root.textContent).toContain('Afirmações históricas exigem evidência contextual');
  });

  it('shows a recoverable not-found state for an unknown canonical verbete', async () => {
    const harness = await RouterTestingHarness.create('/verbete/slug-inexistente');
    const root = harness.routeNativeElement as HTMLElement;

    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Este verbete não existe');
    expect(root.querySelector('a[href="/explorar/verbete"]')).not.toBeNull();
  });

  it('opens the accessible design-system showroom with component examples and states', async () => {
    const harness = await RouterTestingHarness.create('/sistema');
    const root = harness.routeNativeElement as HTMLElement;

    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Sistema visual do ATLAS');
    expect(root.querySelector('nav[aria-label="Nesta página"]')).not.toBeNull();
    expect(root.querySelector('nav[aria-label="Nesta página"] a')?.getAttribute('href'))
      .toBe('/sistema#tokens');
    expect(root.querySelector('app-content-summary section[aria-labelledby="showroom-summary-title"] h2')
      ?.textContent?.trim()).toBe('Resumo');
    expect(root.querySelector('app-disclosure details summary')?.textContent?.trim())
      .toContain('Como usar');
    expect(Array.from(root.querySelectorAll('[role="status"]')).some((notice) =>
      notice.textContent?.includes('Nenhum resultado'),
    )).toBe(true);
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Revise o endereço');
    expect(root.querySelectorAll('[role="alert"]')).toHaveLength(1);
    const busyButton = root.querySelector<HTMLButtonElement>('app-button button[aria-busy="true"]');
    expect(busyButton?.textContent).toContain('Preparando conteúdo');
    expect(busyButton?.disabled).toBe(true);
    expect(root.querySelector('input[aria-invalid="true"]')).not.toBeNull();
  });

  it('links to the design-system showroom from the global footer', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/sistema"]')?.textContent)
      .toContain('Sistema visual');
  });
});
