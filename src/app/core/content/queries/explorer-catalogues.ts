// Kept apart from the search functions so the home, header and footer can import the catalogue
// metadata without pulling the discovery index and its full content schemas into the initial bundle.

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
    description: 'Busque em todo o acervo: registros, fontes e exemplos de metodologia.',
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
    description: 'Identidades estatais e recortes territoriais com fontes e limites explícitos.',
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
    description: 'Lugares e espaços documentados, distintos dos registros de países.',
  },
] as const;
