import { Component, computed, input, signal } from '@angular/core';
import type { PageBlock } from '@ideologies/models/ideology-page.schema';
import { KnowledgeContextDirective } from '@shared/directives/knowledge-context/knowledge-context.directive';
import { AtlasRevealDirective } from '@shared/directives/reveal/reveal.directive';
import { RecordCardComponent } from '@shared/ui/record-card/record-card.component';

type Work = Extract<PageBlock, { type: 'reading-path' }>['works'][number];

/**
 * Reading roadmap: three stages of difficulty as a compact guided trail. Each work is a
 * row that expands in place; themes dim, never remove, so the trail keeps its shape.
 */
@Component({
  selector: 'app-reading-path',
  imports: [RecordCardComponent, KnowledgeContextDirective, AtlasRevealDirective],
  templateUrl: './reading-path.component.html',
  styleUrl: './reading-path.component.scss',
})
export class ReadingPathComponent {
  readonly works = input.required<Work[]>();
  readonly theme = signal<string | null>(null);
  readonly open = signal<string | null>(null);
  readonly levels = [
    { key: 'introdutório', label: 'Comece aqui', hint: 'Textos curtos ou panoramas' },
    { key: 'intermediário', label: 'Aprofunde', hint: 'Argumentos completos e debates' },
    { key: 'avançado', label: 'Avance', hint: 'Obras longas e teoria' },
  ] as const;
  readonly themes = computed(() => [...new Set(this.works().map((w) => w.theme))]);
  /** The suggested first step: the first introductory work. */
  readonly first = computed(() => this.works().find((w) => w.level === 'introdutório'));
  readonly matching = computed(() => {
    const theme = this.theme();
    return theme ? this.works().filter((w) => w.theme === theme).length : this.works().length;
  });

  stage(level: Work['level']): Work[] {
    return this.works().filter((w) => w.level === level);
  }
  dimmed(work: Work): boolean {
    return !!this.theme() && this.theme() !== work.theme;
  }
  toggle(theme: string): void {
    this.theme.update((current) => (current === theme ? null : theme));
  }
  expand(work: Work): void {
    this.open.update((current) => (current === work.title ? null : work.title));
  }
  detailId(work: Work): string {
    return `work-${this.works().indexOf(work)}`;
  }
}
