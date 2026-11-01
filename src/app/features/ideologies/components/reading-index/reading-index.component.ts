import { Component, input, output } from '@angular/core';

export interface IdeologyReadingSection {
  anchor: string;
  title: string;
  minutes?: number;
}

@Component({
  selector: 'app-ideology-reading-index',
  templateUrl: './reading-index.component.html',
  styleUrl: './reading-index.component.scss',
})
export class IdeologyReadingIndexComponent {
  readonly sections = input<readonly IdeologyReadingSection[]>([]);
  readonly active = input('');
  readonly progress = input(0);
  readonly reducedMotion = input(false);
  readonly hasPrevious = input(false);

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
