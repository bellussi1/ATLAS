import type { IdeologyPage, PageBlock } from '@ideologies/models/ideology-page.schema';

type Chapter = IdeologyPage['chapters'][number];

export type DeskView = 'rede' | 'tempo' | 'fichas';

export interface DeskItem {
  block: PageBlock;
  blockId: string;
  chapterAnchor: string;
  chapterTitle: string;
}

/** Chapters whose subject is the records themselves keep their cards in the reading. */
const recordChapters = new Set(['documents', 'thinkers']);

/**
 * Where a block belongs: the reading keeps argument and explanation, the desk gathers
 * the instruments for browsing (network, time and records outside their home chapter).
 */
export function deskView(block: PageBlock, chapter: Chapter): DeskView | null {
  switch (block.type) {
    case 'atlas':
    case 'graph':
      return 'rede';
    case 'timeline':
    case 'chronology':
      return 'tempo';
    case 'entities':
      return recordChapters.has(chapter.layout) ? null : 'fichas';
    default:
      return null;
  }
}

export function readingBlocks(chapter: Chapter): { block: PageBlock; blockId: string }[] {
  return chapter.blocks.flatMap((block, index) =>
    deskView(block, chapter) ? [] : [{ block, blockId: `${chapter.id}-${index}` }],
  );
}

export function deskItems(page: IdeologyPage): Record<DeskView, DeskItem[]> {
  const desk: Record<DeskView, DeskItem[]> = { rede: [], tempo: [], fichas: [] };
  for (const chapter of page.chapters) {
    chapter.blocks.forEach((block, index) => {
      const view = deskView(block, chapter);
      if (view)
        desk[view].push({
          block,
          blockId: `${chapter.id}-${index}`,
          chapterAnchor: chapter.anchor,
          chapterTitle: chapter.title,
        });
    });
  }
  return desk;
}

/** Desk views a chapter feeds, so the reading can point to them. */
export function chapterDeskViews(chapter: Chapter): DeskView[] {
  return [...new Set(chapter.blocks.flatMap((block) => deskView(block, chapter) ?? []))];
}
