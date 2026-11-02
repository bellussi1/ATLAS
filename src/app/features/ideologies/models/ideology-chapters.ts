/**
 * Canonical chapter contract shared by every ideology page: same ids, order,
 * labels and index groups. Blocks inside each chapter stay free.
 * See docs/research/ideologies-section-contract-proposal.md.
 */
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

export function chapterGroup(id: string): ChapterGroup | undefined {
  return canonicalChapters.find((chapter) => chapter.id === id)?.group;
}
