// Kept apart from the search functions so the home, header and footer can import the catalogue
// metadata without pulling the discovery index and its full content schemas into the initial bundle.

/** Canonical address of a catalogue: the archive is the only entry point. */
export const catalogueUrl = (path: string) => (path === 'acervo' ? '/acervo' : `/acervo/${path}`);

/**
 * Reader-facing order inside the archive tree. It is intentionally independent from the table
 * order above: the tree groups what is read together, then the context records, then places.
 */
export const explorerRecordCatalogueOrder = [
  'entidades',
  'pessoas',
  'ideologias',
  'obras',
  'conceitos',
  'paises',
  'estados',
  'cidades',
  'locais',
  'regimes',
  'partidos',
  'instituicoes',
  'acontecimentos',
  'lugares',
] as const;

export const explorerGroups = [
  { id: 'acervo', title: 'Acervo' },
  { id: 'ideias', title: 'Ideias e pessoas' },
  { id: 'contexto', title: 'Contexto e instituições' },
  { id: 'fontes', title: 'Fontes' },
] as const;

export const explorerCatalogues = [
  {
    group: 'acervo',
    path: 'acervo',
    title: 'Acervo',
    description: 'Busque em todo o acervo: registros, fontes e leituras contínuas.',
  },
  {
    group: 'ideias',
    path: 'entidades',
    title: 'Entidades',
    description: 'Pessoas, ideias, obras, acontecimentos e instituições em contexto.',
  },
  {
    group: 'ideias',
    path: 'ideologias',
    title: 'Ideologias',
    description: 'Tradições e ideias políticas, com suas conexões e fontes.',
  },
  {
    group: 'ideias',
    path: 'pessoas',
    title: 'Pessoas',
    description: 'Trajetórias e ideias nas relações registradas pelo acervo.',
  },
  {
    group: 'ideias',
    path: 'obras',
    title: 'Obras',
    description: 'Documentos e obras para investigar argumentos e contextos.',
  },
  {
    group: 'fontes',
    path: 'fontes',
    title: 'Fontes',
    description: 'Referências cadastradas e os registros que as citam.',
  },
  {
    group: 'contexto',
    path: 'paises',
    title: 'Países',
    description: 'Estados soberanos, atuais e históricos, com bandeira e recorte territorial.',
  },
  {
    group: 'contexto',
    path: 'estados',
    title: 'Estados',
    description: 'Estados, províncias, impérios e formações políticas históricas.',
  },
  {
    group: 'contexto',
    path: 'cidades',
    title: 'Cidades',
    description: 'Capitais e cidades com papel político, econômico ou cultural.',
  },
  {
    group: 'contexto',
    path: 'locais',
    title: 'Locais',
    description: 'Sítios, edifícios e marcos com significado histórico.',
  },
  {
    group: 'contexto',
    path: 'regimes',
    title: 'Regimes',
    description: 'Recortes temporais e classificações atribuídas, sem confundir país e governo.',
  },
  {
    group: 'contexto',
    path: 'partidos',
    title: 'Partidos',
    description: 'Registros de partidos, com contexto institucional e fontes identificadas.',
  },
  {
    group: 'contexto',
    path: 'instituicoes',
    title: 'Instituições',
    description: 'Instituições em seus contextos históricos e documentais.',
  },
  {
    group: 'contexto',
    path: 'acontecimentos',
    title: 'Acontecimentos',
    description: 'Acontecimentos datados e suas fontes, sem causalidade automática.',
  },
  {
    group: 'ideias',
    path: 'conceitos',
    title: 'Conceitos',
    description: 'Formulações e questões conceituais registradas no acervo.',
  },
  {
    group: 'contexto',
    path: 'lugares',
    title: 'Lugares',
    description: 'Regiões, continentes e termos geográficos.',
  },
] as const;
