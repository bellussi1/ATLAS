import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { readingPath } from '@core/routing/reading-routes';
import { AtlasGeometricMosaicComponent } from '@shared/ui/geometric-mosaic/geometric-mosaic.component';

/** Shared "not found" content for unknown routes and for records that do not exist. */
@Component({
  selector: 'app-not-found-message',
  imports: [RouterLink, AtlasGeometricMosaicComponent],
  templateUrl: './not-found-message.component.html',
  styleUrl: './not-found-message.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundMessageComponent {
  readonly heading = input('Página não encontrada');
  readonly message = input('Este endereço não existe no acervo. Escolha um dos caminhos abaixo.');

  /** The last word of the heading carries the accent colour. */
  protected readonly headingParts = computed(() => {
    const words = this.heading().trim().split(' ');
    return { lead: words.slice(0, -1).join(' '), accent: words.at(-1) ?? '' };
  });

  /** Recomposition is always triggered by the person; it never alters layout. */
  protected readonly seed = signal(404);

  protected readonly doors = [
    { label: 'Marxismo', hint: 'Leitura da tradição', link: readingPath('marxismo'), tone: 'red' },
    {
      label: 'Liberalismo',
      hint: 'Leitura exploratória',
      link: readingPath('liberalismo'),
      tone: 'teal',
    },
    { label: 'Acervo', hint: 'Todos os registros', link: '/acervo', tone: 'ochre' },
    { label: 'Início', hint: 'Voltar à abertura', link: '/', tone: 'rose' },
  ] as const;

  protected recompose(): void {
    this.seed.update((value) => (value * 31 + 7) % 9973);
  }
}
