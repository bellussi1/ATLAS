import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TestBed } from '@angular/core/testing';
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
      'Exploração do conhecimento histórico',
    );
    expect(root.textContent).toContain('História, política, economia e sociedade');
    expect(root.querySelector('[role="search"] input')?.hasAttribute('readonly')).toBe(false);
    expect(root.querySelector('[role="search"] button[type="submit"]')).not.toBeNull();
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
  });


  it('lets the homepage inspect real evidence and switch to an accessible list', async () => {
    const harness = await RouterTestingHarness.create('/');
    const root = harness.routeNativeElement!;
    expect(root.querySelectorAll('app-evidence-network .network button')).toHaveLength(3);
    root.querySelectorAll<HTMLButtonElement>('.network button')[2].click();
    harness.detectChanges();
    expect(root.querySelector('.context')?.textContent).toContain('AGENTS.md');
    root.querySelector<HTMLButtonElement>('.view-toggle')!.click();
    harness.detectChanges();
    expect(root.querySelector('.view-toggle')?.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelectorAll('.network button')).toHaveLength(3);
    expect(root.querySelector('.network button[aria-pressed=true]')?.textContent).toContain('Regras editoriais');
    expect(root.querySelectorAll('.reading-index a')).toHaveLength(3);
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
    root.querySelector<HTMLButtonElement>('.follow-connection')!.click();
    harness.detectChanges();
    expect(root.querySelector('.context h2')?.textContent).toBe('Evidência contextual');
    const buttons = root.querySelectorAll<HTMLButtonElement>('.follow-connection');
    buttons[1].click();
    harness.detectChanges();
    expect(root.querySelector('.context h2')?.textContent).toBe('Regras editoriais do repositório');
    expect(root.querySelector('.context')?.textContent).toContain('AGENTS.md');
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
      .toBe('/verbete/metodologia-do-atlas');
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
    const buttons = root.querySelectorAll<HTMLButtonElement>('.network button');
    expect(buttons).toHaveLength(3);
    buttons[2].click();
    harness.detectChanges();
    expect(root.querySelector('.context')?.textContent).toContain('AGENTS.md');
    expect(buttons[2].getAttribute('aria-pressed')).toBe('true');
    const filter = root.querySelector<HTMLSelectElement>('#node-kind')!;
    filter.value = 'Afirmação';
    filter.dispatchEvent(new Event('change'));
    harness.detectChanges();
    expect(root.querySelectorAll('.network button')).toHaveLength(1);
    expect(root.querySelector('.network button')?.textContent).toContain('Evidência contextual');
    expect(root.querySelectorAll('.network svg line')).toHaveLength(0);
  });

  it('explains missing temporal data and offers a real reading path', async () => {
    const harness = await RouterTestingHarness.create('/tempo-e-espaco');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Tempo e espaço');
    expect(harness.routeNativeElement?.textContent).toContain('não contém acontecimentos com datas');
    expect(harness.routeNativeElement?.querySelector('.empty-collection a')?.getAttribute('href'))
      .toBe('/explorar/evento/como-o-atlas-contextualiza-eventos');
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
    await router.navigateByUrl('/laboratorio/a/artigo?q=contexto');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('.skip-link')
        ?.getAttribute('href'),
    ).toBe('/laboratorio/a/artigo?q=contexto#conteudo');
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

  it.each([
    ['/laboratorio/a/inicio', 'O mundo', 'poster-home__cartography'],
    ['/laboratorio/b/inicio', 'Percorra as relações.', 'map-home__archive'],
    ['/laboratorio/c/inicio', 'Vestígios, ideias', 'archive-map'],
  ])('renders proposal home %s with its distinct composition', async (url, heading, marker) => {
    const harness = await RouterTestingHarness.create(url);
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent).toContain(heading);
    expect(root.querySelector(`.${marker}`)).not.toBeNull();
    expect(root.querySelector('[aria-label="Páginas demonstrativas"]')).not.toBeNull();
  });

  it('updates the composition when navigating between proposal parameters', async () => {
    const harness = await RouterTestingHarness.create('/laboratorio/a/inicio');
    await harness.navigateByUrl('/laboratorio/b/inicio');
    expect(harness.routeNativeElement?.querySelector('.map-home__archive')?.getAttribute('href'))
      .toBe('/explorar/artigo/conhecimento-com-contexto');

    await harness.navigateByUrl('/laboratorio/c/inicio');
    expect(harness.routeNativeElement?.querySelector('.archive-map')).not.toBeNull();
  });

  it('keeps compact proposal names in the navigation for narrow screens', async () => {
    const harness = await RouterTestingHarness.create('/laboratorio/a/inicio');
    const links = Array.from(
      (harness.routeNativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>(
        '.lab__proposals a',
      ),
    );
    expect(links.map((link) => link.querySelector('.lab__proposal-short')?.textContent?.trim()))
      .toEqual(['Editorial', 'Atlas', 'Museu']);
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
      'Proposta A — Editorial modernista',
      'Proposta B — Atlas cartográfico',
      'Proposta C — Museu digital',
    ]);
  });

  it('names the archive navigation and the mocked museum composition', async () => {
    const harness = await RouterTestingHarness.create('/laboratorio/a/inicio');
    expect(harness.routeNativeElement?.querySelector('nav[aria-label="Acervo em destaque"]'))
      .not.toBeNull();

    await harness.navigateByUrl('/laboratorio/c/inicio');
    expect(
      harness.routeNativeElement?.querySelector('[role="group"][aria-label*="documentos simulados"]'),
    ).not.toBeNull();
  });

  it.each(['a', 'b', 'c'])('provides article and mock profile pages for proposal %s', async (proposal) => {
    const harness = await RouterTestingHarness.create(`/laboratorio/${proposal}/artigo`);
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe(
      'Conhecimento com contexto',
    );
    expect(harness.routeNativeElement?.textContent).toContain('conteúdo existente');

    await harness.navigateByUrl(`/laboratorio/${proposal}/perfil`);
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe(
      'Pesquisadora de Exemplo',
    );
    expect(harness.routeNativeElement?.textContent).toContain('PERFIL FICTÍCIO · MOCK');
  });

  it('keeps the three visual alternatives discoverable from the laboratory index', async () => {
    const harness = await RouterTestingHarness.create('/laboratorio');
    const links = Array.from(
      (harness.routeNativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>(
        '.lab-index nav a[href^="/laboratorio/"]',
      ),
    );
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/laboratorio/a/inicio',
      '/laboratorio/b/inicio',
      '/laboratorio/c/inicio',
    ]);
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
    expect(root.querySelector('[data-detail-link]')).not.toBeNull();
    expect(root.querySelector('app-content-summary section[aria-labelledby="category-summary-title"] h2')
      ?.textContent?.trim()).toBe('Sobre esta categoria');
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
  });

  it.each([
    ['/explorar', 'Explorar conteúdos'],
    ['/estudar', 'Trilhas de estudo'],
    ['/sobre', 'Sobre o ATLAS'],
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
