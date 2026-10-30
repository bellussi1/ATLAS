export const editorialTypes = [
  {
    slug: 'verbete',
    label: 'Verbete',
    plural: 'Verbetes',
    summary: 'Uma entrada breve para apresentar um conceito e situá-lo em seu contexto.',
    exampleSlug: 'como-ler-um-verbete',
  },
  {
    slug: 'artigo',
    label: 'Artigo',
    plural: 'Artigos',
    summary: 'Um texto para desenvolver uma questão com argumento, contexto e fontes.',
    exampleSlug: 'conhecimento-com-contexto',
  },
  {
    slug: 'dossie',
    label: 'Dossiê',
    plural: 'Dossiês',
    summary: 'Um conjunto organizado de leituras, documentos e relações sobre um tema.',
    exampleSlug: 'como-o-atlas-organiza-dossies',
  },
  {
    slug: 'pessoa',
    label: 'Pessoa',
    plural: 'Pessoas',
    summary: 'Uma página para contextualizar trajetórias e ideias com fontes identificáveis.',
    exampleSlug: 'como-o-atlas-apresenta-pessoas',
  },
  {
    slug: 'evento',
    label: 'Evento',
    plural: 'Eventos',
    summary: 'Uma entrada para relacionar acontecimentos a processos e contextos.',
    exampleSlug: 'como-o-atlas-contextualiza-eventos',
  },
  {
    slug: 'atlas',
    label: 'Atlas',
    plural: 'Atlas',
    summary: 'Uma forma de percorrer relações no tempo e no espaço.',
    exampleSlug: 'atlas-de-metodo',
  },
  {
    slug: 'visualizacao',
    label: 'Visualização',
    plural: 'Visualizações',
    summary: 'Uma representação visual acompanhada de método, fonte e limites.',
    exampleSlug: 'como-ler-uma-visualizacao',
  },
  {
    slug: 'trilha',
    label: 'Trilha',
    plural: 'Trilhas',
    summary: 'Uma sequência de estudo com objetivos e referências explícitos.',
    exampleSlug: 'como-usar-trilhas',
  },
] as const;

export type EditorialType = (typeof editorialTypes)[number]['slug'];
export type EntryStatus = 'exemplar' | 'previsto';

export interface EditorialSection {
  heading: string;
  paragraphs: readonly string[];
}

export interface EditorialEntry {
  type: EditorialType;
  slug: string;
  title: string;
  summary: string;
  status: EntryStatus;
  statusLabel: string;
  sections: readonly EditorialSection[];
}

export function getEditorialType(slug: string | null): (typeof editorialTypes)[number] | undefined {
  return editorialTypes.find((type) => type.slug === slug);
}
