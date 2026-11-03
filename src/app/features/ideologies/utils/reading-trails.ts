import { chapterGroup, chapterGroups } from '@ideologies/models/ideology-chapters';
import type { IdeologyPage } from '@ideologies/models/ideology-page.schema';
import type { DeskKind } from '@ideologies/utils/desk-graph';

type Chapter = IdeologyPage['chapters'][number];

export interface ReadingTrail {
  group: string;
  question: string;
  stops: { anchor: string; title: string }[];
  minutes: number;
}

/**
 * One short trail per act of the canonical contract, opened by the first guiding
 * question the page itself asks in that act. Nothing is written here: questions and
 * stops come from the chapters.
 */
export function readingTrails(page: IdeologyPage): ReadingTrail[] {
  return chapterGroups.flatMap((group) => {
    const chapters = page.chapters.filter((c) => chapterGroup(c.id) === group);
    const question = chapters.find((c) => c.question)?.question;
    if (!question) return [];
    return [
      {
        group,
        question,
        stops: chapters.map((c) => ({ anchor: c.anchor, title: c.title })),
        minutes: chapters.reduce((sum, c) => sum + c.minutes, 0),
      },
    ];
  });
}

/** Weight of a chapter on the tradition map: reading time plus the material it carries. */
export function chapterWeight(chapter: Chapter): number {
  return Math.min(4, Math.max(1, Math.round((chapter.minutes + chapter.blocks.length) / 2)));
}

const chapterKinds: Partial<Record<string, DeskKind>> = {
  conceitos: 'concept',
  pensadores: 'person',
  origens: 'work',
  leituras: 'work',
  epocas: 'event',
  experiencias: 'event',
  vertentes: 'ideology',
};

/** The record type a chapter naturally opens on the desk. */
export function chapterDeskKind(chapter: Pick<Chapter, 'id'>): DeskKind | null {
  return chapterKinds[chapter.id] ?? null;
}
