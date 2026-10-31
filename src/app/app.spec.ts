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

  it('introduces the project and keeps search visibly inactive', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent?.replace(/\s+/g, ' ')).toContain(
      'Compreender o mundo',
    );
    expect(root.textContent).toContain('história, política, economia e sociedade');
    expect(root.querySelector('[role="search"] input')?.hasAttribute('readonly')).toBe(true);
    expect(root.textContent).toContain('A busca ainda não está disponível');
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
      expect.stringContaining('Tenho uma dúvida'),
      expect.stringContaining('Quero explorar'),
      expect.stringContaining('Quero estudar'),
    ]);
    expect(entries.map((entry) => entry.getAttribute('href'))).toEqual([
      '/explorar/verbete/como-ler-um-verbete',
      '/explorar',
      '/estudar',
    ]);
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
    await router.navigateByUrl('/laboratorio/a/artigo');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('.skip-link')
        ?.getAttribute('href'),
    ).toBe('/laboratorio/a/artigo#conteudo');
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
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe(heading);
    expect(harness.routeNativeElement?.querySelector('[data-detail-link]')).not.toBeNull();
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
});
