import { Component, computed, input, output } from '@angular/core';
import type { IdeologyReadingSection } from '@ideologies/models/ideology-reading-section';

@Component({
  selector: 'app-ideology-reading-index',
  templateUrl: './reading-index.component.html',
  styleUrl: './reading-index.component.scss',
})
export class IdeologyReadingIndexComponent {
  readonly sections = input<readonly IdeologyReadingSection[]>([]);
  readonly active = input('');
  readonly progress = input(0);
  readonly tone = input(0);
  readonly reducedMotion = input(false);
  readonly hasPrevious = input(false);

  /** Consecutive sections sharing a group; ungrouped sections form an unlabeled run. */
  readonly groups = computed(() =>
    this.sections().reduce<
      { label: string; items: { section: IdeologyReadingSection; index: number }[] }[]
    >((groups, section, index) => {
      const label = section.group ?? '';
      const last = groups.at(-1);
      if (last && last.label === label) last.items.push({ section, index });
      else groups.push({ label, items: [{ section, index }] });
      return groups;
    }, []),
  );

  readonly chapterSelected = output<string>();
  readonly previousRequested = output<void>();
  readonly motionToggleRequested = output<void>();

  selectChapter(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (target?.value) this.chapterSelected.emit(target.value);
  }

  followChapter(event: MouseEvent, anchor: string): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    this.chapterSelected.emit(anchor);
  }
}
