import type { TourDefinition, TourId } from './tour.types';

/**
 * One tour per page. Steps point at the page's own markup by selector (no imports from the
 * features), and a step whose target is absent or folded away is skipped, so the same list serves
 * the desktop and the phone layouts. Keep the copy to what the thing is and what to do with it.
 */
export const TOURS: Readonly<Record<TourId, TourDefinition>> = {
  leituras: {
    id: 'leituras',
    page: 'nas leituras',
    steps: [
      {
        selector: '.readings-index__head',
        title: 'Leituras contínuas',
        body: 'Cada leitura reúne um tema (uma corrente, uma pessoa, um período) em capítulos que vão do contexto às posições em debate, com as fontes à vista.',
        side: 'bottom',
      },
      {
        selector: '.readings-index__controls app-text-field',
        title: 'Filtrar por assunto',
        body: 'Digite um tema, um conceito ou uma palavra do resumo. A lista abaixo se ajusta enquanto você escreve.',
        side: 'bottom',
      },
      {
        selector: '.readings-index__chips',
        title: 'Estado de cada leitura',
        body: '"Com fontes" são leituras cujas fontes foram conferidas. "Versão preliminar" ainda está em construção e pode mudar. "Surpreenda-me" abre uma leitura ao acaso.',
        side: 'bottom',
      },
      {
        selector: '.readings-index__grid .reading-card',
        title: 'O cartão de uma leitura',
        body: 'O selo indica o estado editorial; abaixo estão o tempo de leitura e o número de capítulos. Clique em qualquer ponto do cartão para abrir a leitura.',
        side: 'top',
      },
      {
        selector: 'app-pagination',
        title: 'Mais leituras',
        body: 'As leituras aparecem em páginas. Use os números ou as setas para ver as demais.',
        side: 'top',
      },
    ],
  },
  leitura: {
    id: 'leitura',
    page: 'nesta leitura',
    steps: [
      {
        selector: '.poster-copy',
        title: 'Abertura',
        body: 'Aqui está o assunto em poucas linhas: o que é, de onde vem e por que importa.',
        side: 'bottom',
      },
      {
        selector: '.poster-questions',
        title: 'Comece por uma pergunta',
        body: 'Cada pergunta leva direto ao capítulo que a responde. É um jeito de entrar pelo que você quer saber.',
        side: 'top',
      },
      {
        selector: '.editorial-strip',
        title: 'Estado da revisão',
        body: 'O selo diz se a leitura tem as fontes conferidas ou se a revisão ainda está pendente. Abra para ver os detalhes.',
        side: 'bottom',
      },
      {
        selector: '.reading-index .desktop-nav',
        title: 'Nesta leitura',
        body: 'A lista de capítulos acompanha você: o capítulo atual fica marcado e a porcentagem mostra quanto já foi lido. Clique em um capítulo para ir até ele.',
        side: 'right',
      },
      {
        selector: '.reading-index .mobile-bar',
        title: 'Capítulos',
        body: 'A barra mostra o capítulo atual e o progresso. Use as setas para passar ao anterior ou ao próximo.',
        side: 'top',
      },
      {
        selector: '.chapter-narrative',
        title: 'O texto do capítulo',
        body: 'Cada capítulo parte de uma pergunta e segue em ordem: o que aconteceu, quem defendeu o quê e onde há desacordo.',
        side: 'top',
      },
      {
        selector: '.knowledge-term',
        title: 'Termos com mais',
        body: 'Palavras com o sinal de mais abrem uma definição curta ao passar o mouse, ao focar com o teclado ou ao tocar. Dali dá para abrir o verbete completo.',
        side: 'top',
      },
      {
        selector: '.chapter-aside, app-ideology-block',
        title: 'Linha do tempo, rede e comparações',
        body: 'Os blocos de apoio mostram o tema de outro ângulo: datas em sequência, ligações entre pessoas e ideias, ou posições lado a lado.',
        side: 'top',
      },
      {
        selector: '.chapter-sources',
        title: 'Fontes do capítulo',
        body: 'Abra para ver de onde vem cada afirmação. Fato documentado, interpretação e hipótese aparecem separados.',
        side: 'top',
      },
      {
        selector: 'app-ideology-reading-end',
        title: 'Para seguir',
        body: 'Ao final, a leitura sugere outras leituras e itinerários ligados ao tema.',
        side: 'top',
      },
    ],
  },
  itinerarios: {
    id: 'itinerarios',
    page: 'nos itinerários',
    steps: [
      {
        selector: '.itineraries__intro',
        title: 'Itinerários',
        body: 'Um itinerário é um percurso guiado por uma pergunta. Ele passa por leituras, verbetes e conexões em uma ordem pensada para você chegar à resposta.',
        side: 'bottom',
      },
      {
        selector: '.itineraries__filters',
        title: 'Tipos de percurso',
        body: 'Filtre pelo tipo de percurso. "Surpreenda-me" abre um itinerário ao acaso.',
        side: 'bottom',
      },
      {
        selector: '.itineraries__grid .itinerary-card',
        title: 'O cartão de um itinerário',
        body: 'Mostra a pergunta que o percurso responde, quantas paradas tem e o tipo. Clique em qualquer ponto do cartão para começar.',
        side: 'top',
      },
      {
        selector: '.itinerary-card__trail',
        title: 'Prévia das paradas',
        body: 'A trilha antecipa as primeiras paradas, e a forma de cada marcador diz se a parada é uma leitura, um verbete ou outra coisa.',
        side: 'top',
      },
    ],
  },
  itinerario: {
    id: 'itinerario',
    page: 'neste itinerário',
    steps: [
      {
        selector: '.itinerary__head-copy',
        title: 'A pergunta do percurso',
        body: 'O itinerário parte de uma pergunta. Logo abaixo está um resumo do caminho e as leituras por onde ele passa.',
        side: 'bottom',
      },
      {
        selector: '.itinerary__start',
        title: 'Começar pela primeira parada',
        body: 'Leva direto à parada 1. Você também pode entrar por qualquer parada, pelo índice.',
        side: 'bottom',
      },
      {
        selector: '.itinerary-index',
        title: 'Percurso',
        body: 'Lista todas as paradas na ordem. A parada atual fica marcada, e os desvios opcionais aparecem recuados abaixo da parada a que pertencem.',
        side: 'right',
      },
      {
        selector: '.stop__stamp',
        title: 'Uma parada',
        body: 'Cada parada traz a pergunta que ela responde, a razão de estar no percurso e o que fazer ali.',
        side: 'top',
      },
      {
        selector: '.stop__actions',
        title: 'Abrir a parada',
        body: 'O botão abre a leitura ou o verbete daquela parada. Depois, volte ao percurso para seguir de onde parou.',
        side: 'top',
      },
      {
        selector: '.stop__related',
        title: 'Para ir além',
        body: 'Leituras e vizinhos do acervo ligados a esta parada, para quem quiser se aprofundar sem sair do assunto.',
        side: 'top',
      },
    ],
  },
  acervo: {
    id: 'acervo',
    page: 'no acervo',
    steps: [
      {
        selector: '.explorer-heading__copy',
        title: 'O acervo',
        body: 'Catálogo de fichas sobre pessoas, obras, países, acontecimentos, conceitos e mais. Cada ficha traz o que se sabe, as fontes e as ligações com outras fichas.',
        side: 'bottom',
      },
      {
        selector: '.graph-entry',
        title: 'Rede e mapa',
        body: 'Os mesmos registros vistos de outras formas: como rede de ligações e como mapa-múndi no tempo.',
        side: 'bottom',
      },
      {
        selector: '.catalogue-nav',
        title: 'Catálogos',
        body: 'Escolha um tipo de ficha para ver só ele. "Registros" reúne tudo; os outros separam por pessoas, obras, países, lugares e assim por diante.',
        side: 'right',
      },
      {
        selector: '.facet',
        title: 'Filtros',
        body: 'Refinam o que está na lista: por escopo e pela situação de revisão do texto. Cada número é quantas fichas há com aquela opção.',
        side: 'right',
      },
      {
        selector: '.search-band',
        title: 'Busca',
        body: 'Busque pelo nome. Um registro cadastrado não equivale a conteúdo verificado: o selo de cada ficha diz em que estado ela está.',
        side: 'bottom',
      },
      {
        selector: '.results-toolbar',
        title: 'Resultados',
        body: 'Quantas fichas combinam com a busca e os filtros, e como ordená-las.',
        side: 'bottom',
      },
    ],
  },
  mapa: {
    id: 'mapa',
    page: 'no mapa',
    steps: [
      {
        selector: 'app-map-start',
        title: 'Como ler o mapa',
        body: 'Este guia resume o que cada elemento faz e sugere territórios e períodos para começar.',
        side: 'left',
      },
      {
        selector: '.stage',
        centered: true,
        title: 'O globo',
        body: 'Arraste para girar e use a roda do mouse ou os botões de zoom para aproximar. Cada rótulo é um território com registros no acervo; os arcos ligam territórios que se relacionam. Toque em um rótulo para abrir a ficha.',
        side: 'bottom',
      },
      {
        selector: '.bar .search',
        title: 'Buscar',
        body: 'Procure um país, império, evento ou pessoa. O globo gira até ele e abre a ficha.',
        side: 'bottom',
      },
      {
        selector: '.timeline-presets',
        title: 'Períodos',
        body: 'Um período deixa no globo só o que vigorava nele: países, regimes e conexões datadas. "Todo o acervo" mostra tudo.',
        side: 'top',
      },
      {
        selector: '.timeline-ruler',
        title: 'Régua do tempo',
        body: 'As barras mostram quantos registros há em cada década. Arraste as pontas da faixa vermelha para escolher um recorte, ou toque em um losango para ir a um marco histórico.',
        side: 'top',
      },
      {
        selector: '.timeline-marker',
        title: 'Marcos',
        body: 'Use as setas para passar de um marco ao seguinte. Cada marco abre o acontecimento, o lugar e o período dele.',
        side: 'top',
      },
      {
        selector: '.bar__actions .chip--surprise',
        title: 'Surpreenda-me',
        body: 'Abre um território e um recorte histórico ao acaso. Bom para descobrir o que ainda não conhece.',
        side: 'bottom',
      },
      {
        selector: '.bar__actions [aria-controls="lista-acessivel"]',
        title: 'Ver como lista',
        body: 'Os mesmos territórios e conexões em tabela, com busca e ordenação. Também é a forma mais fácil de ler com leitor de tela.',
        side: 'bottom',
      },
      {
        selector: '#map-legend',
        title: 'Legenda e camadas',
        body: 'Cada família de conexão tem cor e traço próprios; a seta aponta para quem recebeu a ação. Clique em uma família para mostrar ou esconder, ou ligue e desligue as camadas de países, entidades históricas e cidades.',
        side: 'right',
        reveal: '.bar__actions [aria-controls="map-legend"]',
      },
    ],
  },
  grafo: {
    id: 'grafo',
    page: 'no grafo',
    steps: [
      {
        selector: 'app-network-start',
        title: 'Por onde começar',
        body: 'Aqui estão verbetes e um caminho prontos para você entrar na rede.',
        side: 'left',
      },
      {
        selector: '.canvas',
        centered: true,
        title: 'A rede',
        body: 'Cada ponto é um verbete e cada linha, uma relação com fonte. A forma e a cor do ponto dizem o tipo; a cor e o traço da linha, a família da relação. Clique em um ponto para ver o verbete; arraste para mover e use a roda para aproximar.',
        side: 'bottom',
      },
      {
        selector: '.search',
        title: 'Buscar',
        body: 'Procure pelo nome. Enter abre o primeiro resultado, e a tecla barra leva o foco até aqui.',
        side: 'bottom',
      },
      {
        selector: '.zoom',
        title: 'Zoom',
        body: 'Aproxime, afaste ou reenquadre tudo. Quanto mais perto, mais nomes e palavras de cada ligação aparecem.',
        side: 'top',
      },
      {
        selector: '.detail:has(.detail__title)',
        title: 'Detalhe do verbete',
        body: 'Mostra o que o verbete é, as conexões agrupadas por peso e a fonte de cada uma, além de leituras e itinerários relacionados.',
        side: 'left',
      },
      {
        selector: '.bar__actions .chip--surprise',
        title: 'Surpreenda-me',
        body: 'Seleciona um verbete ao acaso, de preferência bem ligado.',
        side: 'bottom',
      },
      {
        selector: '#graph-controls .path-slots',
        title: 'Caminho entre dois verbetes',
        body: 'Escolha uma origem e um destino, pela busca ou clicando na rede, e o grafo mostra como os dois se ligam, passo a passo. O link da página guarda o caminho para compartilhar.',
        side: 'right',
        reveal: '.bar__actions [aria-controls="graph-controls"]',
      },
      {
        selector: '#graph-controls',
        title: 'Legenda e filtros',
        body: 'Explica cada tipo de ponto e cada família de linha. Clique em um item para mostrar ou esconder; clique duas vezes para ver só aquele. Também filtra por coleção.',
        side: 'right',
        reveal: '.bar__actions [aria-controls="graph-controls"]',
      },
      {
        selector: '.bar__list',
        title: 'Ver como lista',
        body: 'Os mesmos verbetes no acervo, em lista, para quem prefere ler a navegar na rede.',
        side: 'bottom',
      },
    ],
  },
};

/** Which tour belongs to a URL, or null on pages without one. */
export function tourIdForUrl(url: string): TourId | null {
  const path = url.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (path === '/leituras') return 'leituras';
  if (path.startsWith('/leitura/')) return 'leitura';
  if (path === '/itinerarios') return 'itinerarios';
  if (path.startsWith('/itinerario/')) return 'itinerario';
  if (path === '/acervo' || path.startsWith('/acervo/')) return 'acervo';
  if (path === '/mapa') return 'mapa';
  if (path === '/grafos') return 'grafo';
  return null;
}
