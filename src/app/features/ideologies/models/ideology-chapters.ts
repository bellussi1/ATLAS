/**
 * Canonical chapter contract shared by every ideology page: same ids, order,
 * labels and index groups. Blocks inside each chapter stay free.
 * See docs/research/ideologies-section-contract-proposal.md.
 */
export const subjectTypes = [
  'ideologia',
  'pessoa',
  'acontecimento',
  'instituicao',
  'periodo',
  'conceito',
] as const;
export type SubjectType = (typeof subjectTypes)[number];

export const chapterGroups = ['Entender', 'Situar', 'Avaliar e continuar'] as const;
export type ChapterGroup = (typeof chapterGroups)[number];

export const canonicalChapters = [
  { id: 'introducao', label: 'O que é?', group: 'Entender' },
  { id: 'origens', label: 'Origens e formação', group: 'Entender' },
  { id: 'principios', label: 'Pilares e princípios', group: 'Entender' },
  { id: 'conceitos', label: 'Conceitos e palavras-chave', group: 'Entender' },
  { id: 'epocas', label: 'História e épocas', group: 'Situar' },
  { id: 'pensadores', label: 'Pensadores e obras', group: 'Situar' },
  { id: 'vertentes', label: 'Correntes e vertentes', group: 'Situar' },
  { id: 'experiencias', label: 'Experiências históricas', group: 'Situar' },
  { id: 'debates', label: 'Argumentos, críticas e respostas', group: 'Avaliar e continuar' },
  { id: 'conexoes', label: 'Conexões com outras tradições', group: 'Avaliar e continuar' },
  { id: 'leituras', label: 'Roteiro de leitura', group: 'Avaliar e continuar' },
  { id: 'fontes', label: 'Fontes e metodologia', group: 'Avaliar e continuar' },
] as const satisfies readonly { id: string; label: string; group: ChapterGroup }[];

export type CanonicalChapterId = (typeof canonicalChapters)[number]['id'];

/** Anchors used before the canonical contract, kept so old links still land. */
export const legacyChapterAnchors: Readonly<Record<string, CanonicalChapterId>> = {
  historia: 'epocas',
  correntes: 'vertentes',
  lugares: 'experiencias',
  criticas: 'debates',
  acervo: 'conexoes',
};

const SUBJECT_CHAPTER_LABELS: Partial<
  Record<SubjectType, Partial<Record<CanonicalChapterId, string>>>
> = {
  pessoa: {
    principios: 'Ideias e posições',
    pensadores: 'Trajetória e obras',
    vertentes: 'Relações e alianças',
    experiencias: 'Atuação pública e legados',
  },
  acontecimento: {
    principios: 'Causas e rupturas',
    epocas: 'Cronologia do acontecimento',
    pensadores: 'Protagonistas e relatos',
    vertentes: 'Desdobramentos e correntes',
  },
  instituicao: {
    principios: 'Regras, órgãos e funcionamento',
    pensadores: 'Dirigentes e documentos',
    vertentes: 'Transformações institucionais',
    experiencias: 'Atuação e impacto histórico',
  },
  periodo: {
    principios: 'Estrutura política e social',
    epocas: 'Periodização e marcos',
    pensadores: 'Intérpretes e obras',
    vertentes: 'Forças políticas no período',
  },
  conceito: {
    principios: 'Definições e critérios',
    pensadores: 'Formuladores e usos',
    vertentes: 'Usos disputados e historicidade',
  },
};

export function chapterLabelFor(
  id: CanonicalChapterId,
  subjectType: SubjectType = 'ideologia',
): string {
  return (
    SUBJECT_CHAPTER_LABELS[subjectType]?.[id] ??
    canonicalChapters.find((chapter) => chapter.id === id)?.label ??
    id
  );
}

export function chapterGroup(id: string): ChapterGroup | undefined {
  return canonicalChapters.find((chapter) => chapter.id === id)?.group;
}
