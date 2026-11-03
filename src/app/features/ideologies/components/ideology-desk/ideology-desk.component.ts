import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IdeologyBlockComponent } from '@ideologies/components/ideology-block/ideology-block.component';
import type { IdeologyDossier } from '@ideologies/models/ideology-page.schema';
import type { PageMedia } from '@ideologies/utils/page-media-plan';
import { deskItems, type DeskView } from '@ideologies/utils/reading-plan';

const views: { key: DeskView; label: string; hint: string }[] = [
  { key: 'rede', label: 'Rede', hint: 'Quem se liga a quem, e por quê.' },
  { key: 'tempo', label: 'Tempo', hint: 'Épocas, obras e acontecimentos em sequência.' },
  { key: 'fichas', label: 'Fichas', hint: 'Conceitos, correntes e registros para consultar.' },
];

@Component({
  selector: 'app-ideology-desk',
  imports: [RouterLink, IdeologyBlockComponent],
  templateUrl: './ideology-desk.component.html',
  styleUrl: './ideology-desk.component.scss',
})
export class IdeologyDeskComponent {
  readonly dossier = input.required<IdeologyDossier>();
  readonly mediaPlan = input.required<Map<string, PageMedia>>();
  readonly view = input<DeskView>('rede');
  readonly basePath = input.required<string>();
  readonly viewChange = output<DeskView>();

  readonly items = computed(() => deskItems(this.dossier().page));
  readonly views = computed(() =>
    views
      .filter((v) => this.items()[v.key].length)
      .map((v) => ({
        ...v,
        count: this.items()[v.key].length,
      })),
  );
  readonly current = computed(() =>
    this.views().some((v) => v.key === this.view())
      ? this.view()
      : (this.views()[0]?.key ?? 'rede'),
  );

  /** Arrow keys move between tabs, as in the WAI-ARIA tabs pattern. */
  onKey(event: KeyboardEvent): void {
    const keys = this.views().map((v) => v.key);
    const index = keys.indexOf(this.current());
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    const target =
      event.key === 'Home' ? 0 : event.key === 'End' ? keys.length - 1 : step ? index + step : -1;
    if (target < 0 && !step) return;
    event.preventDefault();
    const next = keys[(target + keys.length) % keys.length];
    this.viewChange.emit(next);
    (event.currentTarget as HTMLElement).parentElement
      ?.querySelector<HTMLElement>(`#desk-tab-${next}`)
      ?.focus();
  }
}
