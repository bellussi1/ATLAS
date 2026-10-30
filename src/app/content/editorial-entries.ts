import { EditorialEntry, EditorialType, getEditorialType } from './content-types';

export const editorialEntries: readonly EditorialEntry[] = [
  {
    type: 'verbete',
    slug: 'como-ler-um-verbete',
    title: 'Como funciona um verbete',
    summary: 'Um exemplo de verbete sobre os critérios editoriais do próprio projeto.',
    status: 'exemplar',
    statusLabel: 'Verbete de metodologia',
    sections: [
      {
        heading: 'Uma entrada com contexto',
        paragraphs: [
          'No ATLAS, um verbete deve apresentar um conceito com contexto suficiente para que a pessoa leitora compreenda seu uso e suas relações. A página não deve transformar uma definição curta em uma explicação isolada.',
          'Este exemplo descreve a metodologia do projeto. Não apresenta nem resume um acontecimento histórico.',
        ],
      },
      {
        heading: 'Como as afirmações são tratadas',
        paragraphs: [
          'As orientações editoriais do ATLAS pedem evidência contextual para afirmações históricas e distinguem fato documentado, interpretação, hipótese e alegação controversa. As fontes devem ser identificáveis e pertinentes ao que sustentam.',
        ],
      },
      {
        heading: 'Relações e limites',
        paragraphs: [
          'Um verbete pode apontar para artigos, dossiês, pessoas, eventos, atlas, visualizações e trilhas quando essas relações estiverem documentadas. A existência deste modelo não significa que já haja um catálogo histórico publicado.',
        ],
      },
    ],
  },
  {
    type: 'artigo',
    slug: 'conhecimento-com-contexto',
    title: 'Conhecimento com contexto',
    summary: 'Um exemplo de artigo que explica os princípios editoriais declarados pelo ATLAS.',
    status: 'exemplar',
    statusLabel: 'Artigo de metodologia',
    sections: [
      {
        heading: 'Compreender relações',
        paragraphs: [
          'O ATLAS se propõe a conectar história, política, economia e sociedade em perspectiva mundial e brasileira. Em um artigo, essa missão pode ser desenvolvida por meio de uma pergunta delimitada, contexto explícito e uma linha de argumentação que o público consiga acompanhar.',
          'Este texto é um exemplo editorial sobre a metodologia do projeto, não uma interpretação de um processo histórico específico.',
        ],
      },
      {
        heading: 'Evidência e interpretação',
        paragraphs: [
          'As regras do repositório determinam que afirmações históricas sejam acompanhadas de evidências contextualizadas. O artigo deve indicar o que está documentado e o que é interpretação, hipótese ou alegação controversa, sem apresentar essas categorias como equivalentes.',
        ],
      },
      {
        heading: 'Fontes e revisão',
        paragraphs: [
          'As fontes precisam ser identificáveis para que a pessoa leitora possa conferir a evidência. Este exemplo não declara revisão humana nem validação editorial de conteúdo histórico.',
        ],
      },
    ],
  },
  {
    type: 'atlas',
    slug: 'atlas-de-metodo',
    title: 'Como navegar pelo atlas',
    summary: 'Um exemplo de atlas que apresenta os formatos e caminhos previstos para o ATLAS.',
    status: 'exemplar',
    statusLabel: 'Atlas de metodologia',
    sections: [
      {
        heading: 'Percorrer formatos',
        paragraphs: [
          'Nesta etapa, o atlas organiza os formatos editoriais previstos pelo projeto: verbetes, artigos, dossiês, páginas sobre pessoas e eventos, visualizações e trilhas de estudo. Os índices desta aplicação já permitem percorrer essas categorias.',
          'Este atlas descreve a arquitetura da informação do ATLAS. Não representa mapas, fronteiras ou fatos históricos.',
        ],
      },
      {
        heading: 'Conexões com fontes',
        paragraphs: [
          'As páginas históricas futuras deverão apresentar evidências e contexto. Uma visualização deverá informar a fonte, o método e os limites dos dados; relações editoriais não substituem essa evidência.',
        ],
      },
      {
        heading: 'Uma estrutura em construção',
        paragraphs: [
          'As rotas de detalhe provisórias mostram como os formatos poderão ser apresentados. Elas não indicam que já exista conteúdo histórico curado em cada categoria.',
        ],
      },
    ],
  },
  {
    type: 'dossie',
    slug: 'como-o-atlas-organiza-dossies',
    title: 'Como se organiza um dossiê',
    summary: 'Uma página provisória sobre a função editorial do formato dossiê.',
    status: 'previsto',
    statusLabel: 'Formato previsto',
    sections: [
      {
        heading: 'Um conjunto contextualizado',
        paragraphs: [
          'O projeto prevê dossiês como conjuntos de materiais relacionados a um tema. Quando houver conteúdo publicado, cada item deverá conservar seu contexto e suas fontes; esta rota apresenta apenas a intenção editorial do formato.',
        ],
      },
    ],
  },
  {
    type: 'pessoa',
    slug: 'como-o-atlas-apresenta-pessoas',
    title: 'Pessoas em contexto',
    summary: 'Uma página provisória sobre contexto e fontes em páginas de pessoas.',
    status: 'previsto',
    statusLabel: 'Formato previsto',
    sections: [
      {
        heading: 'Trajetórias em contexto',
        paragraphs: [
          'Uma futura página sobre uma pessoa deverá situar sua trajetória e suas ideias no contexto pertinente e indicar as fontes usadas. Não há aqui biografia nem afirmação sobre uma pessoa histórica.',
        ],
      },
    ],
  },
  {
    type: 'evento',
    slug: 'como-o-atlas-contextualiza-eventos',
    title: 'Como contextualizar eventos',
    summary: 'Uma página provisória sobre o tratamento editorial de acontecimentos.',
    status: 'previsto',
    statusLabel: 'Formato previsto',
    sections: [
      {
        heading: 'Acontecimentos e processos',
        paragraphs: [
          'Uma futura página de evento deverá relacionar o acontecimento a contextos e processos, deixando claras as evidências para afirmações históricas. Esta página descreve o formato, não um evento real.',
        ],
      },
    ],
  },
  {
    type: 'visualizacao',
    slug: 'como-ler-uma-visualizacao',
    title: 'Como ler visualizações',
    summary: 'Uma página provisória sobre fontes e limites de representações visuais.',
    status: 'previsto',
    statusLabel: 'Formato previsto',
    sections: [
      {
        heading: 'Método visível',
        paragraphs: [
          'Uma visualização futura deverá informar de onde vêm seus dados, como foram tratados e quais limites afetam a leitura. Esta rota não contém dados nem resultados históricos.',
        ],
      },
    ],
  },
  {
    type: 'trilha',
    slug: 'como-usar-trilhas',
    title: 'Organização das trilhas',
    summary: 'Uma página provisória sobre etapas, objetivos e referências de estudo.',
    status: 'previsto',
    statusLabel: 'Formato previsto',
    sections: [
      {
        heading: 'Estudar por etapas',
        paragraphs: [
          'O projeto prevê trilhas que organizem leituras e perguntas em uma sequência com objetivos e referências explícitos. Esta página descreve o formato planejado; nenhuma trilha temática está publicada nesta etapa.',
        ],
      },
    ],
  },
];

export function findEditorialEntry(
  type: EditorialType | undefined,
  slug: string | null,
): EditorialEntry | undefined {
  return editorialEntries.find((entry) => entry.type === type && entry.slug === slug);
}

export function getEntryPath(type: EditorialType, slug?: string): string {
  const resolvedSlug = slug ?? getEditorialType(type)?.exampleSlug;
  return resolvedSlug ? `/explorar/${type}/${resolvedSlug}` : '/explorar';
}
